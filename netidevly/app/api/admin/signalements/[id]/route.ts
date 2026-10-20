import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { estAdmin } from '@/lib/admin';
import { lireId } from '@/lib/groupes';

const decisionSchema = z.object({
  statut: z.enum(['traite', 'rejete']),
});

// PATCH /api/admin/signalements/[id] : clore un signalement (admin)
// Corps : { "statut": "traite" }  ou  { "statut": "rejete" }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }
  if (!(await estAdmin(session.id))) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  const signalementId = lireId((await params).id);
  if (signalementId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE signalements SET statut = $1
        WHERE id = $2
        RETURNING id, statut, publication_id`,
      [parsed.data.statut, signalementId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Signalement introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors du traitement du signalement :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
