import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// DELETE /api/messages_canal/[id] : supprimer un message de canal par son ID
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;
        const messageId = parseInt(id, 10);
        if (isNaN(messageId)) {
            return NextResponse.json(
                { success: false, error: 'ID de message invalide' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Optionnel : s'assurer que l'utilisateur est bien l'auteur du message (ou admin)
            // Ici, on vérifie que l'auteur_id correspond à la session connectée
            const checkMsg = await client.query(
                `SELECT auteur_id FROM messages_canal WHERE id = $1`,
                [messageId]
            );

            if (checkMsg.rows.length === 0) {
                client.release();
                return NextResponse.json(
                    { success: false, error: 'Message non trouvé' },
                    { status: 404 }
                );
            }

            if (checkMsg.rows[0].auteur_id !== session.id) {
                client.release();
                return NextResponse.json(
                    { success: false, error: 'Non autorisé à supprimer ce message' },
                    { status: 403 }
                );
            }

            const result = await client.query(
                `DELETE FROM messages_canal WHERE id = $1 RETURNING *`,
                [messageId]
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
        console.error('Erreur lors de la suppression du message de canal :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}