import { NextResponse } from 'next/server';
import pool from '@/db/db';

// Route PATCH : Mettre à jour une compétence d'un utilisateur spécifique
export async function PUT(
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
    const { utilisateur_id, competence_id } = await request.json();

    // On met à jour tous les champs
    const result = await pool.query(
      `UPDATE utilisateurs_competences
       SET utilisateur_id = COALESCE($1, utilisateur_id), 
           competence_id = COALESCE($2, competence_id)
       WHERE utilisateur_id = $1 AND (select id from utilisateurs where id = $1)
       RETURNING utilisateur_id, competence_id;`,
      [utilisateur_id || null, competence_id || null]
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
                {success: false, error: 'cette combinaison utilisateur-compétence est déjà utilisée'},
                {status: 409}
            );
        }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}