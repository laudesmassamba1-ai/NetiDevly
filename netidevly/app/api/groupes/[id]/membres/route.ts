import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe } from '@/lib/groupes';

// GET /api/groupes/[id]/membres : la liste des membres d'un groupe
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const groupeId = lireId((await params).id);
    if (groupeId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT u.id, u.pseudo, u.nom_affiche, u.est_verifie, m.role, m.rejoint_le
         FROM membres_groupes m
         JOIN utilisateurs u ON u.id = m.utilisateur_id
        WHERE m.groupe_id = $1
        ORDER BY CASE m.role WHEN 'proprietaire' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
                 m.rejoint_le
        LIMIT 200`,
      [groupeId]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des membres :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// POST /api/groupes/[id]/membres : rejoindre un groupe
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const groupeId = lireId((await params).id);
    if (groupeId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO membres_groupes (groupe_id, utilisateur_id)
       VALUES ($1, $2)
       ON CONFLICT (groupe_id, utilisateur_id) DO NOTHING
       RETURNING groupe_id, role, rejoint_le`,
      [groupeId, session.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tu es déjà membre de ce groupe' }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    // 23503 = le groupe n'existe pas
    if ((error as { code?: string }).code === '23503') {
      return NextResponse.json({ success: false, error: 'Groupe introuvable' }, { status: 404 });
    }
    console.error('Erreur lors de l\'adhésion au groupe :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// DELETE /api/groupes/[id]/membres : quitter un groupe
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const groupeId = lireId((await params).id);
    if (groupeId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const role = await roleDansGroupe(groupeId, session.id);
    if (role === null) {
      return NextResponse.json({ success: false, error: "Tu n'es pas membre de ce groupe" }, { status: 404 });
    }
    // Le propriétaire ne peut pas partir : il doit supprimer le groupe (sinon il resterait sans chef)
    if (role === 'proprietaire') {
      return NextResponse.json(
        { success: false, error: 'Le propriétaire ne peut pas quitter son groupe' },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM membres_groupes WHERE groupe_id = $1 AND utilisateur_id = $2`,
      [groupeId, session.id]
    );
    return NextResponse.json({ success: true, message: 'Groupe quitté' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors du départ du groupe :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}