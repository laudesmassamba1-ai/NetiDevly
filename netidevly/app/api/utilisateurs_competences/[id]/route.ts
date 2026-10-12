import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// PUT /api/utilisateurs_competences/[id] : Mettre à jour une association utilisateur-compétence
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await lireSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Non connecté' },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;
        const idNum = Number(id);
        if (!Number.isInteger(idNum) || idNum <= 0) {
            return NextResponse.json(
                { success: false, error: 'Identifiant invalide' },
                { status: 400 } // 400 Bad Request au lieu de 404
            );
        }

        const body = await request.json();
        const { utilisateur_id, competence_id } = body;

        const client = await pool.connect();
        try {
            // Mise à jour ciblée par l'ID de l'enregistrement avec le pattern COALESCE
            const result = await client.query(
                `UPDATE utilisateurs_competences
                 SET utilisateur_id = COALESCE($1, utilisateur_id), 
                     competence_id = COALESCE($2, competence_id)
                 WHERE id = $3
                 RETURNING utilisateur_id, competence_id;`,
                [utilisateur_id || null, competence_id || null, idNum]
            );
            client.release();

            if (result.rowCount === 0) {
                return NextResponse.json(
                    { success: false, error: 'Enregistrement non trouvé' },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour :', error);
        if (error.code === '23505') {
            return NextResponse.json(
                { success: false, error: 'Cette combinaison utilisateur-compétence est déjà utilisée' },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { success: false, error: 'Erreur interne' },
            { status: 500 }
        );
    }
}