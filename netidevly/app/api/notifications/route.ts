import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/notifications : récupérer toutes les notifications de l'utilisateur connecté
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
                `SELECT * FROM notifications WHERE utilisateur_id = $1 ORDER BY cree_le DESC`,
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
        console.error('Erreur lors de la récupération des notifications :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/notifications : créer une notification (ou marquer comme lue via patch/post selon besoin)
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
        const { utilisateur_id, type, publication_id, commentaire_id, conversation_id } = body;

        if (!utilisateur_id || !type) {
            return NextResponse.json(
                { success: false, error: 'Destinataire (utilisateur_id) et type requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // L'acteur est l'utilisateur connecté qui déclenche l'action
            const result = await client.query(
                `INSERT INTO notifications (utilisateur_id, acteur_id, type, publication_id, commentaire_id, conversation_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    utilisateur_id,
                    session.id,
                    type,
                    publication_id || null,
                    commentaire_id || null,
                    conversation_id || null
                ]
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
        console.error('Erreur lors de la création de la notification :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// DELETE /api/notifications : supprimer une notification (ou toutes les notifications lues)
export async function DELETE(request: Request) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const notificationId = searchParams.get('id');

        const client = await pool.connect();
        try {
            let result;
            if (notificationId) {
                // Supprimer une notification spécifique appartenant à l'utilisateur
                result = await client.query(
                    `DELETE FROM notifications WHERE id = $1 AND utilisateur_id = $2 RETURNING *`,
                    [parseInt(notificationId, 10), session.id]
                );
            } else {
                // Par défaut, supprimer toutes les notifications de l'utilisateur
                result = await client.query(
                    `DELETE FROM notifications WHERE utilisateur_id = $1 RETURNING *`,
                    [session.id]
                );
            }
            client.release();

            return NextResponse.json(
                { success: true, message: 'Notification(s) supprimée(s) avec succès', count: result.rowCount },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la suppression des notifications :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}