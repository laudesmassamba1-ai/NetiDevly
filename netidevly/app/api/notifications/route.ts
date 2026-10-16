import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/notifications : mes notifications, les plus récentes d'abord
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT n.id, n.type, n.publication_id, n.commentaire_id, n.conversation_id,
              n.lue_le, n.cree_le,
              u.id AS acteur_id, u.pseudo, u.nom_affiche, u.est_verifie
         FROM notifications n
         JOIN utilisateurs u ON u.id = n.acteur_id
        WHERE n.utilisateur_id = $1
        ORDER BY n.cree_le DESC, n.id DESC
        LIMIT 50`,
      [session.id]
    );

    // Compteur pour le badge de la cloche
    const nonLues = await pool.query(
      `SELECT count(*)::int AS nb
         FROM notifications
        WHERE utilisateur_id = $1 AND lue_le IS NULL`,
      [session.id]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        nb_non_lues: nonLues.rows[0].nb,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des notifications :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications : tout marquer comme lu
export async function PATCH() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    // Seulement les miennes, et seulement celles qui ne sont pas déjà lues
    const result = await pool.query(
      `UPDATE notifications
          SET lue_le = now()
        WHERE utilisateur_id = $1 AND lue_le IS NULL`,
      [session.id]
    );

    return NextResponse.json(
      { success: true, data: { marquees: result.rowCount ?? 0 } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors du marquage des notifications :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications : supprimer toutes mes notifications
export async function DELETE() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `DELETE FROM notifications WHERE utilisateur_id = $1`,
      [session.id]
    );

    return NextResponse.json(
      { success: true, data: { supprimees: result.rowCount ?? 0 } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression des notifications :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}