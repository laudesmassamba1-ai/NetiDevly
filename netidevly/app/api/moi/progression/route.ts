import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/moi/progression : mes points, mon palier, le palier suivant et mon objectif de la semaine
export async function GET() {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    // 3. Les points = la somme du journal evenements_activite ; le palier se déduit des points
    const result = await pool.query(
      `SELECT u.objectif_hebdo, u.gels_serie,
              pts.total                  AS points,
              pal.rang                   AS palier_rang,
              pal.nom                    AS palier,
              sui.nom                    AS palier_suivant,
              sui.points_minimum         AS points_palier_suivant,
              (SELECT count(*)::int FROM publications p
                WHERE p.auteur_id = u.id
                  AND p.cree_le >= date_trunc('week', now()))   AS publications_semaine,
              (SELECT count(*)::int FROM utilisateurs_badges ub
                WHERE ub.utilisateur_id = u.id)                 AS nb_badges
         FROM utilisateurs u
         CROSS JOIN LATERAL (
              SELECT COALESCE(sum(points), 0)::int AS total
                FROM evenements_activite WHERE utilisateur_id = u.id) pts
         LEFT JOIN LATERAL (
              SELECT rang, nom FROM paliers
               WHERE points_minimum <= pts.total
               ORDER BY points_minimum DESC LIMIT 1) pal ON true
         LEFT JOIN LATERAL (
              SELECT nom, points_minimum FROM paliers
               WHERE points_minimum > pts.total
               ORDER BY points_minimum ASC LIMIT 1) sui ON true
        WHERE u.id = $1`,
      [session.id]
    );

    // 4. Compte supprimé alors que le cookie est encore valide
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // 5. Réponse (palier_suivant = null si on est déjà au dernier palier)
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture de la progression :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
