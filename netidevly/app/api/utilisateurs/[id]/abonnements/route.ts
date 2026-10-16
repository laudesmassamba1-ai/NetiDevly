import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// POST /api/utilisateurs/[id]/abonnement : suivre un utilisateur
export async function POST(
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

  // 2. L'id de la personne à suivre (URL)
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json(
      { success: false, error: 'Identifiant invalide' },
      { status: 400 }
    );
  }
  // On ne peut pas se suivre soi-même (la base l'interdit aussi, mais on répond proprement)
  if (idNum === session.id) {
    return NextResponse.json(
      { success: false, error: 'Tu ne peux pas te suivre toi-même' },
      { status: 400 }
    );
  }

  // 3. Transaction : l'abonnement + la notification pour la personne suivie
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ON CONFLICT DO NOTHING : si on suit déjà, aucune ligne n'est renvoyée
    const ins = await client.query(
      `INSERT INTO abonnements (abonne_id, suivi_id)
       VALUES ($1, $2)
       ON CONFLICT (abonne_id, suivi_id) DO NOTHING
       RETURNING suivi_id, cree_le`,
      [session.id, idNum]
    );

    if (ins.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Tu suis déjà cet utilisateur' },
        { status: 409 }
      );
    }

    // Notification créée par le serveur, pour le destinataire (la personne suivie)
    await client.query(
      `INSERT INTO notifications (utilisateur_id, acteur_id, type)
       VALUES ($1, $2, 'abonnement')`,
      [idNum, session.id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { success: true, data: ins.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    // 23503 = l'utilisateur à suivre n'existe pas
    if ((error as { code?: string }).code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }
    console.error("Erreur lors de l'abonnement :", error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE /api/utilisateurs/[id]/abonnement : ne plus suivre un utilisateur
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

    // abonne_id = session.id : on ne retire que SES propres abonnements
    const result = await pool.query(
      `DELETE FROM abonnements
        WHERE abonne_id = $1 AND suivi_id = $2
        RETURNING suivi_id`,
      [session.id, idNum]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Abonnement introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Abonnement retiré' },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors du désabonnement :", error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}