import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

const groupeSchema = z.object({
  nom: z.string().trim().min(3).max(60),
  description: z.string().trim().max(500).optional(),
  categorie: z.string().trim().max(40).optional(),
  icone: z.string().trim().max(40).optional(),
});

// GET /api/groupes : la liste des groupes (avec le nombre de membres et mon rôle)
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT g.id, g.nom, g.description, g.categorie, g.icone, g.cree_le,
              (SELECT count(*)::int FROM membres_groupes m WHERE m.groupe_id = g.id) AS nb_membres,
              (SELECT m.role FROM membres_groupes m
                WHERE m.groupe_id = g.id AND m.utilisateur_id = $1)                  AS mon_role
         FROM groupes g
        ORDER BY nb_membres DESC, g.id DESC
        LIMIT 100`,
      [session.id]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des groupes :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

// POST /api/groupes : créer un groupe (le créateur en devient le propriétaire)
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = groupeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }
  const { nom, description, categorie, icone } = parsed.data;

  // Transaction : le groupe, son propriétaire et le canal "general" ensemble, ou rien
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const g = await client.query(
      `INSERT INTO groupes (nom, description, categorie, icone, createur_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nom, description, categorie, icone, cree_le`,
      [nom, description ?? null, categorie ?? null, icone ?? null, session.id]
    );
    const groupe = g.rows[0];

    await client.query(
      `INSERT INTO membres_groupes (groupe_id, utilisateur_id, role)
       VALUES ($1, $2, 'proprietaire')`,
      [groupe.id, session.id]
    );

    await client.query(
      `INSERT INTO canaux (groupe_id, nom, sujet, createur_id)
       VALUES ($1, 'general', 'Discussion générale', $2)`,
      [groupe.id, session.id]
    );

    await client.query('COMMIT');
    return NextResponse.json(
      { success: true, data: { ...groupe, nb_membres: 1, mon_role: 'proprietaire' } },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création du groupe :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  } finally {
    client.release();
  }
}