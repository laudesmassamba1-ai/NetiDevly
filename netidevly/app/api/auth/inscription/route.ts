import { z } from 'zod';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/db/db';
import { creerJeton, poserCookieSession } from '@/lib/session';

// Pseudos interdits : ce sont des routes fixes (/api/utilisateurs/suggestions, ...)
// qui entreraient en conflit avec la route dynamique /api/utilisateurs/[pseudo].
const PSEUDOS_RESERVES = ['suggestions', 'tendances'];

const inscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(150),
  pseudo: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .refine((p) => !PSEUDOS_RESERVES.includes(p.toLowerCase())),
  nom_affiche: z.string().trim().min(2).max(50),
  // Mot de passe EN CLAIR envoyé par le client : on le hache côté serveur.
  // 72 = limite de bcrypt (au-delà, les caractères sont ignorés).
  mot_de_passe: z.string().min(8).max(72),
  type_compte: z.enum(['etudiant', 'pro']).optional(),
});

// POST /api/auth/inscription
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
  const parsed = inscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
  const { email, pseudo, nom_affiche, mot_de_passe, type_compte } = parsed.data;

  try {
    // 3. Hacher le mot de passe (10 = coût du calcul). Jamais de mot de passe en clair en base.
    const hache = await bcrypt.hash(mot_de_passe, 10);

    // 4. Insérer. Une seule requête => pool.query.
    //    RETURNING liste les colonnes une par une : pas de mot_de_passe_hache dans la réponse.
    const result = await pool.query(
      `INSERT INTO utilisateurs (email, pseudo, nom_affiche, mot_de_passe_hache, type_compte)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, pseudo, nom_affiche, type_compte`,
      [email, pseudo, nom_affiche, hache, type_compte ?? 'etudiant']
    );

    // 5. Connecter directement le nouvel utilisateur : jeton + cookie de session
    const jeton = await creerJeton(result.rows[0].id);

    const reponse = NextResponse.json(
      {
        success: true,
        message: 'Utilisateur créé avec succès',
        data: result.rows[0],
      },
      { status: 201 }
    );
    poserCookieSession(reponse, jeton);

    return reponse;
  } catch (error) {
    // 23505 = violation d'unicité PostgreSQL (email ou pseudo déjà pris)
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Email ou pseudo déjà utilisé' },
        { status: 409 }
      );
    }

    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error("Erreur lors de l'inscription :", error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}