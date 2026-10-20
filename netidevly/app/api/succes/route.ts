import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/succes : le catalogue des succès, avec MA progression (0 si pas commencé)
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT s.id, s.code, s.nom, s.description,
              COALESCE(us.progression, 0) AS progression,
              us.palier_atteint,
              us.mis_a_jour_le
         FROM succes s
         LEFT JOIN utilisateurs_succes us
                ON us.succes_id = s.id AND us.utilisateur_id = $1
        ORDER BY s.id`,
      [session.id]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des succès :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
