import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/demandes_verifications/[id] : lire une demande de vérification par son ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // params est une Promise
) {
    // 1. QUI ? L'identité vient du cookie de session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        const { id: verificationId } = await params; // On attend la résolution de la Promise
        const client = await pool.connect();

        try {
            const result = await client.query(
                `SELECT * FROM demandes_verification WHERE id = $1 AND utilisateur_id = $2`,
                [verificationId, session.id]
            );
            client.release();

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Demande de vérification non trouvée' },
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
        console.error('Erreur lors de la lecture de la demande de vérification :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// PATCH /api/demandes_verifications/[id] : mettre à jour le statut d'une demande de vérification
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. QUI ? L'identité vient du cookie de session
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const { id: verificationId } = await params;
        const body = await request.json();
        const { statut } = body; // On récupère le statut depuis le body

        const client = await pool.connect();

        try {
            const result = await client.query(
                `UPDATE demandes_verification SET statut = $1 WHERE id = $2 AND utilisateur_id = $3 RETURNING *`,
                [statut, verificationId, session.id]
            );
            
            client.release();

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Demande non trouvée ou non autorisée' },
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
        console.error('Erreur lors de la mise à jour de la demande de vérification :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}