import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// POST /api/reposts : créer un repost
export async function POST(request: Request) {
    // 1. Vérification de la session (si la création doit être restreinte)
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        // 2. Récupération des données du repost depuis le corps de la requête
        const body = await request.json();
        const { commentaire_id } = body;
        if (!commentaire_id) {
            return NextResponse.json(
                { success: false, error: 'ID de commentaire requis' },
                { status: 400 }
            );
        }
        const client = await pool.connect();
        try {
            // 3. Insertion du repost dans la base de données
            const result = await client.query(
                `INSERT INTO reposts (utilisateur_id, commentaire_id) VALUES ($1, $2) RETURNING *`,
                [session.id, commentaire_id]
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
        console.error("Erreur lors de la création du repost :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }

}