import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/utilisateurs/[id]/abonnements : les personnes que cet utilisateur suit
export async function GET(
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

    // Les suivis = les lignes où abonne_id est cet utilisateur ; on affiche la personne suivie
    const result = await pool.query(
      `SELECT u.id, u.pseudo, u.nom_affiche, u.est_verifie, a.cree_le AS depuis
         FROM abonnements a
         JOIN utilisateurs u ON u.id = a.suivi_id
        WHERE a.abonne_id = $1
        ORDER BY a.cree_le DESC
        LIMIT 100`,
      [idNum]
    );

    return NextResponse.json(
      { success: true, data: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des abonnements :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}