import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/signets/[id] : lire un signet par son ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. Vérification de la session (si la lecture doit être restreinte)
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        // 2. Récupération de l'ID du signet à lire
        const { id } = await params;
        const signetId = parseInt(id, 10);
        if (isNaN(signetId)) {
            return NextResponse.json(
                { success: false, error: 'ID de signet invalide' },
                { status: 400 }
            );
        }
        const client = await pool.connect();
        try {
            // 3. Récupération du signet depuis la base de données
            const result = await client.query(
                `SELECT * FROM signets WHERE id = $1 AND utilisateur_id = $2`,
                [signetId, session.id]
            );
            client.release();
            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Signet non trouvé' },
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
        console.error("Erreur lors de la récupération du signet :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }

}

// DELETE /api/signets/[id] : supprimer un signet spécifique
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. Vérification de la session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        // 2. Récupération de l'ID du signet à supprimer
        const { id } = await params;
        const signetId = parseInt(id, 10);
        if (isNaN(signetId)) {
            return NextResponse.json(
                { success: false, error: 'ID de signet invalide' },
                { status: 400 }
            );
        }
        const client = await pool.connect();
        try {
            // 3. Suppression du signet depuis la base de données
            const result = await client.query(
                `DELETE FROM signets WHERE id = $1 AND utilisateur_id = $2`,
                [signetId, session.id]
            );
            client.release();
            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Signet non trouvé' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { success: true, message: 'Signet supprimé avec succès' },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error("Erreur lors de la suppression du signet :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}