-- ============================================================
-- DevNet : seed.sql (données de départ et de démonstration)
-- À lancer APRÈS 001_init.sql :
--   psql -v ON_ERROR_STOP=1 -d devnet_db -f db/seed.sql
--
-- Le fichier peut être relancé sans danger :
--   - les données de référence (paliers, compétences, hashtags, badges, succès)
--     et les 7 comptes de démo utilisent ON CONFLICT DO NOTHING ;
--   - le contenu de démonstration (publications, likes, commentaires...) n'est
--     inséré QUE si la table publications est vide.
--
-- Comptes de démo : mot de passe commun  Motdepasse123
--   aminata, thabo, chioma, youssef_dev, zainab (vérifiée), marcus, koffi
--   email : <pseudo sans _dev>@devnet.test   (ex. aminata@devnet.test)
--
-- ATTENTION : valeurs de points, noms de paliers, badges et succès = PROPOSITIONS
-- à ajuster avec l'équipe.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Données de référence
-- ------------------------------------------------------------

INSERT INTO paliers (rang, nom, points_minimum) VALUES
    (1,  'Débutant',     0),
    (2,  'Curieux',      100),
    (3,  'Apprenti',     250),
    (4,  'Codeur',       500),
    (5,  'Bâtisseur',    900),
    (6,  'Contributeur', 1400),
    (7,  'Expert',       2100),
    (8,  'Mentor',       3000),
    (9,  'Maître',       4200),
    (10, 'Légende',      6000)
ON CONFLICT DO NOTHING;

INSERT INTO competences (nom) VALUES
    ('JavaScript'), ('TypeScript'), ('Python'), ('React'), ('Next.js'),
    ('Node.js'), ('PostgreSQL'), ('Django'), ('FastAPI'), ('Flutter'),
    ('Docker'), ('Git')
ON CONFLICT DO NOTHING;

INSERT INTO hashtags (nom) VALUES
    ('postgresql'), ('debutant'), ('python'), ('docker'), ('react'),
    ('opensource'), ('afrique'), ('nextjs')
ON CONFLICT DO NOTHING;

INSERT INTO badges (code, nom, description) VALUES
    ('premiere_publication', 'Première publication', 'A publié son premier post.'),
    ('contributeur',         'Contributeur',          'A aidé la communauté en commentant.'),
    ('mentor',               'Mentor',                'Reconnu pour son accompagnement des débutants.')
ON CONFLICT DO NOTHING;

INSERT INTO succes (code, nom, description) VALUES
    ('serie_7_jours',  'Série de 7 jours', 'Être actif 7 jours de suite.'),
    ('premier_projet', 'Premier projet',   'Publier son premier projet.'),
    ('populaire',      'Populaire',        'Recevoir 50 réactions sur ses publications.')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2. Comptes de démo (mot de passe : Motdepasse123)
-- ------------------------------------------------------------

INSERT INTO utilisateurs
    (email, pseudo, nom_affiche, mot_de_passe_hache, type_compte, est_verifie,
     bio, theme_banniere, filiere, niveau_etude, objectif_hebdo)
