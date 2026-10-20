import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/hashtags/tendances?jours=7 : les 10 hashtags les plus utilisés sur la période
export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  // ?jours= est optionnel (7 par défaut), entre 1 et 365
  const brut = new URL(request.url).searchParams.get('jours');
  const jours = brut === null ? 7 : Number(brut);
  if (!Number.isInteger(jours) || jours < 1 || jours > 365) {
    return NextResponse.json({ success: false, error: 'Paramètre jours invalide' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT h.nom::text AS nom, count(*)::int AS nb_publications
         FROM hashtags h
         JOIN publications_hashtags ph ON ph.hashtag_id = h.id
         JOIN publications p           ON p.id = ph.publication_id
        WHERE p.cree_le >= now() - make_interval(days => $1::int)
        GROUP BY h.id, h.nom
        ORDER BY nb_publications DESC, h.nom ASC
        LIMIT 10`,
      [jours]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des tendances :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
