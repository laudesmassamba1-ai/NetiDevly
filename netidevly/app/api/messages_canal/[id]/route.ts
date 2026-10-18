import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe, peutGerer } from '@/lib/groupes';

// DELETE /api/messages_canal/[id] : supprimer un message
// Autorisé : l'auteur du message, ou un propriétaire/admin du groupe (modération)
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

    // Le message, son auteur et le groupe du canal en une seule requête
    const m = await pool.query(
      `SELECT m.auteur_id, c.groupe_id
         FROM messages_canal m
         JOIN canaux c ON c.id = m.canal_id
        WHERE m.id = $1`,
      [messageId]
    );
    if (m.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }

    const estAuteur = m.rows[0].auteur_id === session.id;
    if (!estAuteur && !peutGerer(await roleDansGroupe(m.rows[0].groupe_id, session.id))) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    await pool.query(`DELETE FROM messages_canal WHERE id = $1`, [messageId]);
    return NextResponse.json({ success: true, message: 'Message supprimé' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression du message :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}