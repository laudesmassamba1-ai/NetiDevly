import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/membres_groupes : récupérer les groupes dont l'utilisateur est membre
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
            // Utilisation de utilisateur_id au lieu de user_id selon le schéma
            const result = await client.query(
                `SELECT * FROM membres_groupes WHERE utilisateur_id = $1`,
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
        console.error('Erreur lors de la récupération des membres_groupes :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/membres_groupes : ajouter un utilisateur à un groupe
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
        const { groupe_id, utilisateur_id } = body;

        if (!groupe_id || !utilisateur_id) {
            return NextResponse.json(
                { success: false, error: 'Groupe ID et utilisateur ID requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Vérification si l'utilisateur est déjà membre du groupe
            const checkResult = await client.query(
                `SELECT * FROM membres_groupes WHERE groupe_id = $1 AND utilisateur_id = $2`,
                [groupe_id, utilisateur_id]
            );
            
            if (checkResult.rows.length > 0) {
                client.release(); // <-- Libération indispensable ici !
                return NextResponse.json(
                    { success: false, error: 'Utilisateur déjà membre du groupe' },
                    { status: 400 }
                );
            }

            // Insertion du nouvel enregistrement
            const result = await client.query(
                `INSERT INTO membres_groupes (groupe_id, utilisateur_id) VALUES ($1, $2) RETURNING *`,
                [groupe_id, utilisateur_id]
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
        console.error('Erreur lors de l\'ajout d\'un utilisateur à un groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}