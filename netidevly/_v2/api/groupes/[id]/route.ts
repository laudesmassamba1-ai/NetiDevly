import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/groupes/[id] : lire un groupe par son ID
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
        const { id } = await params;
        const client = await pool.connect();

        try {
            const result = await client.query(
                `SELECT * FROM groupes WHERE id = $1`,
                [id]
            );
            
            client.release(); // Libération immédiate après la requête

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Groupe non trouvé' },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { success: true, data: result.rows[0] },
                { status: 200 }
            );
        } catch (error) {
            client.release(); // Sécurité en cas d'erreur SQL
            throw error; // On remonte l'erreur vers le catch global
        }
    } catch (error) {
        console.error('Erreur lors de la lecture du groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// PATCH /api/groupes/[id] : mettre à jour un groupe par son ID
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
        const { id } = await params;
        const body = await request.json();
        const { nom, description } = body;  

        const client = await pool.connect();

        try {
            // On met à jour UNIQUEMENT si le groupe appartient à l'utilisateur connecté
            const result = await client.query(
                `UPDATE groupes SET nom = $1, description = $2 WHERE id = $3 AND createur_id = $4 RETURNING *`,
                [nom, description, id, session.id]
            );
            
            client.release(); // Libération immédiate après la requête

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Groupe non trouvé ou non autorisé' },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { success: true, data: result.rows[0] },
                { status: 200 }
            );
        } catch (error) {
            client.release(); // Sécurité en cas d'erreur SQL
            throw error; // On remonte l'erreur vers le catch global
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// DELETE /api/groupes/[id] : supprimer un groupe par son ID
export async function DELETE(
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

    const client = await pool.connect(); // On ouvre le client en amont

    try {
        const { id } = await params;
        
        const result = await client.query(
            `DELETE FROM groupes WHERE id = $1 AND createur_id = $2 RETURNING *`,
            [id, session.id]
        );
        
        client.release(); // Libération en cas de succès

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Groupe non trouvé ou non autorisé' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: result.rows[0] },
            { status: 200 }
        );
    } catch (error) {
        client.release(); // Sécurité : libérer le client même si une exception survient
        console.error('Erreur lors de la suppression du groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}