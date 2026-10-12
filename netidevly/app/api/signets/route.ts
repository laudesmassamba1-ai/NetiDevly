import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/signets : récupérer tous les signets de l'utilisateur connecté
export async function GET() {
    // 1. Vérification de la session (si la récupération doit être restreinte)
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
            // 2. Récupération des signets de l'utilisateur connecté depuis la base de données
            const result = await client.query(
                `SELECT * FROM signets WHERE utilisateur_id = $1`,
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
        console.error("Erreur lors de la récupération des signets :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/signets : ajouter un nouveau signet pour l'utilisateur connecté
export async function POST(request: Request) {
    // 1. Vérification de la session (si l'ajout doit être restreint)
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        const body = await request.json();
        const { titre, url } = body;
        const client = await pool.connect();
        try {
            // 2. Insertion du nouveau signet dans la base de données
            const result = await client.query(
                `INSERT INTO signets (titre, url, utilisateur_id) VALUES ($1, $2, $3) RETURNING *`,
                [titre, url, session.id]
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
        console.error("Erreur lors de l'ajout du signet :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}
