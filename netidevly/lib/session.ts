import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

// Nom du cookie qui contient le jeton de session
export const NOM_COOKIE = 'session';

// Durée de vie : 7 jours (en secondes)
const DUREE_SECONDES = 60 * 60 * 24 * 7;

// Clé secrète lue dans .env.local (JWT_SECRET).
// Lue au moment de l'appel (pas à l'import) pour ne pas bloquer le build de Next.js.
function lireSecret(): Uint8Array {
  const secretBrut = process.env.JWT_SECRET;
  if (!secretBrut) {
    throw new Error('JWT_SECRET manquant dans .env.local');
  }
  return new TextEncoder().encode(secretBrut);
}

// Options communes du cookie. httpOnly = illisible par le JavaScript du navigateur.
function optionsCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

// 1. Fabriquer un jeton signé qui contient l'id de l'utilisateur (champ "sub")
export async function creerJeton(utilisateurId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(utilisateurId))
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SECONDES}s`)
    .sign(lireSecret());
}

// 2. Poser le cookie de session sur une réponse (après connexion ou inscription)
export function poserCookieSession(reponse: NextResponse, jeton: string): void {
  reponse.cookies.set(NOM_COOKIE, jeton, optionsCookie(DUREE_SECONDES));
}

// 3. Supprimer le cookie de session (déconnexion)
export function supprimerCookieSession(reponse: NextResponse): void {
  reponse.cookies.set(NOM_COOKIE, '', optionsCookie(0));
}

// 4. Savoir qui appelle : renvoie { id } si le cookie est présent ET valide, sinon null.
//    À utiliser en première ligne de chaque route privée.
export async function lireSession(): Promise<{ id: number } | null> {
  const jeton = (await cookies()).get(NOM_COOKIE)?.value;
  if (!jeton) return null;

  try {
    // Vérifie la signature ET la date d'expiration (lance une erreur sinon)
    const { payload } = await jwtVerify(jeton, lireSecret(), {
      algorithms: ['HS256'],
    });

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;

    return { id };
  } catch {
    // Jeton falsifié, expiré ou mal formé => pas de session
    return null;
  }
}