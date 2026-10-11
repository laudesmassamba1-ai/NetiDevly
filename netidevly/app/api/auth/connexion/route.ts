import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';

const connexionSchema = z.object({
  email: z.string().trim().email().max(150),
  mot_de_passe: z.string().min(6), // On récupère le mot de passe en clair envoyé par le client
});

// Route POST : Connexion d'un utilisateur
export async function POST(request: Request) {
  try {
    // 1. On lit le corps de la requête
    const body = await request.json();

    // 2. On valide les données avec le schéma Zod
    const parsedData = connexionSchema.parse(body);

    // 3. Connexion à la base de données et recherche de l'utilisateur par son email
    const client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM utilisateurs WHERE email = $1;`,
      [parsedData.email]
    );
    client.release();

    // 4. Vérification si l'utilisateur existe
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 } // 401 Unauthorized
      );
    }

    const utilisateur = result.rows[0];

    // TODO: Plus tard, on ajoutera la vérification du mot de passe haché (ex: avec bcrypt)
    // Pour l'instant, on simule que la connexion est réussie si l'email existe

    return NextResponse.json(
      { 
        success: true, 
        message: 'Connexion réussie', 
        data: {
          id: utilisateur.id,
          pseudo: utilisateur.pseudo,
          email: utilisateur.email,
          type_compte: utilisateur.type_compte
        } 
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Erreur lors de la connexion :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}