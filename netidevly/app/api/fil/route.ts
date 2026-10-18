import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/fil : le fil des publications, les plus récentes d'abord (20 par page)
// Page suivante : /api/fil?avant=ID  (ID = la valeur "prochain" de la réponse précédente)
export async function GET(request: Request) {
  // 1. QUI ? L'identité vient du cookie de session
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    // 2. Le paramètre ?avant= est optionnel. S'il est présent, il doit être un id valide.
    const avantBrut = new URL(request.url).searchParams.get('avant');
    let avant: number | null = null;
    if (avantBrut !== null) {
      avant = Number(avantBrut);
      if (!Number.isInteger(avant) || avant <= 0) {
        return NextResponse.json(
          { success: false, error: 'Paramètre avant invalide' },
          { status: 400 }
        );
      }
    }

    // 3. Lire les publications. Sans "avant", $1 vaut null et la condition est toujours vraie ;
    //    avec "avant", on ne garde que les publications plus anciennes que la dernière déjà vue.
    const result = await pool.query(
      `SELECT p.id, p.contenu, p.code, p.langage_code, p.cree_le, p.modifie_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie,
              (SELECT count(*)::int FROM reactions r
                WHERE r.publication_id = p.id)    AS nb_reactions,
              (SELECT count(*)::int FROM commentaires c
                WHERE c.publication_id = p.id)    AS nb_commentaires,
              (SELECT count(*)::int FROM reposts rp
                WHERE rp.publication_id = p.id)   AS nb_reposts,
              (SELECT COALESCE(array_agg(h.nom::text ORDER BY h.nom), '{}'::text[])
                 FROM publications_hashtags ph
                 JOIN hashtags h ON h.id = ph.hashtag_id
                WHERE ph.publication_id = p.id)   AS hashtags
         FROM publications p
         JOIN utilisateurs u ON u.id = p.auteur_id
        WHERE ($1::int IS NULL OR p.id < $1::int)
        ORDER BY p.id DESC
        LIMIT 20`,
      [avant]
    );

    // 4. Une liste vide est normale : pas de 404.
    //    "prochain" = l'id de la dernière publication, à renvoyer dans ?avant= pour la page suivante.
    const prochain =
      result.rows.length > 0 ? result.rows[result.rows.length - 1].id : null;

    // 5. Réponse avec le tableau complet
    return NextResponse.json(
      { success: true, data: result.rows, prochain },
      { status: 200 }
    );
  } catch (error) {
    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error('Erreur lors de la lecture du fil :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}