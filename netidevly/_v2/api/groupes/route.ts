import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/groupes : lire tous les groupes
export async function GET(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect(); // On ouvre le client en amont

    try {
        // Si tu veux récupérer TOUS les groupes de la plateforme :
        const result = await client.query(`SELECT * FROM groupes`);
        
        client.release(); // Libération en cas de succès

        return NextResponse.json(
            { success: true, data: result.rows }, // data: result.rows (au pluriel) pour une liste
            { status: 200 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client même si une exception survient
        console.error('Erreur lors de la lecture des groupes :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/groupes : créer un nouveau groupe
export async function POST(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect();

    try {
        const body = await request.json();
        const { nom, description } = body;

        const result = await client.query(
            `INSERT INTO groupes (nom, description, createur_id) VALUES ($1, $2, $3) RETURNING *`,
            [nom, description, session.id]
        );

        client.release();

        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 201 }
        );
    } catch (error) {
        client.release();
        console.error('Erreur lors de la création du groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}
