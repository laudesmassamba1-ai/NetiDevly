import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/utilisateurs/suggestions : 10 personnes que je ne suis pas encore,
// classées par compétences en commun puis par nombre d'abonnés
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.pseudo, u.nom_affiche, u.est_verifie, u.bio,
              (SELECT count(*)::int
                 FROM utilisateurs_competences moi
                 JOIN utilisateurs_competences lui
                   ON lui.competence_id = moi.competence_id
                WHERE moi.utilisateur_id = $1
                  AND lui.utilisateur_id = u.id)                  AS competences_communes,
              (SELECT count(*)::int FROM abonnements a
                WHERE a.suivi_id = u.id)                          AS nb_abonnes
         FROM utilisateurs u
        WHERE u.id <> $1
          AND NOT EXISTS (SELECT 1 FROM abonnements a
                           WHERE a.abonne_id = $1 AND a.suivi_id = u.id)
        ORDER BY competences_communes DESC, nb_abonnes DESC, u.id ASC
        LIMIT 10`,
      [session.id]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des suggestions :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
