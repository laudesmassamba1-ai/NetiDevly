import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/evenements_activite/[id] : lire un événement d'activité par son ID
export async function GET(
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
        const { id: evenementId } = await params;
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                `SELECT * FROM evenements_activite WHERE id = $1 AND utilisateur_id = $2`,
                [evenementId, session.id]
            );
            
            client.release();

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: "Événement d'activité non trouvé" },
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
        console.error("Erreur lors de la lecture de l'événement d'activité :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// PUT /api/evenements_activite/[id] : mettre à jour un événement d'activité par son ID
export async function PUT(
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
        const { id: evenementId } = await params;
        const body = await request.json();
        const { type, points, meta } = body; // Utilisation des vraies colonnes du schéma
        
        const client = await pool.connect();
        try {
            const result = await client.query(
                `UPDATE evenements_activite SET type = $1, points = $2, meta = $3 WHERE id = $4 AND utilisateur_id = $5 RETURNING *`,
                [type, points, meta, evenementId, session.id]
            );
            client.release();
            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: "Événement d'activité non trouvé ou pas autorisé" },
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
        console.error("Erreur lors de la mise à jour de l'événement d'activité :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}