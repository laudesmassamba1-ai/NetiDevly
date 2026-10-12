import { NextResponse } from 'next/server';
import pool from '@/db/db';

//route GET : pour recuperer tous les tags
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM hashtags;');
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