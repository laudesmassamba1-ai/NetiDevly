import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// POST /api/canaux/[id] : créer un nouveau canal pour un groupe spécifique
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const { id } = await params;
    const groupeId = parseInt(id, 10);
    if (isNaN(groupeId)) {
        return NextResponse.json(
            { success: false, error: 'ID de groupe invalide' },
            { status: 400 }
        );
    }

    const body = await request.json();
    const { nom, sujet } = body; // Remplacement de description par sujet selon le schéma

    if (!nom) {
        return NextResponse.json(
            { success: false, error: 'Nom du canal requis' },
            { status: 400 }
        );
    }

    try {
        const client = await pool.connect();
        try {
            // Insertion avec groupe_id, nom, sujet et createur_id
            const result = await client.query(
                `INSERT INTO canaux (groupe_id, nom, sujet, createur_id) VALUES ($1, $2, $3, $4) RETURNING *`,
                [groupeId, nom, sujet || null, session.id]
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
        console.error('Erreur lors de la création du canal :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}