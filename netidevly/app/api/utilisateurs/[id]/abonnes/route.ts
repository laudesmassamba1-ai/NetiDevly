import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/utilisateurs/[id]/abonnes : les personnes qui suivent cet utilisateur
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

    // Les abonnés = les lignes où suivi_id est cet utilisateur ; on affiche l'abonné
    const result = await pool.query(
      `SELECT u.id, u.pseudo, u.nom_affiche, u.est_verifie, a.cree_le AS depuis
         FROM abonnements a
         JOIN utilisateurs u ON u.id = a.abonne_id
        WHERE a.suivi_id = $1
        ORDER BY a.cree_le DESC
        LIMIT 100`,
      [idNum]
    );

    return NextResponse.json(
      { success: true, data: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des abonnés :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}