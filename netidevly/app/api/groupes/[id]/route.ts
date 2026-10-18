import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe, peutGerer } from '@/lib/groupes';

// GET /api/groupes/[id] : un groupe (avec le nombre de membres et mon rôle)
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
      `SELECT g.id, g.nom, g.description, g.categorie, g.icone, g.cree_le, g.createur_id,
              (SELECT count(*)::int FROM membres_groupes m WHERE m.groupe_id = g.id) AS nb_membres,
              (SELECT m.role FROM membres_groupes m
                WHERE m.groupe_id = g.id AND m.utilisateur_id = $2)                  AS mon_role
         FROM groupes g
        WHERE g.id = $1`,
      [groupeId, session.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture du groupe :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// Champs modifiables (liste blanche) : tous optionnels
const groupePatchSchema = z.object({
  nom: z.string().trim().min(3).max(60).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categorie: z.string().trim().max(40).nullable().optional(),
  icone: z.string().trim().max(40).nullable().optional(),
});

// PATCH /api/groupes/[id] : modifier le groupe (propriétaire ou admin)
export async function PATCH(
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
  const parsed = groupePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }
  const champs = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
  if (champs.length === 0) {
    return NextResponse.json({ success: false, error: 'Aucun champ à modifier' }, { status: 400 });
  }

  try {
    // Autorisation : seulement le propriétaire ou un admin du groupe
    const role = await roleDansGroupe(groupeId, session.id);
    if (!peutGerer(role)) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    // Colonnes = clés du schéma zod (liste blanche), valeurs en paramètres
    const set = champs.map(([colonne], i) => `${colonne} = $${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE groupes SET ${set} WHERE id = $1
       RETURNING id, nom, description, categorie, icone, cree_le`,
      [groupeId, ...champs.map(([, v]) => v)]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la modification du groupe :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// DELETE /api/groupes/[id] : supprimer le groupe (propriétaire seulement)
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
    if (role !== 'proprietaire') {
      // 404 si le groupe n'existe pas, 403 s'il existe mais qu'on n'en est pas le propriétaire
      const existe = await pool.query(`SELECT 1 FROM groupes WHERE id = $1`, [groupeId]);
      if (existe.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    // Les membres, canaux et messages du groupe sont supprimés avec lui (ON DELETE CASCADE)
    await pool.query(`DELETE FROM groupes WHERE id = $1`, [groupeId]);
    return NextResponse.json({ success: true, message: 'Groupe supprimé' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression du groupe :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}