// ============================================================
//  DEVNET — supabase-config.js
//  Configuration Supabase + gestion auth globale
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = "https://lrbefygqxrhkidqruqhg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYmVmeWdxeHJoa2lkcXJ1cWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjM5MzQsImV4cCI6MjA4OTIzOTkzNH0.EOiMIU655-8ET3pnzKT1bKByglTo57UgdW9AJfnx5xg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Stockage de session dans localStorage pour persistance
    storage: window.localStorage,
    // Détecter automatiquement le callback OAuth dans l'URL
    detectSessionInUrl: true,
    // Rafraîchissement automatique du token
    autoRefreshToken: true,
    persistSession: true,
  }
});

// ── Utilitaire : URL de base dynamique ──
// Fonctionne sur GitHub Pages, Netlify, localhost, partout
export function getBaseUrl() {
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
}

// ── Utilitaire : récupérer ou créer le profil utilisateur ──
export async function getOrCreateProfile(user) {
  // Chercher le profil existant
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return { profile, isNew: false };

  // Profil inexistant → créer (cas Google OAuth)
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const prenom = fullName.split(' ')[0] || user.email?.split('@')[0] || 'Dev';
  const basePs = (user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g,'');

  // Rendre le pseudo unique
  let pseudo = basePs;
  let suffix = 0;
  while (true) {
    const { data: existing } = await supabase
      .from('users').select('id').eq('pseudo', pseudo).single();
    if (!existing) break;
    suffix++;
    pseudo = basePs + suffix;
  }

  const avatarColors = ['av-lime','av-cyan','av-pink','av-orange','av-violet'];
  const avatar_color = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  const { data: newProfile } = await supabase.from('users').upsert({
    id: user.id,
    prenom,
    pseudo,
    email: user.email,
    filiere: '',
    niveau: '',
    langages: [],
    avatar_color,
    bio: '',
  }).select().single();

  return { profile: newProfile, isNew: true };
  }

