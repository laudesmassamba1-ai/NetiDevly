import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe, peutGerer } from '@/lib/groupes';

// GET /api/groupes/[id]/canaux : les canaux d'un groupe (réservé aux membres)
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

    if ((await roleDansGroupe(groupeId, session.id)) === null) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT id, nom, sujet, cree_le FROM canaux WHERE groupe_id = $1 ORDER BY id`,
      [groupeId]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des canaux :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

const canalSchema = z.object({
  nom: z.string().trim().min(2).max(40),
  sujet: z.string().trim().max(200).optional(),
});

// POST /api/groupes/[id]/canaux : créer un canal (propriétaire ou admin)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const groupeId = lireId((await params).id);
  if (groupeId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = canalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  try {
    if (!peutGerer(await roleDansGroupe(groupeId, session.id))) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO canaux (groupe_id, nom, sujet, createur_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nom, sujet, cree_le`,
      [groupeId, parsed.data.nom, parsed.data.sujet ?? null, session.id]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    // 23505 = un canal de ce nom existe déjà dans ce groupe
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ success: false, error: 'Ce canal existe déjà dans ce groupe' }, { status: 409 });
    }
    console.error('Erreur lors de la création du canal :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}