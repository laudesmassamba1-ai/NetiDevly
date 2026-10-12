import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/messages_prives : récupérer les messages privés des conversations de l'utilisateur connecté
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
            // Récupération des messages via les conversations où l'utilisateur est membre
            const result = await client.query(
                `SELECT mp.* 
                 FROM messages_prives mp
                 JOIN membres_conversations mc ON mp.conversation_id = mc.conversation_id
                 WHERE mc.utilisateur_id = $1
                 ORDER BY mp.cree_le ASC`,
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
        console.error("Erreur lors de la récupération des messages privés :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// POST /api/messages_prives : envoyer un nouveau message privé
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
        const { conversation_id, contenu } = body;

        if (!conversation_id || !contenu || contenu.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'ID de conversation et contenu requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // 1. Vérifier que l'utilisateur connecté fait bien partie de la conversation
            const memberCheck = await client.query(
                `SELECT 1 FROM membres_conversations WHERE conversation_id = $1 AND utilisateur_id = $2`,
                [conversation_id, session.id]
            );

            if (memberCheck.rows.length === 0) {
                client.release();
                return NextResponse.json(
                    { success: false, error: 'Accès refusé à cette conversation' },
                    { status: 403 }
                );
            }

            // 2. Insérer le message privé (expediteur_id correspond à l'utilisateur connecté)
            const result = await client.query(
                `INSERT INTO messages_prives (conversation_id, expediteur_id, contenu) 
                 VALUES ($1, $2, $3) 
                 RETURNING *`,
                [conversation_id, session.id, contenu]
            );

            // 3. Mettre à jour la date de mise à jour de la conversation parente
            await client.query(
                `UPDATE conversations SET mis_a_jour_le = now() WHERE id = $1`,
                [conversation_id]
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
        console.error("Erreur lors de l'envoi du message privé :", error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}