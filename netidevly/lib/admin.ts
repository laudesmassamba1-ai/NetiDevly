import pool from '@/db/db';

// Renvoie true si l'utilisateur a le rôle administrateur (colonne est_admin).
// À appeler juste après lireSession() dans les routes /api/admin/... : sinon 403.
export async function estAdmin(utilisateurId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT est_admin FROM utilisateurs WHERE id = $1`,
    [utilisateurId]
  );
  return result.rows[0]?.est_admin === true;
}
