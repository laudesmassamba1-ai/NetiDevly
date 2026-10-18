import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

const emojiSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

// Le message existe-t-il ET fait-il partie d'une de MES conversations ?
async function messageAccessible(messageId: number, utilisateurId: number): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1
       FROM messages_prives m
       JOIN membres_conversations mc ON mc.conversation_id = m.conversation_id
      WHERE m.id = $1 AND mc.utilisateur_id = $2`,
    [messageId, utilisateurId]
  );
  return r.rows.length > 0;
}

// PUT /api/messages_prives/[id]/reaction : ajouter un emoji sur un message
// Corps : { "emoji": "👍" }. On peut mettre plusieurs emojis différents ; le même deux fois ne fait rien.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const messageId = lireId((await params).id);
  if (messageId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = emojiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  try {
    if (!(await messageAccessible(messageId, session.id))) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO reactions_messages (message_prive_id, utilisateur_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [messageId, session.id, parsed.data.emoji]
    );
    return NextResponse.json(
      { success: true, data: { message_prive_id: messageId, emoji: parsed.data.emoji } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la réaction au message :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// DELETE /api/messages_prives/[id]/reaction?emoji=👍 : retirer SON emoji
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const messageId = lireId((await params).id);
    if (messageId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const parsed = emojiSchema.safeParse({
      emoji: new URL(request.url).searchParams.get('emoji') ?? '',
    });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Paramètre emoji invalide' }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM reactions_messages
        WHERE message_prive_id = $1 AND utilisateur_id = $2 AND emoji = $3
        RETURNING emoji`,
      [messageId, session.id, parsed.data.emoji]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Réaction introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Réaction retirée' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors du retrait de la réaction :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}