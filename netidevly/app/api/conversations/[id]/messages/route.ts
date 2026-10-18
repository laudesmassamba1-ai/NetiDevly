import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';
import { estMembreConversation } from '@/lib/conversations';

// GET /api/conversations/[id]/messages : les messages, du plus récent au plus ancien
// Pagination : ?avant=ID. Ouvrir la première page marque la conversation comme lue.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const conversationId = lireId((await params).id);
    if (conversationId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const avantBrut = new URL(request.url).searchParams.get('avant');
    let avant: number | null = null;
    if (avantBrut !== null) {
      avant = lireId(avantBrut);
      if (avant === null) {
        return NextResponse.json({ success: false, error: 'Paramètre avant invalide' }, { status: 400 });
      }
    }

    // Une conversation n'est visible que par ses deux participants.
    // 404 (et non 403) : on ne révèle pas l'existence des conversations des autres.
    if (!(await estMembreConversation(conversationId, session.id))) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }

    const result = await pool.query(
      `SELECT m.id, m.contenu, m.cree_le, m.expediteur_id,
              (SELECT COALESCE(json_agg(json_build_object('emoji', r.emoji, 'nb', r.nb)), '[]'::json)
                 FROM (SELECT emoji, count(*)::int AS nb
                         FROM reactions_messages
                        WHERE message_prive_id = m.id
                        GROUP BY emoji) r) AS reactions
         FROM messages_prives m
        WHERE m.conversation_id = $1 AND ($2::int IS NULL OR m.id < $2::int)
        ORDER BY m.id DESC
        LIMIT 50`,
      [conversationId, avant]
    );

    // Première page => je viens de tout lire
    if (avant === null) {
      await pool.query(
        `UPDATE membres_conversations SET derniere_lecture_le = now()
          WHERE conversation_id = $1 AND utilisateur_id = $2`,
        [conversationId, session.id]
      );
    }

    const dernier = result.rows.length > 0 ? result.rows[result.rows.length - 1].id : null;
    return NextResponse.json(
      { success: true, data: result.rows, prochain: dernier },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des messages :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

const messageSchema = z.object({
  contenu: z.string().trim().min(1).max(2000),
});

// POST /api/conversations/[id]/messages : envoyer un message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const conversationId = lireId((await params).id);
  if (conversationId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Je dois être participant de cette conversation
    const membre = await client.query(
      `SELECT 1 FROM membres_conversations WHERE conversation_id = $1 AND utilisateur_id = $2`,
      [conversationId, session.id]
    );
    if (membre.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }

    const ins = await client.query(
      `INSERT INTO messages_prives (conversation_id, expediteur_id, contenu)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, expediteur_id, contenu, cree_le`,
      [conversationId, session.id, parsed.data.contenu]
    );

    // La conversation remonte en haut de la liste, et je l'ai "lue" jusqu'ici
    await client.query(`UPDATE conversations SET mis_a_jour_le = now() WHERE id = $1`, [conversationId]);
    await client.query(
      `UPDATE membres_conversations SET derniere_lecture_le = now()
        WHERE conversation_id = $1 AND utilisateur_id = $2`,
      [conversationId, session.id]
    );

    // Notification "message" pour l'autre personne, une seule tant qu'elle n'a pas été lue
    await client.query(
      `INSERT INTO notifications (utilisateur_id, acteur_id, type, conversation_id)
       SELECT mc.utilisateur_id, $2, 'message', $1
         FROM membres_conversations mc
        WHERE mc.conversation_id = $1 AND mc.utilisateur_id <> $2
          AND NOT EXISTS (
                SELECT 1 FROM notifications n
                 WHERE n.utilisateur_id = mc.utilisateur_id
                   AND n.type = 'message'
                   AND n.conversation_id = $1
                   AND n.lue_le IS NULL)`,
      [conversationId, session.id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: ins.rows[0] }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de l'envoi du message :", error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  } finally {
    client.release();
  }
}