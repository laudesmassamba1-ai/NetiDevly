import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/moi : les infos de l'utilisateur connecté
export async function GET() {
  // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    // 2. Lire l'utilisateur : une seule requête => pool.query.
    //    Colonnes listées une par une : jamais mot_de_passe_hache.
    //    L'email est renvoyé ici car c'est le propriétaire du compte qui le demande.
    const result = await pool.query(
      `SELECT id, pseudo, nom_affiche, email, type_compte, est_verifie,
              bio, theme_banniere, filiere, niveau_etude, objectif_hebdo,
              gels_serie, cree_le
         FROM utilisateurs
        WHERE id = $1`,
      [session.id]
    );

    // 3. Cookie valide mais compte supprimé => on le traite comme "non connecté"
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Non connecté' },
        { status: 401 }
      );
    }

    // 4. Réponse avec UNE ligne (rows[0]), pas le tableau
    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error("Erreur lors de la lecture de l'utilisateur connecté :", error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}