import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/commentaires : lire tous les commentaires
export async function GET() {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`SELECT * FROM commentaires`);
            client.release();
            return NextResponse.json({ success: true, data: result.rows });
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error("Erreur lors de la lecture des commentaires :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/commentaires : créer un nouveau commentaire
export async function POST(request: Request) {
    // 1. Vérification de la session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { contenu, story_id } = body; // Ajuste selon la colonne cible de ton schéma (ex: publication_id, story_id...)

        const client = await pool.connect();

        try {
            const result = await client.query(
                `INSERT INTO commentaires (contenu, utilisateur_id, story_id) VALUES ($1, $2, $3) RETURNING *`,
                [contenu, session.id, story_id]
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
        console.error("Erreur lors de la création du commentaire :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}