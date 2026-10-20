import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';
import { estAdmin } from '@/lib/admin';

// GET /api/admin/verifications?statut=en_attente : les demandes de vérification (admin)
export async function GET(request: Request) {
  // 1. QUI ? connecté ET administrateur
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
  }
  if (!(await estAdmin(session.id))) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  // 2. QUOI ? filtre optionnel (par défaut : les demandes en attente)
  const statut = new URL(request.url).searchParams.get('statut') ?? 'en_attente';
  if (!['en_attente', 'approuvee', 'refusee'].includes(statut)) {
    return NextResponse.json({ success: false, error: 'Paramètre statut invalide' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT d.id, d.statut, d.cree_le, d.traite_le,
              u.id AS utilisateur_id, u.pseudo, u.nom_affiche, u.type_compte, u.bio
         FROM demandes_verification d
         JOIN utilisateurs u ON u.id = d.utilisateur_id
        WHERE d.statut = $1
        ORDER BY d.id ASC
        LIMIT 50`,
      [statut]
    );
    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des demandes de vérification :', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