VALUES
    ('aminata@devnet.test', 'aminata', 'Aminata Diallo', '$2b$10$c9V8t5jZFtDz2XoJsCX5NOKlwojcFi/5zGuiRl2J5E2PJUHXdOLP2', 'etudiant', false,
     'Étudiante en L3 Informatique. J''apprends React et PostgreSQL.', 'ocean', 'Informatique', 'L3', 5),
    ('thabo@devnet.test', 'thabo', 'Thabo Nkosi', '$2b$10$nDNBIefY65trX0NopFRcoe0OJO12Ttpk4Qcf/MDBkiP37v85sdro2', 'etudiant', false,
     'Master en génie logiciel. Passionné de scripts et d''automatisation.', 'forest', 'Génie logiciel', 'M1', 5),
    ('chioma@devnet.test', 'chioma', 'Chioma Eze', '$2b$10$lCZ.FqNTH/WO4dY5wU8YGeM8XfpGdU8DMed1aUXk505j3fb1EFlw6', 'etudiant', false,
     'En L2, je découvre le développement web.', 'sunset', 'Informatique', 'L2', 3),
    ('youssef@devnet.test', 'youssef_dev', 'Youssef Benali', '$2b$10$DGqojpoj64aYaMVteQwc2OemSuNzsA0dQBsQ3HD2XPo.g7qZ3Yv.a', 'pro', false,
     'Développeur backend : FastAPI, Docker, PostgreSQL.', 'ocean', NULL, NULL, 5),
    ('zainab@devnet.test', 'zainab', 'Zainab Ali', '$2b$10$1ANaeTdRuVtjx9ftQ/LmG.o2be6Uq3aw3Vn5zldNhagVqUxWS6F7G', 'pro', true,
     'Lead développeuse et mentor open source.', 'violet', NULL, NULL, 7),
    ('marcus@devnet.test', 'marcus', 'Marcus Obi', '$2b$10$xMQTln5FKXnmpTtp.1v/4eLKCjIdCG8p5ZEt1PkOn5ZJRtqDghUn6', 'pro', false,
     'Ingénieur DevOps. Conteneurs, CI/CD, automatisation.', 'forest', NULL, NULL, 5),
    ('koffi@devnet.test', 'koffi', 'Koffi Mensah', '$2b$10$th0v0jNf16IHnMiNulOjk.ex6EEi8doanrY94YUIcLqGnYxvYN0XS', 'etudiant', false,
     'Étudiant en L2 Informatique. Je construis mes premiers projets.', 'sunset', 'Informatique', 'L2', 7)
ON CONFLICT DO NOTHING;

-- Compétences des comptes de démo
INSERT INTO utilisateurs_competences (utilisateur_id, competence_id)
SELECT u.id, c.id
  FROM (VALUES
        ('aminata', 'React'), ('aminata', 'TypeScript'), ('aminata', 'PostgreSQL'),
        ('thabo', 'Python'), ('thabo', 'Git'),
        ('chioma', 'JavaScript'), ('chioma', 'React'),
        ('youssef_dev', 'Python'), ('youssef_dev', 'FastAPI'), ('youssef_dev', 'Docker'),
        ('zainab', 'TypeScript'), ('zainab', 'Node.js'), ('zainab', 'PostgreSQL'), ('zainab', 'Git'),
        ('marcus', 'Docker'), ('marcus', 'Git'),
        ('koffi', 'JavaScript'), ('koffi', 'Next.js'), ('koffi', 'PostgreSQL')
       ) AS v(pseudo, competence)
  JOIN utilisateurs u ON u.pseudo = v.pseudo
  JOIN competences  c ON c.nom    = v.competence
ON CONFLICT DO NOTHING;

-- Abonnements (abonné -> suivi)
INSERT INTO abonnements (abonne_id, suivi_id)
SELECT a.id, s.id
  FROM (VALUES
        ('aminata', 'zainab'), ('aminata', 'thabo'), ('aminata', 'koffi'),
        ('thabo', 'aminata'), ('thabo', 'zainab'),
        ('chioma', 'aminata'), ('chioma', 'koffi'), ('chioma', 'zainab'),
        ('youssef_dev', 'zainab'), ('youssef_dev', 'marcus'),
        ('zainab', 'youssef_dev'), ('zainab', 'marcus'),
        ('marcus', 'zainab'),
        ('koffi', 'aminata'), ('koffi', 'zainab'), ('koffi', 'thabo')
       ) AS v(abonne, suivi)
  JOIN utilisateurs a ON a.pseudo = v.abonne
  JOIN utilisateurs s ON s.pseudo = v.suivi
ON CONFLICT DO NOTHING;

-- Badges et succès de quelques comptes
INSERT INTO utilisateurs_badges (utilisateur_id, badge_id)
SELECT u.id, b.id
  FROM (VALUES
        ('aminata', 'premiere_publication'), ('koffi', 'premiere_publication'),
        ('zainab', 'premiere_publication'), ('zainab', 'mentor'), ('zainab', 'contributeur'),
        ('thabo', 'premiere_publication')
       ) AS v(pseudo, code)
  JOIN utilisateurs u ON u.pseudo = v.pseudo
  JOIN badges       b ON b.code   = v.code
ON CONFLICT DO NOTHING;

