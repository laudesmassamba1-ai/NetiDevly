import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

// GET /api/utilisateurs/[id]/publications : les publications d'un utilisateur
// Pagination : ?avant=ID (20 par page, la plus récente d'abord)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const auteurId = lireId((await params).id);
    if (auteurId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const avantBrut = new URL(request.url).searchParams.get('avant');
    let avant: number | null = null;
    if (avantBrut !== null) {
      avant = lireId(avantBrut);
      if (avant === null) {
        return NextResponse.json({ success: false, error: 'Paramètre avant invalide' }, { status: 400 });
      }
    }

    const result = await pool.query(
      `SELECT p.id, p.contenu, p.code, p.langage_code, p.cree_le, p.modifie_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie,
              (SELECT count(*)::int FROM reactions r     WHERE r.publication_id  = p.id) AS nb_reactions,
              (SELECT count(*)::int FROM commentaires c  WHERE c.publication_id  = p.id) AS nb_commentaires,
              (SELECT count(*)::int FROM reposts rp      WHERE rp.publication_id = p.id) AS nb_reposts,
              (SELECT COALESCE(array_agg(h.nom::text ORDER BY h.nom), '{}'::text[])
                 FROM publications_hashtags ph
                 JOIN hashtags h ON h.id = ph.hashtag_id
                WHERE ph.publication_id = p.id)                                         AS hashtags
         FROM publications p
         JOIN utilisateurs u ON u.id = p.auteur_id
        WHERE p.auteur_id = $1 AND ($2::int IS NULL OR p.id < $2::int)
        ORDER BY p.id DESC
        LIMIT 20`,
      [auteurId, avant]
    );

    const dernier = result.rows.length > 0 ? result.rows[result.rows.length - 1].id : null;
    return NextResponse.json(
      { success: true, data: result.rows, prochain: dernier },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des publications :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}