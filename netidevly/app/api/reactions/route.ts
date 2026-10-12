import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/reactions : lire toutes les réactions
export async function GET(request: Request) {
    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT * FROM reactions`
        ); 
        client.release();
        return NextResponse.json(
            { success: true, data: result.rows },
            { status: 200 }
        );
    } catch (error) {
        console.error("Erreur lors de la lecture des réactions :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}