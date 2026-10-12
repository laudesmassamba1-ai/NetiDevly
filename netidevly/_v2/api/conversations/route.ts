import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

//route GET : pour recuperer toutes conversations
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM conversations;');
    client.release();

    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur de connexion à la base de données :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations : créer une nouvelle conversation entre l'utilisateur connecté et un destinataire
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
        const { destinataire_id } = body;

        if (!destinataire_id) {
            return NextResponse.json(
                { success: false, error: 'ID du destinataire requis' },
                { status: 400 }
            );
        }

        if (destinataire_id === session.id) {
            return NextResponse.json(
                { success: false, error: 'Impossible de créer une conversation avec soi-même' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Utilisation d'une transaction pour garantir l'atomicité (création conv + ajout des membres)
            await client.query('BEGIN');

            // 1. Création de la conversation (la table conversations ne contient que id, cree_le, mis_a_jour_le)
            const convResult = await client.query(
                `INSERT INTO conversations DEFAULT VALUES RETURNING *`
            );
            const nouvelleConv = convResult.rows[0];

            // 2. Ajout de l'utilisateur connecté dans la conversation
            await client.query(
                `INSERT INTO membres_conversations (conversation_id, utilisateur_id) VALUES ($1, $2)`,
                [nouvelleConv.id, session.id]
            );

            // 3. Ajout du destinataire dans la conversation
            await client.query(
                `INSERT INTO membres_conversations (conversation_id, utilisateur_id) VALUES ($1, $2)`,
                [nouvelleConv.id, destinataire_id]
            );

            await client.query('COMMIT');
            client.release();

            return NextResponse.json(
                { success: true, data: nouvelleConv },
                { status: 201 }
            );
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la création de la conversation :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}