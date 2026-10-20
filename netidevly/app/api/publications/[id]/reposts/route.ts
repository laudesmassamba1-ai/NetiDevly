import { NextResponse } from 'next/server';
import pool from '@/db/db';
import { lireSession } from '@/lib/session';

//POST app/api/publications/[id]/repost : reposter une publication

export async function POST (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    const session = await lireSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
    }

    const {id}= await params;
    const publicationId= Number(id);
    if (!Number.isInteger(publicationId)|| publicationId<=0) {
        return NextResponse.json(
            {success: false, error: 'identifiant invalide'},
            {status: 400}
        );
    }

    try{
        const result = await pool.query(
            `insert into reposts (publication_id, utilisateur_id)
            values ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING publication_id`,
            [publicationId, session.id]
        );

        if (result.rows.length===0) {
            return NextResponse.json(
                {success: false, error: 'publication deja respotee'},
                {status: 409}
            );
        }
        return NextResponse.json(
            {success: true, message: 'publication repostee'},
            {status: 201}
        );
    }catch (error){
        if ((error as {code?: string}).code === '23503') {
            return NextResponse.json(
                {success: false, error: 'publication introuvable'},
                {status: 404}
            );
        }

        console.error('errur lors du repost :', error);
        return NextResponse.json(
            {success: false, error: 'erreur interne'},
            {status: 500}
        );
    }


}