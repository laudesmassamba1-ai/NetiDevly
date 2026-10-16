import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// PATCH /api/notifications/[id] : marquer UNE notification comme lue
export async function PATCH(
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

    // utilisateur_id = session.id : on ne touche qu'à SES notifications.
    // COALESCE : si elle est déjà lue, on garde la date de lecture d'origine.
    const result = await pool.query(
      `UPDATE notifications
          SET lue_le = COALESCE(lue_le, now())
        WHERE id = $1 AND utilisateur_id = $2
        RETURNING id, lue_le`,
      [idNum, session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors du marquage de la notification :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] : supprimer UNE notification
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

    const result = await pool.query(
      `DELETE FROM notifications
        WHERE id = $1 AND utilisateur_id = $2
        RETURNING id`,
      [idNum, session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Notification supprimée' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}