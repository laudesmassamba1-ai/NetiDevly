import pool from '@/db/db';

// Vrai si l'utilisateur fait partie de la conversation
export async function estMembreConversation(
  conversationId: number,
  utilisateurId: number
): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM membres_conversations WHERE conversation_id = $1 AND utilisateur_id = $2`,
    [conversationId, utilisateurId]
  );
  return r.rows.length > 0;
}