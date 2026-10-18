import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/conversations : mes conversations (la plus récente d'abord)
// Pour chacune : l'autre personne, le dernier message et le nombre de messages non lus
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.mis_a_jour_le,
              u.id AS autre_id, u.pseudo, u.nom_affiche, u.est_verifie,
              lm.contenu AS dernier_message, lm.cree_le AS dernier_message_le,
              (SELECT count(*)::int FROM messages_prives mp
                WHERE mp.conversation_id = c.id
                  AND mp.expediteur_id IS DISTINCT FROM $1
                  AND (me.derniere_lecture_le IS NULL
                       OR mp.cree_le > me.derniere_lecture_le)) AS nb_non_lus
         FROM membres_conversations me
         JOIN conversations c           ON c.id = me.conversation_id
         JOIN membres_conversations autre
                                        ON autre.conversation_id = c.id
                                       AND autre.utilisateur_id <> $1
         JOIN utilisateurs u            ON u.id = autre.utilisateur_id
         LEFT JOIN LATERAL (
              SELECT contenu, cree_le FROM messages_prives
               WHERE conversation_id = c.id
               ORDER BY id DESC LIMIT 1
         ) lm ON true
        WHERE me.utilisateur_id = $1
        ORDER BY c.mis_a_jour_le DESC
        LIMIT 50`,
      [session.id]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des conversations :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

const conversationSchema = z.object({
  utilisateur_id: z.number().int().positive(),
});

// POST /api/conversations : ouvrir la conversation avec quelqu'un
// Si elle existe déjà, on la renvoie (200) ; sinon on la crée (201).
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = conversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }
  const autreId = parsed.data.utilisateur_id;
  if (autreId === session.id) {
    return NextResponse.json(
      { success: false, error: 'Tu ne peux pas ouvrir une conversation avec toi-même' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // L'autre personne doit exister
    const autre = await client.query(`SELECT 1 FROM utilisateurs WHERE id = $1`, [autreId]);
    if (autre.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Verrou léger pour ce couple de personnes : évite que deux requêtes simultanées
    // créent deux conversations. Il est relâché automatiquement à la fin de la transaction.
    const a = Math.min(session.id, autreId);
    const b = Math.max(session.id, autreId);
    await client.query(`SELECT pg_advisory_xact_lock($1, $2)`, [a, b]);

    // Existe-t-il déjà une conversation qui contient ces deux personnes ?
    const existante = await client.query(
      `SELECT m1.conversation_id AS id
         FROM membres_conversations m1
         JOIN membres_conversations m2 ON m2.conversation_id = m1.conversation_id
        WHERE m1.utilisateur_id = $1 AND m2.utilisateur_id = $2
        LIMIT 1`,
      [session.id, autreId]
    );
    if (existante.rows.length > 0) {
      await client.query('COMMIT');
      return NextResponse.json({ success: true, data: { id: existante.rows[0].id } }, { status: 200 });
    }

    const conv = await client.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
    const conversationId = conv.rows[0].id;
    await client.query(
      `INSERT INTO membres_conversations (conversation_id, utilisateur_id)
       VALUES ($1, $2), ($1, $3)`,
      [conversationId, session.id, autreId]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: { id: conversationId } }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la conversation :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  } finally {
    client.release();
  }
}