INSERT INTO utilisateurs_succes (utilisateur_id, succes_id, progression, palier_atteint)
SELECT u.id, s.id, v.progression, v.palier
  FROM (VALUES
        ('koffi',   'serie_7_jours',  85, NULL),
        ('aminata', 'serie_7_jours', 100, 'bronze'),
        ('zainab',  'populaire',      60, NULL)
       ) AS v(pseudo, code, progression, palier)
  JOIN utilisateurs u ON u.pseudo = v.pseudo
  JOIN succes       s ON s.code   = v.code
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. Contenu de démonstration (seulement si aucune publication n'existe)
-- ------------------------------------------------------------

DO $seed$
DECLARE
    r   RECORD;
    pid INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM publications) THEN
        RAISE NOTICE 'Des publications existent déjà : contenu de démonstration ignoré.';
        RETURN;
    END IF;

    -- Publications : cle = numéro local, il_y_a = ancienneté
    CREATE TEMP TABLE seed_pub (
        cle INTEGER PRIMARY KEY, pseudo TEXT, contenu TEXT, code TEXT,
        langage TEXT, il_y_a INTERVAL
    ) ON COMMIT DROP;

    INSERT INTO seed_pub VALUES
    (1, 'zainab',
        'Conseil du jour : écrivez vos tests avant de refactorer. Un refactor sans filet, c''est du hasard.',
        NULL, NULL, interval '3 days'),
    (2, 'aminata',
        'Première route API avec Next.js terminée ! Voici comment je lis l''id dans l''URL. #nextjs',
        E'export async function GET(\n  request: Request,\n  { params }: { params: Promise<{ id: string }> },\n) {\n  const { id } = await params;\n  return Response.json({ id });\n}',
        'typescript', interval '2 days'),
    (3, 'koffi',
        'Je débute avec PostgreSQL. Quelle différence entre INNER JOIN et LEFT JOIN ? #postgresql #debutant',
        NULL, NULL, interval '1 day'),
    (4, 'thabo',
        'Petit script Python pour renommer des fichiers en masse. #python',
        E'import os\n\nfor i, nom in enumerate(sorted(os.listdir(".")), start=1):\n    os.rename(nom, f"fichier_{i:03d}.txt")',
        'python', interval '4 days'),
    (5, 'youssef_dev',
        'FastAPI + Docker en 10 minutes : mon guide pour démarrer un projet propre. #python #docker',
        NULL, NULL, interval '5 days'),
    (6, 'chioma',
        'Quelqu''un a un bon cours sur les hooks React ? #react #debutant',
        NULL, NULL, interval '6 hours'),
    (7, 'marcus',
        'Un Dockerfile multi-étapes a réduit mon image de 900 Mo à 120 Mo. #docker',
        E'FROM node:22 AS build\nWORKDIR /app\nCOPY . .\nRUN npm ci && npm run build\n\nFROM node:22-slim\nWORKDIR /app\nCOPY --from=build /app/dist ./dist\nCMD ["node", "dist/index.js"]',
        'dockerfile', interval '2 days 5 hours'),
    (8, 'zainab',
        'Contribuer à l''open source : commencez par la documentation et les issues « good first issue ». #opensource #afrique',
        NULL, NULL, interval '5 days 3 hours'),
    (9, 'aminata',
        'Mon objectif de la semaine : 5 jours de code. Jour 3 validé ! #afrique',
        NULL, NULL, interval '20 hours'),
    (10, 'koffi',
        'Mon premier INSERT avec des paramètres $1, $2 : fini la concaténation de texte ! #postgresql',
        E'INSERT INTO competences (nom) VALUES ($1) RETURNING id, nom;',
        'sql', interval '3 hours');

    CREATE TEMP TABLE seed_pub_ids (cle INTEGER PRIMARY KEY, id INTEGER) ON COMMIT DROP;

    FOR r IN SELECT * FROM seed_pub ORDER BY cle LOOP
        INSERT INTO publications (auteur_id, contenu, code, langage_code, cree_le)
        VALUES ((SELECT id FROM utilisateurs WHERE pseudo = r.pseudo),
                r.contenu, r.code, r.langage, now() - r.il_y_a)
        RETURNING id INTO pid;
        INSERT INTO seed_pub_ids VALUES (r.cle, pid);
    END LOOP;

    -- Hashtags des publications
    INSERT INTO publications_hashtags (publication_id, hashtag_id)
    SELECT p.id, h.id
      FROM (VALUES
            (2, 'nextjs'), (3, 'postgresql'), (3, 'debutant'), (4, 'python'),
            (5, 'python'), (5, 'docker'), (6, 'react'), (6, 'debutant'),
            (7, 'docker'), (8, 'opensource'), (8, 'afrique'), (9, 'afrique'),
            (10, 'postgresql')
           ) AS v(cle, tag)
      JOIN seed_pub_ids p ON p.cle = v.cle
      JOIN hashtags     h ON h.nom = v.tag;

    -- Réactions : 'coeur' ou 'plus' (valeurs à confirmer avec l'équipe)
    INSERT INTO reactions (publication_id, utilisateur_id, type)
    SELECT p.id, u.id, v.type
      FROM (VALUES
            (1, 'aminata', 'coeur'), (1, 'koffi', 'coeur'), (1, 'thabo', 'plus'), (1, 'chioma', 'coeur'),
            (2, 'zainab', 'coeur'), (2, 'koffi', 'plus'), (2, 'thabo', 'coeur'),
            (3, 'thabo', 'coeur'), (3, 'zainab', 'plus'),
            (4, 'aminata', 'coeur'), (4, 'youssef_dev', 'plus'),
            (5, 'zainab', 'coeur'), (5, 'marcus', 'coeur'), (5, 'koffi', 'plus'),
            (6, 'aminata', 'coeur'), (6, 'koffi', 'coeur'),
            (7, 'youssef_dev', 'coeur'), (7, 'zainab', 'coeur'),
            (8, 'koffi', 'coeur'), (8, 'aminata', 'plus'), (8, 'chioma', 'coeur'), (8, 'thabo', 'coeur'),
            (9, 'koffi', 'coeur'), (9, 'zainab', 'coeur'),
            (10, 'zainab', 'coeur'), (10, 'aminata', 'plus')
           ) AS v(cle, pseudo, type)
      JOIN seed_pub_ids p ON p.cle = v.cle
      JOIN utilisateurs u ON u.pseudo = v.pseudo;

    -- Commentaires de premier niveau
    INSERT INTO commentaires (publication_id, auteur_id, contenu, cree_le)
    SELECT p.id, u.id, v.contenu, now() - v.il_y_a
      FROM (VALUES
            (3, 'aminata',
                'INNER JOIN ne garde que les lignes qui ont une correspondance des deux côtés. LEFT JOIN garde toutes les lignes de gauche.',
                interval '22 hours'),
            (6, 'zainab',
                'La doc officielle de React est excellente pour les hooks. Commence par useState puis useEffect.',
                interval '4 hours'),
            (2, 'koffi',
                'Super, merci du partage ! Je regarde ça pour ma propre route.',
                interval '1 day 20 hours'),
            (10, 'aminata',
                'Bravo Koffi ! Les paramètres évitent aussi les injections SQL.',
                interval '2 hours')
           ) AS v(cle, pseudo, contenu, il_y_a)
      JOIN seed_pub_ids p ON p.cle = v.cle
      JOIN utilisateurs u ON u.pseudo = v.pseudo;

    -- Une réponse (commentaire dont le parent est un autre commentaire)
    INSERT INTO commentaires (publication_id, auteur_id, parent_id, contenu, cree_le)
    SELECT c.publication_id,
           (SELECT id FROM utilisateurs WHERE pseudo = 'zainab'),
           c.id,
           '@koffi un schéma avec deux cercles qui se croisent aide beaucoup à visualiser les JOIN.',
           now() - interval '20 hours'
      FROM commentaires c
     WHERE c.contenu LIKE 'INNER JOIN ne garde%';

    -- Signets et reposts
    INSERT INTO signets (utilisateur_id, publication_id)
    SELECT u.id, p.id
      FROM (VALUES ('koffi', 8), ('koffi', 1), ('aminata', 5), ('chioma', 2)) AS v(pseudo, cle)
      JOIN utilisateurs u ON u.pseudo = v.pseudo
      JOIN seed_pub_ids p ON p.cle = v.cle;

    INSERT INTO reposts (publication_id, utilisateur_id)
    SELECT p.id, u.id
      FROM (VALUES (8, 'aminata'), (5, 'koffi')) AS v(cle, pseudo)
      JOIN seed_pub_ids p ON p.cle = v.cle
      JOIN utilisateurs u ON u.pseudo = v.pseudo;

    -- Journal des points : 10 points par publication, 3 par commentaire (valeurs à confirmer)
    INSERT INTO evenements_activite (utilisateur_id, type, points, ref_type, ref_id, cree_le)
    SELECT pub.auteur_id, 'publication', 10, 'publication', pub.id, pub.cree_le
      FROM publications pub;

    INSERT INTO evenements_activite (utilisateur_id, type, points, ref_type, ref_id, cree_le)
    SELECT c.auteur_id, 'commentaire', 3, 'commentaire', c.id, c.cree_le
      FROM commentaires c;

    -- Activité quotidienne (pour la série et la carte de chaleur) : 1 point par jour de connexion
    INSERT INTO evenements_activite (utilisateur_id, type, points, ref_type, ref_id, cree_le)
    SELECT u.id, 'connexion_quotidienne', 1, 'jour',
           to_char(d::date, 'YYYYMMDD')::int, d
      FROM (VALUES ('koffi', 6), ('aminata', 12), ('zainab', 20), ('thabo', 4), ('chioma', 3)) AS v(pseudo, nb_jours)
      JOIN utilisateurs u ON u.pseudo = v.pseudo
      CROSS JOIN LATERAL generate_series(
          date_trunc('day', now()) - ((v.nb_jours - 1) * interval '1 day'),
          date_trunc('day', now()),
          interval '1 day') AS d;

    -- Points « historiques » de démonstration, pour que le classement et les paliers
    -- ne soient pas tous au même niveau (type 'bonus_demo', à supprimer en production)
    INSERT INTO evenements_activite (utilisateur_id, type, points, ref_type, ref_id, cree_le)
    SELECT u.id, 'bonus_demo', v.points, 'demo', 1, now() - interval '30 days'
      FROM (VALUES ('zainab', 2300), ('youssef_dev', 640), ('marcus', 480), ('aminata', 280),
                   ('thabo', 240), ('koffi', 130), ('chioma', 90)) AS v(pseudo, points)
      JOIN utilisateurs u ON u.pseudo = v.pseudo;

    -- Notifications pour koffi (destinataire) : 3 non lues, 1 lue
    INSERT INTO notifications (utilisateur_id, acteur_id, type, publication_id, commentaire_id, lue_le, cree_le)
    SELECT (SELECT id FROM utilisateurs WHERE pseudo = 'koffi'), a.id, 'like', p.id, NULL, NULL, now() - interval '2 hours'
      FROM utilisateurs a, seed_pub_ids p
     WHERE a.pseudo = 'zainab' AND p.cle = 10;

    INSERT INTO notifications (utilisateur_id, acteur_id, type, lue_le, cree_le)
    SELECT (SELECT id FROM utilisateurs WHERE pseudo = 'koffi'), a.id, 'abonnement', NULL, now() - interval '5 hours'
      FROM utilisateurs a WHERE a.pseudo = 'chioma';

    INSERT INTO notifications (utilisateur_id, acteur_id, type, publication_id, commentaire_id, lue_le, cree_le)
    SELECT (SELECT id FROM utilisateurs WHERE pseudo = 'koffi'), c.auteur_id, 'mention', c.publication_id, c.id, NULL, c.cree_le
      FROM commentaires c WHERE c.contenu LIKE '@koffi%';

    INSERT INTO notifications (utilisateur_id, acteur_id, type, publication_id, commentaire_id, lue_le, cree_le)
    SELECT (SELECT id FROM utilisateurs WHERE pseudo = 'koffi'), a.id, 'like', p.id, NULL, now() - interval '1 day', now() - interval '2 days'
      FROM utilisateurs a, seed_pub_ids p
     WHERE a.pseudo = 'thabo' AND p.cle = 3;

    RAISE NOTICE 'Contenu de démonstration inséré.';
END
$seed$;

COMMIT;