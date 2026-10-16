import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/moi/competences : mes compétences
export async function GET() {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.nom
         FROM utilisateurs_competences uc
         JOIN competences c ON c.id = uc.competence_id
        WHERE uc.utilisateur_id = $1
        ORDER BY c.nom`,
      [session.id]
    );

    return NextResponse.json(
      { success: true, data: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture de mes compétences :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// Le client envoie la liste COMPLÈTE de ses compétences (par id). 0 à 20 éléments.
const competencesSchema = z.object({
  competence_ids: z.array(z.number().int().positive()).max(20),
});

// PUT /api/moi/competences : remplacer toutes mes compétences par cette liste
export async function PUT(request: Request) {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  // 2. Le corps : { "competence_ids": [1, 4, 7] }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalide' },
      { status: 400 }
    );
  }
  const parsed = competencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
  // Sans doublons
  const ids = [...new Set(parsed.data.competence_ids)];

  // 3. Transaction : on efface l'ancienne liste puis on insère la nouvelle.
  //    Si l'insertion échoue, l'ancienne liste est conservée (ROLLBACK).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM utilisateurs_competences WHERE utilisateur_id = $1`,
      [session.id]
    );

    await client.query(
      `INSERT INTO utilisateurs_competences (utilisateur_id, competence_id)
       SELECT $1, unnest($2::int[])`,
      [session.id, ids]
    );

    // On relit le résultat dans la même transaction pour le renvoyer
    const result = await client.query(
      `SELECT c.id, c.nom
         FROM utilisateurs_competences uc
         JOIN competences c ON c.id = uc.competence_id
        WHERE uc.utilisateur_id = $1
        ORDER BY c.nom`,
      [session.id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { success: true, data: result.rows },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    // 23503 = un id de compétence n'existe pas
    if ((error as { code?: string }).code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Compétence inconnue' },
        { status: 400 }
      );
    }
    console.error('Erreur lors de la mise à jour des compétences :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}