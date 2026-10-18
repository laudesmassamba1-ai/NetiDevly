import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/stories : les stories encore actives (24 h) de moi et des personnes que je suis
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT s.id, s.contenu, s.cree_le, s.expire_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie
         FROM stories s
         JOIN utilisateurs u ON u.id = s.auteur_id
        WHERE s.expire_le > now()
          AND (s.auteur_id = $1
               OR s.auteur_id IN (SELECT suivi_id FROM abonnements WHERE abonne_id = $1))
        ORDER BY s.cree_le DESC
        LIMIT 100`,
      [session.id]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des stories :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

const storySchema = z.object({
  contenu: z.string().trim().min(1).max(500),
});

// POST /api/stories : publier une story (elle expire toute seule après 24 h)
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
  const parsed = storySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `INSERT INTO stories (auteur_id, contenu)
       VALUES ($1, $2)
       RETURNING id, contenu, cree_le, expire_le`,
      [session.id, parsed.data.contenu]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la story :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}