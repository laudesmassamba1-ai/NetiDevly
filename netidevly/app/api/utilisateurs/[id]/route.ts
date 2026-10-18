import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

// GET /api/utilisateurs/[id] : le profil public d'un utilisateur
// (jamais d'email ni de mot de passe : colonnes listées une par une)
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

    const result = await pool.query(
      `SELECT u.id, u.pseudo, u.nom_affiche, u.type_compte, u.est_verifie,
              u.bio, u.theme_banniere, u.filiere, u.niveau_etude, u.cree_le,
              (SELECT count(*)::int FROM abonnements a WHERE a.suivi_id  = u.id) AS nb_abonnes,
              (SELECT count(*)::int FROM abonnements a WHERE a.abonne_id = u.id) AS nb_abonnements,
              (SELECT count(*)::int FROM publications p WHERE p.auteur_id = u.id) AS nb_publications,
              EXISTS (SELECT 1 FROM abonnements a
                       WHERE a.abonne_id = $2 AND a.suivi_id = u.id)             AS je_le_suis,
              pts.total AS points,
              pal.nom   AS palier,
              (SELECT COALESCE(array_agg(c.nom::text ORDER BY c.nom), '{}'::text[])
                 FROM utilisateurs_competences uc
                 JOIN competences c ON c.id = uc.competence_id
                WHERE uc.utilisateur_id = u.id)                                  AS competences
         FROM utilisateurs u
         CROSS JOIN LATERAL (
              SELECT COALESCE(sum(points), 0)::int AS total
                FROM evenements_activite WHERE utilisateur_id = u.id) pts
         LEFT JOIN LATERAL (
              SELECT nom FROM paliers
               WHERE points_minimum <= pts.total
               ORDER BY points_minimum DESC LIMIT 1) pal ON true
        WHERE u.id = $1`,
      [idNum, session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture du profil :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}