import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/membres_groupes/[id] : récupérer les membres d'un groupe spécifique
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    try {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM membres_groupes WHERE groupe_id = $1`,
                [groupeId]
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
        console.error('Erreur lors de la récupération des membres du groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// DELETE /api/membres_groupes/[groupe_id] : quitter un groupe ou retirer un membre
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        const { id } = await params;
        const groupeId = parseInt(id, 10);
        if (isNaN(groupeId)) {
            return NextResponse.json(
                { success: false, error: 'ID de groupe invalide' },
                { status: 400 }
            );
        }

        // On peut récupérer l'utilisateur à supprimer via le body (pour un admin) 
        // ou supprimer l'utilisateur connecté lui-même (s'il quitte le groupe).
        const body = await request.json().catch(() => ({}));
        const cibleId = body.utilisateur_id || session.id;

        const client = await pool.connect();
        try {
            // Suppression basée sur la clé primaire composite (groupe_id, utilisateur_id)
            const result = await client.query(
                `DELETE FROM membres_groupes WHERE groupe_id = $1 AND utilisateur_id = $2 RETURNING *`,
                [groupeId, cibleId]
            );
            client.release();

            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Membre non trouvé dans ce groupe' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { success: true, message: 'Membre retiré du groupe avec succès' },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du membre du groupe :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}

// PATCH /api/membres_groupes/[groupe_id] : mettre à jour le rôle d'un membre
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }
    try {
        const { id } = await params;
        const groupeId = parseInt(id, 10);
        if (isNaN(groupeId)) {
            return NextResponse.json(
                { success: false, error: 'ID de groupe invalide' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { utilisateur_id, role } = body;

        if (!utilisateur_id || !role) {
            return NextResponse.json(
                { success: false, error: 'Utilisateur ID et rôle requis' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Mise à jour du rôle du membre dans le groupe
            const result = await client.query(
                `UPDATE membres_groupes SET role = $1 WHERE groupe_id = $2 AND utilisateur_id = $3 RETURNING *`,
                [role, groupeId, utilisateur_id]
            );
            client.release();

            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Membre non trouvé dans ce groupe' },
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
        console.error('Erreur lors de la mise à jour du rôle du membre :', error);
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}