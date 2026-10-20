-- Migration 002 : rôle administrateur + notifications de commentaire
-- À exécuter UNE FOIS dans le SQL Editor de Supabase (et en local).
BEGIN;

-- 1. Rôle administrateur (pour la modération et la vérification des comptes)
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS est_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Autoriser le type de notification 'commentaire'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'abonnement', 'mention', 'message', 'commentaire'));

COMMIT;

-- 3. Te donner le rôle admin (remplace 'ton_pseudo' par TON pseudo), à lancer à part :
-- UPDATE utilisateurs SET est_admin = true WHERE pseudo = 'ton_pseudo';
