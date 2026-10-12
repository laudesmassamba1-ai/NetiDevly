import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/publications/[id] : une publication avec son auteur, ses compteurs et ses hashtags
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    // 2. L'id de l'URL : du texte => on convertit et on vérifie
    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    // 3. Lire la publication. Colonnes listées une par une (jamais d'email ni de hash).
    //    Les compteurs et les hashtags sont des sous-requêtes : une ligne par publication.
    const result = await pool.query(
      `SELECT p.id, p.contenu, p.code, p.langage_code, p.cree_le, p.modifie_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie,
              (SELECT count(*)::int FROM reactions r
                WHERE r.publication_id = p.id)    AS nb_reactions,
              (SELECT count(*)::int FROM commentaires c
                WHERE c.publication_id = p.id)    AS nb_commentaires,
              (SELECT count(*)::int FROM reposts rp
                WHERE rp.publication_id = p.id)   AS nb_reposts,
              (SELECT COALESCE(array_agg(h.nom ORDER BY h.nom), '{}')
                 FROM publications_hashtags ph
                 JOIN hashtags h ON h.id = ph.hashtag_id
                WHERE ph.publication_id = p.id)   AS hashtags
         FROM publications p
         JOIN utilisateurs u ON u.id = p.auteur_id
        WHERE p.id = $1`,
      [idNum]
    );

    // 4. L'id est valide mais la ligne n'existe pas => 404
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Introuvable' },
        { status: 404 }
      );
    }

    // 5. Réponse avec UNE ligne (rows[0]), pas le tableau
    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error('Erreur lors de la lecture de la publication :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// DELETE /api/publications/[id] : une publication D'UN auteur
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    // 2. L'id de l'URL : du texte => on convertit et on vérifie
    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    // 3. supprimer la publication. Colonnes listées une par une (jamais d'email ni de hash).
    //    Les compteurs et les hashtags sont des sous-requêtes : une ligne par publication.
    const result = await pool.query(
      `DELETE FROM publications WHERE id = $1 AND auteur_id = $2 RETURNING id`,
      [idNum, session.id]
    );

    // 4. L'id est valide mais la ligne n'existe pas => 404
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Introuvable' },
        { status: 404 }
      );
    }

    // 5. Réponse avec UNE ligne (rows[0]), pas le tableau
    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error('Erreur lors de la suppression de la publication :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}