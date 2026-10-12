import { z } from 'zod';
import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

// Ce que le client a le droit d'envoyer. L'auteur n'y est PAS : il vient de la session.
const publicationSchema = z.object({
  contenu: z.string().trim().min(1).max(2000),
  // Pas de .trim() sur le code : l'indentation du début de ligne compte.
  code: z.string().max(10000).optional(),
  langage_code: z.string().trim().max(30).optional(),
});

// POST /api/publications : créer une publication (avec ses hashtags et ses points)
export async function POST(request: Request) {
  // 1. QUI ? L'identité vient du cookie de session, jamais de l'URL ni du body
  const session = await lireSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Non connecté' },
      { status: 401 }
    );
  }

  // 2. Lire le corps de la requête (un JSON cassé donne 400, pas 500)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalide' },
      { status: 400 }
    );
  }

  // 3. Valider avec zod
  const parsed = publicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
  const { contenu, langage_code } = parsed.data;
  // Un code vide ou fait uniquement d'espaces est enregistré comme "pas de code"
  const code = parsed.data.code?.trim() ? parsed.data.code : null;

  // 4. Extraire les hashtags du contenu (#Python => "python"), sans doublon, 5 au maximum
  const tags = [
    ...new Set(
      [...contenu.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) =>
        m[1].toLowerCase()
      )
    ),
  ].slice(0, 5);

  // 5. Transaction : la publication, ses hashtags et les points sont écrits ensemble, ou pas du tout
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // a. La publication (auteur_id = session.id)
    const pub = await client.query(
      `INSERT INTO publications (auteur_id, contenu, code, langage_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, contenu, code, langage_code, cree_le`,
      [session.id, contenu, code, langage_code ?? null]
    );
    const publication = pub.rows[0];

    // b. Créer les hashtags qui n'existent pas encore (sans erreur si tags est vide)
    await client.query(
      `INSERT INTO hashtags (nom)
       SELECT unnest($1::citext[])
       ON CONFLICT (nom) DO NOTHING`,
      [tags]
    );

    // c. Les lier à la publication
    await client.query(
      `INSERT INTO publications_hashtags (publication_id, hashtag_id)
       SELECT $1, id FROM hashtags WHERE nom = ANY($2::citext[])`,
      [publication.id, tags]
    );

    // d. Les points sont écrits par le serveur, dans la même transaction (10 points : valeur à confirmer)
    await client.query(
      `INSERT INTO evenements_activite (utilisateur_id, type, points, ref_type, ref_id)
       VALUES ($1, 'publication', 10, 'publication', $2)`,
      [session.id, publication.id]
    );

    await client.query('COMMIT');

    // 6. 201 = ligne créée
    return NextResponse.json(
      { success: true, data: { ...publication, hashtags: tags } },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    // Le détail reste dans le terminal du serveur, jamais dans la réponse
    console.error('Erreur lors de la création de la publication :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    );
  } finally {
    // TOUJOURS rendre la connexion au pool
    client.release();
  }
}