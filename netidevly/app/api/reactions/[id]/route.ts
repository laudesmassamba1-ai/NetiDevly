import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/reactions/[id] : lire une réaction spécifique
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // params est une Promise
) {
    try {
        const { id } = await params; // On attend la résolution de la Promise
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                `SELECT * FROM reactions WHERE id = $1`,
                [id]
            );
            client.release();

            if (result.rows.length === 0) {
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
        console.error("Erreur lors de la lecture de la réaction :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// DELETE /api/reactions/[id] : supprimer une réaction spécifique
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
        const { id } = await params;
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                `DELETE FROM reactions WHERE id = $1 RETURNING *`,
                [id]
            );
            client.release();

            if (result.rows.length === 0) {
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