import pool from '@/db/db';

export type RoleGroupe = 'proprietaire' | 'admin' | 'membre';

// Convertit un id venant de l'URL (du texte) en nombre, ou null s'il est invalide
export function lireId(brut: string): number | null {
  const n = Number(brut);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Le rôle d'un utilisateur dans un groupe, ou null s'il n'en est pas membre
export async function roleDansGroupe(
  groupeId: number,
  utilisateurId: number
): Promise<RoleGroupe | null> {
  const r = await pool.query(
    `SELECT role FROM membres_groupes WHERE groupe_id = $1 AND utilisateur_id = $2`,
    [groupeId, utilisateurId]
  );
  return r.rows.length > 0 ? (r.rows[0].role as RoleGroupe) : null;
}

// Peut gérer le groupe (modifier, créer des canaux, retirer des membres)
export function peutGerer(role: RoleGroupe | null): boolean {
  return role === 'proprietaire' || role === 'admin';
}