import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// POST /api/publications/[id]/signet : mettre une publication en signet
export async function POST(
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
    // 2. L'id de la publication vient de l'URL : on le convertit et on le vérifie
    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    // 3. Une seule requête => pool.query. La clé primaire (utilisateur_id, publication_id)
    //    empêche les doublons, la clé étrangère empêche de viser une publication inexistante.
    const result = await pool.query(
      `INSERT INTO signets (utilisateur_id, publication_id)
       VALUES ($1, $2)
       RETURNING publication_id, cree_le`,
      [session.id, idNum]
    );

    // 4. Réponse : 201 = ligne créée
    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    // 23505 = déjà en signet, 23503 = la publication n'existe pas
    if (code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Déjà dans tes signets' },
        { status: 409 }
      );
    }
    if (code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Publication introuvable' },
        { status: 404 }
      );
    }
    console.error('Erreur lors de la création du signet :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// DELETE /api/publications/[id]/signet : retirer une publication de ses signets
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

    // Les DEUX colonnes de la clé dans le WHERE : on ne retire que SON signet
    const result = await pool.query(
      `DELETE FROM signets
        WHERE utilisateur_id = $1 AND publication_id = $2
        RETURNING publication_id`,
      [session.id, idNum]
    );

    // Aucune ligne supprimée : ce signet n'existait pas
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Signet introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Signet retiré' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression du signet :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}