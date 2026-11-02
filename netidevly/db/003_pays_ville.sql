BEGIN;

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS pays  TEXT CHECK (char_length(pays)  <= 60),
  ADD COLUMN IF NOT EXISTS ville TEXT CHECK (char_length(ville) <= 60);

ALTER TABLE groupes
  ADD COLUMN IF NOT EXISTS pays  TEXT CHECK (char_length(pays)  <= 60),
  ADD COLUMN IF NOT EXISTS ville TEXT CHECK (char_length(ville) <= 60);

COMMIT;