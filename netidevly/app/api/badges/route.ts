import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/badges : le catalogue des badges, avec ceux que j'ai déjà obtenus
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT b.id, b.code, b.nom, b.description,
              (ub.utilisateur_id IS NOT NULL) AS obtenu,
              ub.obtenu_le
         FROM badges b
         LEFT JOIN utilisateurs_badges ub
                ON ub.badge_id = b.id AND ub.utilisateur_id = $1
        ORDER BY b.id`,
      [session.id]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des badges :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
