import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/stories : lire les stories de tous les utilisateurs suivis par l'utilisateur connecté
export async function GET(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect(); // On sort le client pour pouvoir le libérer partout

    try {
        const result = await client.query(
            `SELECT s.id, s.pseudo, s.nom_affiche, s.bio, a.cree_le
             FROM abonnements a
             JOIN utilisateurs s ON s.id = a.suivi_id
             WHERE a.abonne_id = $1;`,
            [session.id] // On injecte l'ID sécurisé de la session
        );
        
        client.release(); // Libération en cas de succès

        // 2. Réponse avec les données
        return NextResponse.json(
            { success: true, data: result.rows },
            { status: 200 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client même si une exception survient
        console.error('Erreur lors de la lecture des stories :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST stories : créer une nouvelle story pour l'utilisateur connecté
export async function POST(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect(); // On ouvre le client en amont

    try {
        const body = await request.json();
        const { contenu } = body;

        const result = await client.query(
            `INSERT INTO stories (auteur_id, contenu, cree_le) VALUES ($1, $2, NOW()) RETURNING *`,
            [session.id, contenu]
        );

        client.release(); // Libération en cas de succès

        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 201 }
        );
    } catch (error) {
        client.release(); // Libération sécurisée en cas d'erreur
        console.error('Erreur lors de la création de la story :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}