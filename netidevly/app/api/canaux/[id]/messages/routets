import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { lireId, roleDansGroupe } from '@/lib/groupes';

// Pour un canal : le groupe auquel il appartient, ou null si le canal n'existe pas
async function groupeDuCanal(canalId: number): Promise<number | null> {
  const r = await pool.query(`SELECT groupe_id FROM canaux WHERE id = $1`, [canalId]);
  return r.rows.length > 0 ? r.rows[0].groupe_id : null;
}

// GET /api/canaux/[id]/messages : les messages d'un canal, du plus récent au plus ancien
// Pagination : ?avant=ID_DU_PLUS_ANCIEN_MESSAGE_DEJA_VU (50 messages par page)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  try {
    const canalId = lireId((await params).id);
    if (canalId === null) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const avantBrut = new URL(request.url).searchParams.get('avant');
    let avant: number | null = null;
    if (avantBrut !== null) {
      avant = lireId(avantBrut);
      if (avant === null) {
        return NextResponse.json({ success: false, error: 'Paramètre avant invalide' }, { status: 400 });
      }
    }

    const groupeId = await groupeDuCanal(canalId);
    if (groupeId === null) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    if ((await roleDansGroupe(groupeId, session.id)) === null) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT m.id, m.contenu, m.code, m.langage_code, m.cree_le,
              u.id AS auteur_id, u.pseudo, u.nom_affiche, u.est_verifie
         FROM messages_canal m
         LEFT JOIN utilisateurs u ON u.id = m.auteur_id
        WHERE m.canal_id = $1 AND ($2::int IS NULL OR m.id < $2::int)
        ORDER BY m.id DESC
        LIMIT 50`,
      [canalId, avant]
    );

    const dernier = result.rows.length > 0 ? result.rows[result.rows.length - 1].id : null;
    return NextResponse.json(
      { success: true, data: result.rows, prochain: dernier },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture des messages du canal :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}

const messageSchema = z.object({
  contenu: z.string().trim().min(1).max(2000),
  code: z.string().max(10000).optional(),
  langage_code: z.string().trim().max(30).optional(),
});

// POST /api/canaux/[id]/messages : écrire dans un canal (réservé aux membres du groupe)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  const canalId = lireId((await params).id);
  if (canalId === null) {
    return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 });
  }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
  }
  const { contenu, langage_code } = parsed.data;
  const code = parsed.data.code?.trim() ? parsed.data.code : null;

  try {
    const groupeId = await groupeDuCanal(canalId);
    if (groupeId === null) {
      return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
    }
    if ((await roleDansGroupe(groupeId, session.id)) === null) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO messages_canal (canal_id, auteur_id, contenu, code, langage_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, canal_id, contenu, code, langage_code, cree_le`,
      [canalId, session.id, contenu, code, langage_code ?? null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}