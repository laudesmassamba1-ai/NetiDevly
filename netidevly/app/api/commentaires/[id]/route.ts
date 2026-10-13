import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// DELETE /api/commentaires/[id] : supprimer SON commentaire
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    // AND auteur_id : on ne supprime que ses propres commentaires.
    // Les réponses à ce commentaire sont supprimées avec lui (ON DELETE CASCADE).
    const result = await pool.query(
      `DELETE FROM commentaires WHERE id = $1 AND auteur_id = $2 RETURNING id`,
      [idNum, session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Commentaire supprimé' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}