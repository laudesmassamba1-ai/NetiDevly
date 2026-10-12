import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/signalements/[id] : lire un signalement par son ID
export async function GET(
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
        const signalementId = parseInt(id, 10);
        if (isNaN(signalementId)) {
            return NextResponse.json(
                { success: false, error: 'ID de signalement invalide' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM signalements WHERE id = $1 AND signaleur_id = $2`,
                [signalementId, session.id]
            );
            client.release();
            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Signalement non trouvé' },
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
        console.error("Erreur lors de la récupération du signalement :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// PATCH /api/signalements/[id] : mettre à jour un signalement par son ID
export async function PATCH(
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
        const signalementId = parseInt(id, 10);
        if (isNaN(signalementId)) {
            return NextResponse.json(
                { success: false, error: 'ID de signalement invalide' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { motif } = body; // Aligné sur la colonne réelle de la table

        const client = await pool.connect();
        try {
            const result = await client.query(
                `UPDATE signalements SET motif = $1 WHERE id = $2 AND signaleur_id = $3 RETURNING *`,
                [motif, signalementId, session.id]
            );
            client.release();
            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Signalement non trouvé ou non autorisé' },
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
        console.error("Erreur lors de la mise à jour du signalement :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}