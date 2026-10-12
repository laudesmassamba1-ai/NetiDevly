import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/demandes_verifications : lire toutes les demandes de vérification
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

        try {
            const result = await client.query(
                `SELECT * FROM demandes_verification WHERE utilisateur_id = $1`,
                [session.id]
          );

            client.release();

            return NextResponse.json(
                { success: true, data: result.rows },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la lecture des demandes de vérification :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/demandes_verifications : créer une nouvelle demande de vérification
export async function POST(request: Request) {
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

        try {
            // On insère uniquement l'utilisateur_id, le statut prendra 'en_attente' par défaut
            const result = await client.query(
                `INSERT INTO demandes_verification (utilisateur_id) VALUES ($1) RETURNING *`,
                [session.id]
            );

            client.release();

            return NextResponse.json(
                { success: true, data: result.rows[0] },
                { status: 201 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la création de la demande de vérification :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}