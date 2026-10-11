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
