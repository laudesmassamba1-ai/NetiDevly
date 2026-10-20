import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// GET /api/classement?periode=tout|semaine : le top 20 par points, et ma position
export async function GET(request: Request) {
  // 1. QUI ?
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }

  // 2. QUOI ? ?periode= est optionnel (par défaut : tout le temps)
  const periode = new URL(request.url).searchParams.get('periode') ?? 'tout';
  if (periode !== 'tout' && periode !== 'semaine') {
    return NextResponse.json({ success: false, error: 'Paramètre periode invalide' }, { status: 400 });
  }
  const semaine = periode === 'semaine';

  try {
    // 3. Points par utilisateur, puis rang (RANK : deux égalités ont le même rang)
    const classe = `
      WITH t AS (
        SELECT utilisateur_id, sum(points)::int AS points
          FROM evenements_activite
         WHERE ($1::boolean = false OR cree_le >= date_trunc('week', now()))
         GROUP BY utilisateur_id
      ), r AS (
        SELECT utilisateur_id, points,
               RANK() OVER (ORDER BY points DESC)::int AS rang
          FROM t
      )`;

    const [top, moi] = await Promise.all([
      pool.query(
        `${classe}
         SELECT r.rang, r.points, u.id, u.pseudo, u.nom_affiche, u.est_verifie
           FROM r JOIN utilisateurs u ON u.id = r.utilisateur_id
          ORDER BY r.rang ASC, u.id ASC
          LIMIT 20`,
        [semaine]
      ),
      pool.query(
        `${classe}
         SELECT rang, points FROM r WHERE utilisateur_id = $2`,
        [semaine, session.id]
      ),
    ]);

    // 4/5. Liste vide = normal. mon_classement = null si je n'ai aucun point sur la période.
    return NextResponse.json(
      { success: true, data: top.rows, mon_classement: moi.rows[0] ?? null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la lecture du classement :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
