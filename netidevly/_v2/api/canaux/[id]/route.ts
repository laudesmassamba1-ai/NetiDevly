import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// DELETE /api/canaux/[id] : supprimer un canal spécifique par son ID
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    const { id } = await params;
    const canalId = parseInt(id, 10);
    if (isNaN(canalId)) {
        return NextResponse.json(
            { success: false, error: 'ID de canal invalide' },
            { status: 400 }
        );
    }

    try {
        const client = await pool.connect();
        try {
            // Suppression du canal ciblé par son identifiant unique
            const result = await client.query(
                'DELETE FROM canaux WHERE id = $1 RETURNING *',
                [canalId]
            );
            client.release();

            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Canal non trouvé' },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { success: true, message: 'Canal supprimé avec succès', data: result.rows[0] },
                { status: 200 }
            );
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du canal :', error);
        return NextResponse.json(
            { success: { success: false, error: 'Erreur interne' } },
            { status: 500 }
        );
    }
}