import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/recherche?q=react : cherche dans les utilisateurs, les publications et les hashtags
export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  // 2. QUOI ? Le texte cherché : 2 à 50 caractères (le # d'un hashtag est ignoré)
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().replace(/^#/, '');
  if (q.length < 2 || q.length > 50) {
    return NextResponse.json(
      { success: false, error: 'La recherche doit faire entre 2 et 50 caractères' },
      { status: 400 }
    );
  }

  // On neutralise % et _ (jokers de LIKE) tapés par l'utilisateur, puis on entoure de %
  const motif = `%${q.replace(/[\\%_]/g, '\\$&')}%`;

  try {
    const [utilisateurs, publications, hashtags] = await Promise.all([
      pool.query(
        `SELECT id, pseudo, nom_affiche, est_verifie
           FROM utilisateurs
          WHERE pseudo::text ILIKE $1 OR nom_affiche ILIKE $1
          ORDER BY est_verifie DESC, pseudo
          LIMIT 10`,
        [motif]
      ),
      pool.query(
        `SELECT p.id, left(p.contenu, 200) AS contenu, p.cree_le,
                u.id AS auteur_id, u.pseudo, u.nom_affiche
           FROM publications p
           JOIN utilisateurs u ON u.id = p.auteur_id
          WHERE p.contenu ILIKE $1
          ORDER BY p.id DESC
          LIMIT 10`,
        [motif]
      ),
      pool.query(
        `SELECT h.nom::text AS nom,
                (SELECT count(*)::int FROM publications_hashtags ph
                  WHERE ph.hashtag_id = h.id) AS nb_publications
           FROM hashtags h
          WHERE h.nom::text ILIKE $1
          ORDER BY nb_publications DESC, h.nom
          LIMIT 10`,
        [motif]
      ),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          utilisateurs: utilisateurs.rows,
          publications: publications.rows,
          hashtags: hashtags.rows,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la recherche :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
