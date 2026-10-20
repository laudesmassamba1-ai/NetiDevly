import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { estAdmin } from '@/lib/admin';
import { lireId } from '@/lib/groupes';

const decisionSchema = z.object({
  statut: z.enum(['approuvee', 'refusee']),
});

// PATCH /api/admin/verifications/[id] : approuver ou refuser une demande (admin)
// Corps : { "statut": "approuvee" }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }
  if (!(await estAdmin(session.id))) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  // 2. QUOI ?
  const demandeId = lireId((await params).id);
  if (demandeId === null) {
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
  const { statut } = parsed.data;

  // 3. Transaction : la décision + (si approuvée) le badge « vérifié », ensemble ou rien
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // On ne traite qu'une demande encore en attente
    const maj = await client.query(
      `UPDATE demandes_verification
          SET statut = $1, traite_par = $2, traite_le = now()
        WHERE id = $3 AND statut = 'en_attente'
        RETURNING id, utilisateur_id, statut, traite_le`,
      [statut, session.id, demandeId]
    );

    // 4. Introuvable ou déjà traitée
    if (maj.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Demande introuvable ou déjà traitée' },
        { status: 404 }
      );
    }

    if (statut === 'approuvee') {
      await client.query(
        `UPDATE utilisateurs SET est_verifie = true WHERE id = $1`,
        [maj.rows[0].utilisateur_id]
      );
    }

    await client.query('COMMIT');
    // 5. Réponse
    return NextResponse.json({ success: true, data: maj.rows[0] }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors du traitement de la demande de vérification :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  } finally {
    client.release();
  }
}
