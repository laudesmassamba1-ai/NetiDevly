import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const estSupabase = connectionString?.includes('supabase') ?? false;

const cache = globalThis as unknown as { pgPool?: Pool };

const pool =
  cache.pgPool ??
  new Pool({
    connectionString,
    ssl: estSupabase ? { rejectUnauthorized: false } : false,
    max: 5,
  });

pool.on('error', (error) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL :', error);
});

if (process.env.NODE_ENV !== 'production') {
  cache.pgPool = pool;
}

export default pool;