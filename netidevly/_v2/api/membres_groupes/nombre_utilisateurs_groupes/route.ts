import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/membres_groupes : récupérer le nombre de membres d'un groupe
export async function GET(request: Request) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        // Récupération du groupe_id depuis les query parameters (ex: /api/membres_groupes?groupe_id=5)
        const { searchParams } = new URL(request.url);
        const groupeIdParam = searchParams.get('groupe_id');

        if (!groupeIdParam) {
            return NextResponse.json(
                { success: false, error: 'Paramètre groupe_id requis' },
                { status: 400 }
            );
        }

        const groupeId = parseInt(groupeIdParam, 10);
        if (isNaN(groupeId)) {
            return NextResponse.json(
                { success: false, error: 'ID de groupe invalide' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT COUNT(*) AS count FROM membres_groupes WHERE groupe_id = $1`,
                [groupeId]
            );
            client.release();

            // Conversion du count en nombre entier
            const count = parseInt(result.rows[0].count, 10);

            return NextResponse.json(
                { success: true, data: { count } },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de membres :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}