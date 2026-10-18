import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe, peutGerer } from '@/lib/groupes';

const roleSchema = z.object({
  role: z.enum(['admin', 'membre']),
});

// PATCH /api/groupes/[id]/membres/[utilisateurId] : changer le rôle d'un membre (propriétaire seulement)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; utilisateurId: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const p = await params;
  const groupeId = lireId(p.id);
  const cibleId = lireId(p.utilisateurId);
  if (groupeId === null || cibleId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  try {
    const monRole = await roleDansGroupe(groupeId, session.id);
    if (monRole !== 'proprietaire') {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }
    if (cibleId === session.id) {
      return NextResponse.json({ success: false, error: 'Tu ne peux pas changer ton propre rôle' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE membres_groupes SET role = $3
        WHERE groupe_id = $1 AND utilisateur_id = $2
        RETURNING utilisateur_id, role`,
      [groupeId, cibleId, parsed.data.role]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Membre introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors du changement de rôle :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// DELETE /api/groupes/[id]/membres/[utilisateurId] : retirer un membre du groupe
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; utilisateurId: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const p = await params;
    const groupeId = lireId(p.id);
    const cibleId = lireId(p.utilisateurId);
    if (groupeId === null || cibleId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const monRole = await roleDansGroupe(groupeId, session.id);
    if (!peutGerer(monRole)) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    const roleCible = await roleDansGroupe(groupeId, cibleId);
    if (roleCible === null) {
      return NextResponse.json({ success: false, error: 'Membre introuvable' }, { status: 404 });
    }
    // Règles : on ne retire jamais le propriétaire ; un admin ne peut retirer qu'un simple membre
    if (roleCible === 'proprietaire' || (roleCible === 'admin' && monRole !== 'proprietaire')) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    await pool.query(
      `DELETE FROM membres_groupes WHERE groupe_id = $1 AND utilisateur_id = $2`,
      [groupeId, cibleId]
    );
    return NextResponse.json({ success: true, message: 'Membre retiré' }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors du retrait du membre :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}