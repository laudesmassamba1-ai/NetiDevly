import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/signalements : lire tous les signalements de l'utilisateur connecté
export async function GET(request: Request) {
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
                `SELECT * FROM signalements WHERE signaleur_id = $1 ORDER BY cree_le DESC`,
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
        console.error("Erreur lors de la récupération des signalements :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/signalements : créer un nouveau signalement
export async function POST(request: Request) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        const body = await request.json();
        const { publication_id, motif } = body;

        // Validation rapide des champs requis par le schéma
        if (!publication_id || !motif) {
            return NextResponse.json(
                { success: false, error: 'Publication et motif requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO signalements (signaleur_id, publication_id, motif) VALUES ($1, $2, $3) RETURNING *`,
                [session.id, publication_id, motif]
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
        console.error("Erreur lors de la création du signalement :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}