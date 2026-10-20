import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// Les types de réaction acceptés (à confirmer avec l'équipe front)
const reactionSchema = z.object({
  type: z.enum(['coeur', 'plus']),
});

// PUT /api/publications/[id]/reaction : réagir (ou changer sa réaction)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    // 2a. L'id de la publication (URL)
    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    // 2b. Le corps : { "type": "coeur" }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'JSON invalide' },
        { status: 400 }
      );
    }
    const parsed = reactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides' },
        { status: 400 }
      );
    }

    // 3. Une réaction par personne et par publication (clé primaire).
    //    ON CONFLICT ... DO UPDATE : si elle existe déjà, on change juste son type.
    //    Dans la MÊME requête (donc tout ou rien), on prévient l'auteur de la publication
    //    par une notification 'like' : sauf si c'est moi, et sans doublon si j'ai déjà
    //    notifié pour cette publication (changer de réaction ne re-notifie pas).
    const result = await pool.query(
      `WITH r AS (
         INSERT INTO reactions (publication_id, utilisateur_id, type)
         VALUES ($1, $2, $3)
         ON CONFLICT (publication_id, utilisateur_id)
         DO UPDATE SET type = EXCLUDED.type
         RETURNING publication_id, type
       ), n AS (
         INSERT INTO notifications (utilisateur_id, acteur_id, type, publication_id)
         SELECT p.auteur_id, $2, 'like', p.id
           FROM publications p
           JOIN r ON r.publication_id = p.id
          WHERE p.auteur_id <> $2
            AND NOT EXISTS (SELECT 1 FROM notifications x
                             WHERE x.type = 'like'
                               AND x.acteur_id = $2
                               AND x.publication_id = p.id)
         RETURNING 1
       )
       SELECT publication_id, type FROM r`,
      [idNum, session.id, parsed.data.type]
    );

    // 4. Réponse
    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    // 23503 = la publication n'existe pas
    if ((error as { code?: string }).code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Publication introuvable' },
        { status: 404 }
      );
    }
    console.error('Erreur lors de la réaction :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// DELETE /api/publications/[id]/reaction : retirer sa réaction
export async function DELETE(
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
        { status: 400 }
      );
    }

    // On ne retire que SA réaction (utilisateur_id = session.id)
    const result = await pool.query(
      `DELETE FROM reactions
        WHERE publication_id = $1 AND utilisateur_id = $2
        RETURNING publication_id`,
      [idNum, session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Réaction introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Réaction retirée' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors du retrait de la réaction :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}
