import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/moi/verification : mon statut de vérification et ma dernière demande
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const [compte, demande] = await Promise.all([
      pool.query(`SELECT est_verifie FROM utilisateurs WHERE id = $1`, [session.id]),
      pool.query(
        `SELECT id, statut, cree_le, traite_le
           FROM demandes_verification
          WHERE utilisateur_id = $1
          ORDER BY id DESC LIMIT 1`,
        [session.id]
      ),
    ]);
    if (compte.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }
    return NextResponse.json(
      {
        success: true,
        data: { est_verifie: compte.rows[0].est_verifie, derniere_demande: demande.rows[0] ?? null },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture de la vérification :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// POST /api/moi/verification : demander la vérification de mon compte (badge « vérifié »)
export async function POST() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    // On n'écrit que si : aucune demande en attente ET le compte n'est pas déjà vérifié.
    // Sinon le SELECT ne renvoie rien, donc l'INSERT n'écrit rien.
    const result = await pool.query(
      `INSERT INTO demandes_verification (utilisateur_id)
       SELECT $1::int
        WHERE NOT EXISTS (SELECT 1 FROM demandes_verification
                           WHERE utilisateur_id = $1::int AND statut = 'en_attente')
          AND NOT EXISTS (SELECT 1 FROM utilisateurs
                           WHERE id = $1::int AND est_verifie)
       RETURNING id, statut, cree_le`,
      [session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Demande déjà en cours ou compte déjà vérifié' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la demande de vérification :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
