import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

// GET /api/utilisateurs/[id]/succes : les succès (et la progression) d'un utilisateur
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

    const existe = await pool.query(`SELECT 1 FROM utilisateurs WHERE id = $1`, [idNum]);
    if (existe.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const result = await pool.query(
      `SELECT s.id, s.code, s.nom, s.description,
              us.progression, us.palier_atteint, us.mis_a_jour_le
         FROM utilisateurs_succes us
         JOIN succes s ON s.id = us.succes_id
        WHERE us.utilisateur_id = $1
        ORDER BY s.id`,
      [idNum]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des succès utilisateur :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
