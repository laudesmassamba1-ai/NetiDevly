import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

const groupeSchema = z.object({
  nom: z.string().trim().min(3).max(60),
  description: z.string().trim().max(500).optional(),
  categorie: z.string().trim().max(40).optional(),
  icone: z.string().trim().max(40).optional(),
  pays: z.string().trim().min(2).max(60).optional(),
  ville: z.string().trim().min(2).max(60).optional(),
});

// GET /api/groupes : la liste des groupes (avec le nombre de membres et mon rôle)
export async function GET(request: Request) {
  const session = await lireSession();
  // Filtres facultatifs : /api/groupes?pays=Congo&ville=Brazzaville
  const url = new URL(request.url);
  const pays = url.searchParams.get('pays')?.trim() || null;
  const ville = url.searchParams.get('ville')?.trim() || null;

  if ((pays && pays.length > 60) || (ville && ville.length > 60)) {
    return NextResponse.json({ success: false, error: 'Filtre invalide' }, { status: 400 });
  }
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT g.id, g.nom, g.description, g.categorie, g.icone, g.pays, g.ville, g.cree_le,
              (SELECT count(*)::int FROM membres_groupes m WHERE m.groupe_id = g.id) AS nb_membres,
              (SELECT m.role FROM membres_groupes m
                WHERE m.groupe_id = g.id AND m.utilisateur_id = $1)                  AS mon_role
         FROM groupes g
        WHERE ($2::text IS NULL OR lower(g.pays)  = lower($2::text))
        AND ($3::text IS NULL OR lower(g.ville) = lower($3::text))
        ORDER BY nb_membres DESC, g.id DESC
        LIMIT 100`,
      [session.id, pays, ville]
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
  const { nom, description, categorie, icone, pays, ville } = parsed.data;

  // Transaction : le groupe, son propriétaire et le canal "general" ensemble, ou rien
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const g = await client.query(
      `INSERT INTO groupes (nom, description, categorie, icone, pays, ville, createur_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nom, description, categorie, icone, pays, ville, cree_le`,
      [nom, description ?? null, categorie ?? null, icone ?? null, pays ?? null, ville ?? null, session.id]
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