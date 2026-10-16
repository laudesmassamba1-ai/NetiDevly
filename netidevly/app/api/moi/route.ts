import { z } from 'zod';
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

// Ce que l'utilisateur a le droit de modifier sur son profil.
// Absents volontairement : email, pseudo, mot de passe, type_compte, est_verifie, gels_serie.
// zod ignore toute clé qui n'est pas listée ici.
const profilSchema = z.object({
  nom_affiche: z.string().trim().min(2).max(50).optional(),
  bio: z.string().trim().max(255).nullable().optional(),
  theme_banniere: z.string().trim().max(50).nullable().optional(),
  filiere: z.string().trim().max(100).nullable().optional(),
  niveau_etude: z.string().trim().max(20).nullable().optional(),
  objectif_hebdo: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(10)]).optional(),
});

// PATCH /api/moi : modifier une partie de son profil
export async function PATCH(request: Request) {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  // 2. Le corps
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalide' },
      { status: 400 }
    );
  }
  const parsed = profilSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }

  // Les champs réellement envoyés (undefined = non envoyé ; null = "vider le champ")
  const champs = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
  if (champs.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Aucun champ à modifier' },
      { status: 400 }
    );
  }

  try {
    // 3. UPDATE dynamique. Les noms de colonnes viennent UNIQUEMENT des clés du schéma
    //    zod ci-dessus (liste blanche), jamais du client. Les valeurs passent en $2, $3...
    const set = champs.map(([colonne], i) => `${colonne} = $${i + 2}`).join(', ');
    const valeurs = champs.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE utilisateurs
          SET ${set}
        WHERE id = $1
        RETURNING id, pseudo, nom_affiche, email, type_compte, est_verifie,
                  bio, theme_banniere, filiere, niveau_etude, objectif_hebdo,
                  gels_serie, cree_le`,
      [session.id, ...valeurs]
    );

    // 4. Cookie valide mais compte supprimé
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Non connecté' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la modification du profil :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}