import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

// DELETE /api/messages_prives/[id] : supprimer SON message
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

    // expediteur_id = session.id : on ne supprime que ses propres messages
    const result = await pool.query(
      `DELETE FROM messages_prives WHERE id = $1 AND expediteur_id = $2 RETURNING id`,
      [messageId, session.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Message supprimé' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression du message :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}