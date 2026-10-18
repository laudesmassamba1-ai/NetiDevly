import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId } from '@/lib/groupes';

const signalementSchema = z.object({
  motif: z.string().trim().min(3).max(500),
});

// POST /api/publications/[id]/signalement : signaler une publication
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const publicationId = lireId((await params).id);
  if (publicationId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = signalementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  try {
    // La publication doit exister, et on ne signale pas la sienne
    const pub = await pool.query(`SELECT auteur_id FROM publications WHERE id = $1`, [publicationId]);
    if (pub.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Publication introuvable' }, { status: 404 });
    }
    if (pub.rows[0].auteur_id === session.id) {
      return NextResponse.json(
        { success: false, error: 'Tu ne peux pas signaler ta propre publication' },
        { status: 400 }
      );
    }

    // Un seul signalement "en attente" par personne et par publication
    const result = await pool.query(
      `INSERT INTO signalements (signaleur_id, publication_id, motif)
       SELECT $1, $2, $3
        WHERE NOT EXISTS (
              SELECT 1 FROM signalements
               WHERE signaleur_id = $1 AND publication_id = $2 AND statut = 'en_attente')
       RETURNING id, publication_id, motif, statut, cree_le`,
      [session.id, publicationId, parsed.data.motif]
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tu as déjà signalé cette publication' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors du signalement :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}