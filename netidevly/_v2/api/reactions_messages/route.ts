import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// PUT /api/reactions_messages : ajouter une réaction (emoji) à un message privé
export async function PUT(request: Request) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { message_prive_id, emoji } = body;

        if (!message_prive_id || !emoji) {
            return NextResponse.json(
                { success: false, error: 'ID de message privé et emoji requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Insertion avec gestion des doublons (INSERT ... ON CONFLICT DO NOTHING ou mise à jour)
            const result = await client.query(
                `INSERT INTO reactions_messages (message_prive_id, utilisateur_id, emoji) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (message_prive_id, utilisateur_id, emoji) DO UPDATE SET cree_le = now()
                 RETURNING *`,
                [message_prive_id, session.id, emoji]
            );
            client.release();

            return NextResponse.json(
                { success: true, data: result.rows[0] },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error("Erreur lors de l'ajout de la réaction :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// DELETE /api/reactions_messages : supprimer une réaction (emoji) d'un message privé
export async function DELETE(request: Request) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { message_prive_id, emoji } = body;

        if (!message_prive_id || !emoji) {
            return NextResponse.json(
                { success: false, error: 'ID de message privé et emoji requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `DELETE FROM reactions_messages 
                 WHERE message_prive_id = $1 AND utilisateur_id = $2 AND emoji = $3 
                 RETURNING *`,
                [message_prive_id, session.id, emoji]
            );
            client.release();

            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Réaction non trouvée' },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { success: true, data: result.rows[0] },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error("Erreur lors de la suppression de la réaction :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}