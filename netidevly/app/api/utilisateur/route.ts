import { NextResponse } from 'next/server';
import pool from '@/db/db';

// Route GET : Récupérer les utilisateurs
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM utilisateurs;');
    client.release();

    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur de connexion à la base de données :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Route POST : Ajouter un nouvel utilisateur
export async function POST(request: Request) {
  try {
    const { nom, email, mot_de_passe } = await request.json();
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES ($1, $2, $3) RETURNING *;',
      [nom, email, mot_de_passe]
    );
    client.release();

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Route PATCH : Mettre à jour partiellement un utilisateur
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { nom, email, mot_de_passe } = await request.json();
    const client = await pool.connect();

    // On met à jour uniquement les champs fournis (en gardant les anciens si le champ est omis)
    const result = await client.query(
      `UPDATE utilisateurs 
       SET nom = COALESCE($1, nom), 
           email = COALESCE($2, email), 
           mot_de_passe = COALESCE($3, mot_de_passe) 
       WHERE id = $4 
       RETURNING *;`,
      [nom || null, email || null, mot_de_passe || null, id]
    );

    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Route DELETE : Supprimer un utilisateur
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const client = await pool.connect();
    const result = await client.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING *;', [id]);
    client.release();
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur :', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}