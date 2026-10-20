import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { estAdmin } from '@/lib/admin';
import { lireId } from '@/lib/groupes';

// DELETE /api/admin/publications/[id] : supprimer n'importe quelle publication (admin)
// (ses commentaires, réactions, signalements... partent avec, grâce à ON DELETE CASCADE)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }
  if (!(await estAdmin(session.id))) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  const publicationId = lireId((await params).id);
  if (publicationId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `DELETE FROM publications WHERE id = $1 RETURNING id`,
      [publicationId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Publication introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Publication supprimée' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression admin :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
