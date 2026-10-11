import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';

const inscriptionSchema = z.object({
  email: z.string().trim().email().max(150),
  pseudo: z.string().trim().min(3).max(30),
  nom_affiche: z.string().trim().min(2).max(50),
  mot_de_passe_hache: z.string().min(6),
  type_compte: z.enum(['etudiant', 'pro']).optional(),
});

export async function POST(request: Request) {
  try {
    // 1. On lit le corps de la requête une seule fois
    const body = await request.json();

    // 2. On valide les données avec le schéma Zod
    const parsedData = inscriptionSchema.parse(body);

    // 3. Insertion directe en base de données
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO utilisateurs (email, pseudo, nom_affiche, mot_de_passe_hache, type_compte) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *;`,
      [parsedData.email, parsedData.pseudo, parsedData.nom_affiche, parsedData.mot_de_passe_hache, parsedData.type_compte || 'etudiant']
    );
    client.release();

    return NextResponse.json({ message: 'Utilisateur créé avec succès', data: result.rows[0] }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
  return NextResponse.json({ message: 'Données invalides', errors: error.issues }, { status: 400 });
}
    console.error('Erreur :', error);
    return NextResponse.json({ message: 'Erreur interne du serveur', error: error.message }, { status: 500 });
  }
}