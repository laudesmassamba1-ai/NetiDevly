import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import bcrypt from 'bcryptjs';
import { creerJeton, poserCookieSession } from '@/lib/session';

const connexionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(150),
  // Mot de passe EN CLAIR envoyé par le client (le hash n'existe qu'en base).
  // À la connexion on ne contrôle pas la longueur minimale (c'est le rôle de l'inscription).
  // 72 = limite de bcrypt.
  mot_de_passe: z.string().min(1).max(72),
});

// POST /api/auth/connexion
export async function POST(request: Request) {
  // 1. Lire le corps de la requête (un JSON cassé donne 400, pas 500)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalide' },
      { status: 400 }
    );
  }

  // 2. Valider avec zod (safeParse ne lance pas d'exception)
  const parsed = connexionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
  const { email, mot_de_passe } = parsed.data;

  try {
    // 3. Chercher l'utilisateur : une seule requête => pool.query (connexion rendue automatiquement)
    const result = await pool.query(
      `SELECT id, pseudo, email, type_compte, mot_de_passe_hache
         FROM utilisateurs
        WHERE email = $1`,
      [email]
    );

    // 4. Utilisateur inconnu => même message qu'un mauvais mot de passe
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const utilisateur = result.rows[0];

    // 5. Vérifier le mot de passe : bcrypt.compare(clair, hache) => true / false
    const motDePasseValide = await bcrypt.compare(
      mot_de_passe,
      utilisateur.mot_de_passe_hache
    );
    if (!motDePasseValide) {
      // MÊME message que pour l'email inconnu (on ne révèle pas quels emails existent)
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // 6. Mot de passe correct : créer le jeton de session
    const jeton = await creerJeton(utilisateur.id);

    // On ne renvoie jamais mot_de_passe_hache
    const reponse = NextResponse.json(
      {
        success: true,
        message: 'Connexion réussie',
        data: {
          id: utilisateur.id,
          pseudo: utilisateur.pseudo,
          email: utilisateur.email,
          type_compte: utilisateur.type_compte,
        },
      },
      { status: 200 }
    );

    // 7. Poser le cookie de session sur la réponse
    poserCookieSession(reponse, jeton);

    return reponse;
  } catch (error) {
    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error('Erreur lors de la connexion :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}