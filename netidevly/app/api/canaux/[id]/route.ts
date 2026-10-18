import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe, peutGerer } from '@/lib/groupes';

const canalPatchSchema = z.object({
  nom: z.string().trim().min(2).max(40).optional(),
  sujet: z.string().trim().max(200).nullable().optional(),
});

// PATCH /api/canaux/[id] : modifier un canal (propriétaire ou admin de son groupe)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const canalId = lireId((await params).id);
  if (canalId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = canalPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }
  const champs = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
  if (champs.length === 0) {
    return NextResponse.json({ success: false, error: 'Aucun champ à modifier' }, { status: 400 });
  }

  try {
    // 1. À quel groupe appartient ce canal ?
    const canal = await pool.query(`SELECT groupe_id FROM canaux WHERE id = $1`, [canalId]);
    if (canal.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    // 2. Suis-je propriétaire ou admin de ce groupe ?
    if (!peutGerer(await roleDansGroupe(canal.rows[0].groupe_id, session.id))) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    const set = champs.map(([colonne], i) => `${colonne} = $${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE canaux SET ${set} WHERE id = $1 RETURNING id, groupe_id, nom, sujet, cree_le`,
      [canalId, ...champs.map(([, v]) => v)]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ success: false, error: 'Ce canal existe déjà dans ce groupe' }, { status: 409 });
    }
    console.error('Erreur lors de la modification du canal :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// DELETE /api/canaux/[id] : supprimer un canal (propriétaire ou admin de son groupe)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const canalId = lireId((await params).id);
    if (canalId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const canal = await pool.query(`SELECT groupe_id FROM canaux WHERE id = $1`, [canalId]);
    if (canal.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    if (!peutGerer(await roleDansGroupe(canal.rows[0].groupe_id, session.id))) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    // Les messages du canal sont supprimés avec lui (ON DELETE CASCADE)
    await pool.query(`DELETE FROM canaux WHERE id = $1`, [canalId]);
    return NextResponse.json({ success: true, message: 'Canal supprimé' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression du canal :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}