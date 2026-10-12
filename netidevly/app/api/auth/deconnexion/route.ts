import { NextResponse } from 'next/server';
import { supprimerCookieSession } from '@/lib/session';

// POST /api/auth/deconnexion
export async function POST() {
  const reponse = NextResponse.json(
    { success: true, message: 'Déconnexion réussie' },
    { status: 200 }
  );

  // Efface le cookie de session
  supprimerCookieSession(reponse);

  return reponse;
}