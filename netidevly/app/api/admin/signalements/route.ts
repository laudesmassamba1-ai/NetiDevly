import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { estAdmin } from '@/lib/admin';

// GET /api/admin/signalements?statut=en_attente : les signalements à modérer (admin)
export async function GET(request: Request) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }
  if (!(await estAdmin(session.id))) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  const statut = new URL(request.url).searchParams.get('statut') ?? 'en_attente';
  if (!['en_attente', 'traite', 'rejete'].includes(statut)) {
    return NextResponse.json({ success: false, error: 'Paramètre statut invalide' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT s.id, s.motif, s.statut, s.cree_le,
              s.publication_id, left(p.contenu, 200) AS extrait,
              a.id AS auteur_id, a.pseudo AS auteur_pseudo,
              r.id AS signaleur_id, r.pseudo AS signaleur_pseudo
         FROM signalements s
         JOIN publications p ON p.id = s.publication_id
         JOIN utilisateurs a ON a.id = p.auteur_id
         JOIN utilisateurs r ON r.id = s.signaleur_id
        WHERE s.statut = $1
        ORDER BY s.id ASC
        LIMIT 50`,
      [statut]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des signalements :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
