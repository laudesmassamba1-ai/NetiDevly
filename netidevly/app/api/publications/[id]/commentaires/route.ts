import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

const commentaireSchema = z.object({
  contenu: z.string().trim().min(1).max(1000),
  // Optionnel : l'id du commentaire auquel on répond
  parent_id: z.number().int().positive().optional(),
});

// GET /api/publications/[id]/commentaires : les commentaires d'une publication
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    // Du plus ancien au plus récent ; parent_id permet au front de regrouper les réponses
    const result = await pool.query(
      `SELECT c.id, c.contenu, c.parent_id, c.cree_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie
         FROM commentaires c
         JOIN utilisateurs u ON u.id = c.auteur_id
        WHERE c.publication_id = $1
        ORDER BY c.cree_le ASC, c.id ASC
        LIMIT 200`,
      [idNum]
    );

    return NextResponse.json(
      { success: true, data: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des commentaires :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// POST /api/publications/[id]/commentaires : commenter (ou répondre à un commentaire)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  // 2a. L'id de la publication (URL)
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json(
      { success: false, error: 'Identifiant invalide' },
      { status: 400 }
    );
  }

  // 2b. Le corps
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalide' },
      { status: 400 }
    );
  }
  const parsed = commentaireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
  const { contenu, parent_id } = parsed.data;

  // 3. Transaction : le commentaire + les points ensemble, ou rien
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Si on répond à un commentaire, il doit exister ET appartenir à la même publication
    if (parent_id !== undefined) {
      const parent = await client.query(
        `SELECT 1 FROM commentaires WHERE id = $1 AND publication_id = $2`,
        [parent_id, idNum]
      );
      if (parent.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Commentaire parent introuvable' },
          { status: 404 }
        );
      }
    }

    const ins = await client.query(
      `INSERT INTO commentaires (publication_id, auteur_id, parent_id, contenu)
       VALUES ($1, $2, $3, $4)
       RETURNING id, publication_id, parent_id, contenu, cree_le`,
      [idNum, session.id, parent_id ?? null, contenu]
    );
    const commentaire = ins.rows[0];

    // Points écrits par le serveur (3 points : valeur à confirmer)
    await client.query(
      `INSERT INTO evenements_activite (utilisateur_id, type, points, ref_type, ref_id)
       VALUES ($1, 'commentaire', 3, 'commentaire', $2)`,
      [session.id, commentaire.id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { success: true, data: commentaire },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    // 23503 = la publication n'existe pas
    if ((error as { code?: string }).code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Publication introuvable' },
        { status: 404 }
      );
    }
    console.error('Erreur lors de la création du commentaire :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}