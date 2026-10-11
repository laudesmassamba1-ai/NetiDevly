import { NextResponse } from 'next/server';
import pool from '@/db/db';


// Route PATCH : Mettre à jour partiellement un utilisateur
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum= Number(id);
    if(!Number.isInteger(idNum)||idNum<=0){
        return NextResponse.json(
           { success: false, error: 'identifiant invalide'},
           {status: 404}
        );
    }
    const { nom, email } = await request.json();

    // On met à jour uniquement les champs fournis (en gardant les anciens si le champ est omis)
    const result = await pool.query(
      `UPDATE utilisateurs 
       SET nom = COALESCE($1, nom), 
           email = COALESCE($2, email)
       WHERE id = $3 
       RETURNING id, nom, email;`,
      [nom || null, email || null, id]
    );

    //client.release();

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 200 });
  }catch (error: any) {
    console.error('Erreur lors de la mise à jour :', error);
     if (error.code==='23505') {
            return NextResponse.json(
                {success: false, error: 'cet email est deja utilise'},
                {status: 409}
            );
        }
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
    const idNum= Number(id);
    if(!Number.isInteger(idNum)||idNum<=0){
        return NextResponse.json(
           { success: false, error: 'identifiant invalide'},
           {status: 404}
        );
    }
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