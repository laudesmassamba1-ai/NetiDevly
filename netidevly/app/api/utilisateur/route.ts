import { NextResponse } from 'next/server';
import pool from '@/db/db';

// Route GET : Récupérer les utilisateurs
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM utilisateurs;');
    client.release();

    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur de connexion à la base de données :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Route POST : Ajouter un nouvel utilisateur
export async function POST(request: Request) {
  try {
    const { nom, email, mot_de_passe } = await request.json();
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES ($1, $2, $3) RETURNING *;',
      [nom, email, mot_de_passe]
    );
    client.release();

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

