// ================================================================
//  DEVNET — supabase-config.js
//  ✅ Pas de Google OAuth
//  ✅ Pas de boucle infinie
//  ✅ Gestion d'erreur robuste
// ================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = "https://lrbefygqxrhkidqruqhg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYmVmeWdxeHJoa2lkcXJ1cWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjM5MzQsImV4cCI6MjA4OTIzOTkzNH0.EOiMIU655-8ET3pnzKT1bKByglTo57UgdW9AJfnx5xg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false, // Pas de Google OAuth → pas besoin
  }
});

// ── Récupérer le profil utilisateur ─────────────────────────────
// Utilisé dans les pages protégées après login
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
