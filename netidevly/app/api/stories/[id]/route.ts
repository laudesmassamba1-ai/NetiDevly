import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

// DELETE /api/stories/[id] : supprimer SA story
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const storyId = lireId((await params).id);
    if (storyId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM stories WHERE id = $1 AND auteur_id = $2 RETURNING id`,
      [storyId, session.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Story supprimée' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression de la story :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}