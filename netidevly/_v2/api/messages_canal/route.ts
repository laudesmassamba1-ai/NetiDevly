import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/messages_canal?canal_id=X : récupérer les messages d'un canal spécifique
export async function GET(request: Request) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const canalIdParam = searchParams.get('canal_id');

        if (!canalIdParam) {
            return NextResponse.json(
                { success: false, error: 'Paramètre canal_id requis' },
                { status: 400 }
            );
        }

        const canalId = parseInt(canalIdParam, 10);
        if (isNaN(canalId)) {
            return NextResponse.json(
                { success: false, error: 'ID de canal invalide' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM messages_canal WHERE canal_id = $1 ORDER BY cree_le ASC`,
                [canalId]
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
        console.error('Erreur lors de la récupération des messages du canal :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/messages_canal : envoyer un message dans un canal
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
        const { canal_id, contenu, code, langage_code } = body;

        if (!canal_id || !contenu || contenu.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Canal ID et contenu requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO messages_canal (canal_id, auteur_id, contenu, code, langage_code) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [canal_id, session.id, contenu, code || null, langage_code || null]
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
        console.error("Erreur lors de l'envoi du message dans le canal :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}