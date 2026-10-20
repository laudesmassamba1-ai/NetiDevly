import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

// GET /api/utilisateurs/[id]/badges : les badges obtenus par un utilisateur
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const idNum = lireId((await params).id);
    if (idNum === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    // L'utilisateur existe-t-il ? (sinon 404, et pas une liste vide trompeuse)
    const existe = await pool.query(`SELECT 1 FROM utilisateurs WHERE id = $1`, [idNum]);
    if (existe.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const result = await pool.query(
      `SELECT b.id, b.code, b.nom, b.description, ub.obtenu_le
         FROM utilisateurs_badges ub
         JOIN badges b ON b.id = ub.badge_id
        WHERE ub.utilisateur_id = $1
        ORDER BY ub.obtenu_le DESC`,
      [idNum]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des badges utilisateur :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
