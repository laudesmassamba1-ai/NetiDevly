import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/evenements_activite: lire tous les événements d'activité pour l'utilisateur connecté
export async function GET(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT * FROM evenements_activite WHERE utilisateur_id = $1 ORDER BY cree_le DESC`,
            [session.id]
        );
        client.release();
        return NextResponse.json(
            { success: true, data: result.rows },
            { status: 200 }
        );
    } catch (error) {
        console.error('Erreur lors de la lecture des événements d\'activité :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }

}