import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/signets : mes publications en signet, la plus récemment ajoutée d'abord
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT p.id, p.contenu, p.code, p.langage_code, p.cree_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie,
              s.cree_le AS signet_le
         FROM signets s
         JOIN publications p ON p.id = s.publication_id
         JOIN utilisateurs u ON u.id = p.auteur_id
        WHERE s.utilisateur_id = $1
        ORDER BY s.cree_le DESC
        LIMIT 50`,
      [session.id]
    );

    // Une liste vide est normale : pas de 404
    return NextResponse.json(
      { success: true, data: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des signets :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}