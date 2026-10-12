import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/abonnements/[id] : lire un abonne par son ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // params est une Promise
) {
    // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const client = await pool.connect();

    try {
        // On résout les paramètres dynamiques
        const resolvedParams = await params;
        const suiviId = resolvedParams.id;

        // 2. Lire l'abonne par son ID en vérifiant qu'il appartient bien à l'utilisateur connecté
        const result = await client.query(
            `SELECT s.id, s.pseudo, s.nom_affiche, s.bio, a.cree_le
             FROM abonnements a
             JOIN utilisateurs s ON s.id = a.suivi_id
             WHERE a.abonne_id = $1 AND a.suivi_id = $2;`,
            [session.id, suiviId]
        );

        client.release();

        // 3. Vérifier si l'abonnement existe
        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Abonnement introuvable' },
                { status: 404 }
            );
        }

        // 4. Réponse avec les informations de l'abonné
        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 200 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client en cas d'erreur
        console.error('Erreur lors de la lecture de l\'abonne :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}