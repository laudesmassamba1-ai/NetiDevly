import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/stories/[id] : lire une story par son ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // params est une Promise
) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect();

    try {
        // On résout les paramètres dynamiques
        const resolvedParams = await params;
        const storyId = resolvedParams.id;

        const result = await client.query(
            `SELECT * FROM stories WHERE id = $1 AND auteur_id = $2`,
            [storyId, session.id]
        );

        client.release(); // Libération en cas de succès

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Story non trouvée' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 200 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client même si une exception survient
        console.error('Erreur lors de la lecture de la story :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// DELETE /api/stories/[id] : supprimer une story par son ID pour l'utilisateur connecté
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect();

    try {
        // On résout les paramètres dynamiques
        const resolvedParams = await params;
        const storyId = resolvedParams.id;

        const result = await client.query(
            `DELETE FROM stories WHERE id = $1 AND auteur_id = $2 RETURNING *`,
            [storyId, session.id]
        );

        client.release(); // Libération en cas de succès

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Story non trouvée' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 200 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client même si une exception survient
        console.error('Erreur lors de la suppression de la story :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}
