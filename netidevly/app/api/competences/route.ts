import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';

// À mettre en haut du fichier, avec tes autres imports (ne pas les dupliquer)
const competenceSchema = z.object({
  nom: z.string().trim().min(2).max(50),
});

// POST /api/competences
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

  // 2. Valider avec zod
  const parsed = competenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
  const { nom } = parsed.data;

  try {
    // 3. Insérer : VALUES ($1) => une valeur, donnée dans le tableau [nom]
    const result = await pool.query(
      `INSERT INTO competences (nom)
       VALUES ($1)
       RETURNING id, nom`,
      [nom]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Compétence créée avec succès',
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    // 23505 = la compétence existe déjà (colonne unique)
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Cette compétence existe déjà' },
        { status: 409 }
      );
    }

    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error('Erreur lors de la création de la compétence :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

//route GET : pour recuperer toutes les competences
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM competences;');
    client.release();

    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur de connexion à la base de données :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}