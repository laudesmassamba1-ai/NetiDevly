import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';


// DELETE /api/reposts/[id] : supprimer un repost spécifique
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. Vérification de la session (si la suppression doit être restreinte)
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        // 2. Récupération de l'ID du repost à supprimer
        const { id } = await params;
        const repostId = parseInt(id, 10);
        if (isNaN(repostId)) {
            return NextResponse.json(
                { success: false, error: 'ID de repost invalide' },
                { status: 400 }
            );
        }
        const client = await pool.connect();
        try {
            // 3. Suppression du repost
            // 3. Suppression du repost (sécurisée par l'auteur)
            const result = await client.query(
                `DELETE FROM reposts WHERE id = $1 AND utilisateur_id = $2 RETURNING *`,
                [repostId, session.id]
            );
            client.release();
            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Repost non trouvé' },
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
        console.error("Erreur lors de la suppression du repost :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }

}