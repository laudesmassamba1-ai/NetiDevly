import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET abonnements : les abonnements de l'utilisateur connecté
export async function GET(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const client = await pool.connect();
        
        // 2. Lire uniquement les abonnements de l'utilisateur connecté
        // On récupère les infos du profil suivi (table s)
        const result = await client.query(
            `SELECT s.id, s.pseudo, s.nom_affiche, s.bio, a.cree_le
             FROM abonnements a
             JOIN utilisateurs s ON s.id = a.suivi_id
             WHERE a.abonne_id = $1;`,
            [session.id] // On injecte l'ID sécurisé de la session
        );
        
        client.release();

        // 3. Réponse avec les abonnements
        return NextResponse.json(
            { success: true, data: result.rows },
            { status: 200 }
        );
    } catch (error) {
        console.error('Erreur lors de la lecture des abonnements :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST abonnements : créer un nouvel abonnement pour l'utilisateur connecté
export async function POST(request: Request) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect(); // On sort le client ici pour pouvoir le libérer partout

    try {
        const body = await request.json();
        const suiviId = body.suivi_id;

        // Validation basique pour s'assurer qu'on suit un ID valide
        if (!suiviId) {
            client.release();
            return NextResponse.json(
                { success: false, error: 'ID de l\'utilisateur à suivre manquant' },
                { status: 400 }
            );
        }

        // 2. Vérifier que l'utilisateur n'est pas déjà abonné
        const checkResult = await client.query(
            `SELECT 1 FROM abonnements WHERE abonne_id = $1 AND suivi_id = $2`,
            [session.id, suiviId]
        );

        if (checkResult.rows.length > 0) {
            client.release();
            return NextResponse.json(
                { success: false, error: 'Déjà abonné' },
                { status: 400 }
            );
        }

        // 3. Créer le nouvel abonnement
        const result = await client.query(
            `INSERT INTO abonnements (abonne_id, suivi_id, cree_le) VALUES ($1, $2, NOW()) RETURNING *`,
            [session.id, suiviId]
        );

        client.release(); // Libération en cas de succès

        // 4. Réponse avec le nouvel abonnement
        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 201 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client même si une exception survient
        console.error('Erreur lors de la création de l\'abonnement :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}
