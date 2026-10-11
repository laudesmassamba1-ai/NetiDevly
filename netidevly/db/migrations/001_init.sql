BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

-- Niveau 0 : aucune clé étrangère

-- 1. utilisateurs
CREATE TABLE utilisateurs (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email               CITEXT NOT NULL UNIQUE,
    pseudo              CITEXT NOT NULL UNIQUE,
    nom_affiche         TEXT NOT NULL,
    mot_de_passe_hache  TEXT NOT NULL,
    type_compte         TEXT NOT NULL DEFAULT 'etudiant'
                        CHECK (type_compte IN ('etudiant', 'pro')),
    est_verifie         BOOLEAN NOT NULL DEFAULT false,
    bio                 VARCHAR(255),
    theme_banniere      TEXT,
    filiere             TEXT,
    niveau_etude        TEXT DEFAULT 'L1',
    objectif_hebdo      INTEGER NOT NULL DEFAULT 5
                        CHECK (objectif_hebdo IN (3, 5, 7, 10)),
    gels_serie          INTEGER NOT NULL DEFAULT 0 CHECK (gels_serie >= 0),
    cree_le             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. competences
CREATE TABLE competences (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom  CITEXT NOT NULL UNIQUE
);

-- 3. hashtags (nom en minuscules, sans le #)
CREATE TABLE hashtags (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom  CITEXT NOT NULL UNIQUE
);

-- 4. conversations
CREATE TABLE conversations (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mis_a_jour_le  TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_le        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. paliers (10 lignes fixes, remplies par le seed)
CREATE TABLE paliers (
    rang            INTEGER PRIMARY KEY,
    nom             TEXT NOT NULL,
    points_minimum  INTEGER NOT NULL CHECK (points_minimum >= 0)
);

-- 6. badges
CREATE TABLE badges (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    nom          TEXT NOT NULL,
    description  TEXT
);

-- 7. succes
CREATE TABLE succes (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    nom          TEXT NOT NULL,
    description  TEXT
);

-- Niveau 1 : dépendent uniquement du niveau 0

-- 8. utilisateurs_competences
CREATE TABLE utilisateurs_competences (
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    competence_id   INTEGER NOT NULL REFERENCES competences(id)  ON DELETE CASCADE,
    PRIMARY KEY (utilisateur_id, competence_id)
);

-- 9. abonnements (abonne_id suit suivi_id)
CREATE TABLE abonnements (
    abonne_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    suivi_id   INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    cree_le    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (abonne_id, suivi_id),
    CHECK (abonne_id <> suivi_id)
);

-- 10. publications
CREATE TABLE publications (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auteur_id     INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    contenu       TEXT NOT NULL,
    code          TEXT,
    langage_code  TEXT,
    cree_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le    TIMESTAMPTZ            -- vide tant que le post n'a pas été modifié
);

-- 11. stories (colonnes à confirmer avec l'équipe)
CREATE TABLE stories (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auteur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    cree_le    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expire_le  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 12. groupes (liste des catégories et des icônes à fixer avec l'équipe)
CREATE TABLE groupes (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom          TEXT NOT NULL,
    description  TEXT,
    categorie    TEXT,
    icone        TEXT,
    createur_id  INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. demandes_verification
CREATE TABLE demandes_verification (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    statut          TEXT NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
    traite_par      INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
    traite_le       TIMESTAMPTZ            -- vide tant que la demande n'est pas traitée
);

-- 14. evenements_activite (journal des points)
CREATE TABLE evenements_activite (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    points          INTEGER NOT NULL,
    ref_type        TEXT,
    ref_id          INTEGER,               -- pas de clé étrangère : peut viser plusieurs tables
    meta            JSONB,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (utilisateur_id, type, ref_type, ref_id)
);

-- 15. utilisateurs_badges
CREATE TABLE utilisateurs_badges (
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    badge_id        INTEGER NOT NULL REFERENCES badges(id)       ON DELETE CASCADE,
    obtenu_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (utilisateur_id, badge_id)
);

-- 16. utilisateurs_succes
CREATE TABLE utilisateurs_succes (
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    succes_id       INTEGER NOT NULL REFERENCES succes(id)       ON DELETE CASCADE,
    progression     INTEGER NOT NULL DEFAULT 0 CHECK (progression BETWEEN 0 AND 100),
    palier_atteint  TEXT,
    mis_a_jour_le   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (utilisateur_id, succes_id)
);

-- Niveau 2 : dépendent des niveaux 0 et 1

-- 17. publications_hashtags
CREATE TABLE publications_hashtags (
    publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    hashtag_id      INTEGER NOT NULL REFERENCES hashtags(id)     ON DELETE CASCADE,
    PRIMARY KEY (publication_id, hashtag_id)
);

-- 18. reactions (valeurs de type à confirmer : cœur et "+")
CREATE TABLE reactions (
    publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (publication_id, utilisateur_id)
);

-- 19. commentaires
CREATE TABLE commentaires (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    auteur_id       INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    parent_id       INTEGER REFERENCES commentaires(id) ON DELETE CASCADE,
    contenu         TEXT NOT NULL,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. reposts
CREATE TABLE reposts (
    publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (publication_id, utilisateur_id)
);

-- 21. signets
CREATE TABLE signets (
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (utilisateur_id, publication_id)
);

-- 22. signalements
CREATE TABLE signalements (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signaleur_id    INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    motif           TEXT NOT NULL,
    statut          TEXT NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'traite', 'rejete')),
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. membres_groupes
CREATE TABLE membres_groupes (
    groupe_id       INTEGER NOT NULL REFERENCES groupes(id)      ON DELETE CASCADE,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'membre'
                    CHECK (role IN ('proprietaire', 'admin', 'membre')),
    rejoint_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (groupe_id, utilisateur_id)
);

-- 24. canaux
CREATE TABLE canaux (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    groupe_id    INTEGER NOT NULL REFERENCES groupes(id) ON DELETE CASCADE,
    nom          TEXT NOT NULL,
    sujet        TEXT,
    createur_id  INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    cree_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (groupe_id, nom)
);

-- 25. membres_conversations
CREATE TABLE membres_conversations (
    conversation_id      INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    utilisateur_id       INTEGER NOT NULL REFERENCES utilisateurs(id)  ON DELETE CASCADE,
    derniere_lecture_le  TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, utilisateur_id)
);

-- 26. messages_prives
CREATE TABLE messages_prives (
    id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id  INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    expediteur_id    INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    contenu          TEXT NOT NULL,
    cree_le          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Niveau 3 : dépendent des niveaux précédents

-- 27. messages_canal
CREATE TABLE messages_canal (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canal_id      INTEGER NOT NULL REFERENCES canaux(id) ON DELETE CASCADE,
    auteur_id     INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    contenu       TEXT NOT NULL,
    code          TEXT,
    langage_code  TEXT,
    cree_le       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 28. reactions_messages
CREATE TABLE reactions_messages (
    message_prive_id  INTEGER NOT NULL REFERENCES messages_prives(id) ON DELETE CASCADE,
    utilisateur_id    INTEGER NOT NULL REFERENCES utilisateurs(id)    ON DELETE CASCADE,
    emoji             TEXT NOT NULL,
    cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_prive_id, utilisateur_id, emoji)
);

-- 29. notifications
CREATE TABLE notifications (
    id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id   INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,  -- destinataire
    acteur_id        INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,  -- auteur de l'action
    type             TEXT NOT NULL
                     CHECK (type IN ('like', 'abonnement', 'mention', 'message')),
    publication_id   INTEGER REFERENCES publications(id)  ON DELETE CASCADE,
    commentaire_id   INTEGER REFERENCES commentaires(id)  ON DELETE CASCADE,
    conversation_id  INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    lue_le           TIMESTAMPTZ,          -- vide tant que la notification n'est pas lue
    cree_le          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index (colonnes de jointure et de tri)

-- Fil, profil, recherche
CREATE INDEX idx_publications_cree_le        ON publications (cree_le DESC);
CREATE INDEX idx_publications_auteur         ON publications (auteur_id, cree_le DESC);
CREATE INDEX idx_commentaires_publication    ON commentaires (publication_id, cree_le);
CREATE INDEX idx_commentaires_auteur         ON commentaires (auteur_id);
CREATE INDEX idx_reactions_utilisateur       ON reactions (utilisateur_id);
CREATE INDEX idx_reposts_utilisateur         ON reposts (utilisateur_id);
CREATE INDEX idx_signets_utilisateur_date    ON signets (utilisateur_id, cree_le DESC);
CREATE INDEX idx_abonnements_suivi           ON abonnements (suivi_id);
CREATE INDEX idx_utilisateurs_competences_c  ON utilisateurs_competences (competence_id);
CREATE INDEX idx_publications_hashtags_h     ON publications_hashtags (hashtag_id);
CREATE INDEX idx_stories_auteur_expire       ON stories (auteur_id, expire_le);

-- Groupes et messages
CREATE INDEX idx_membres_groupes_utilisateur ON membres_groupes (utilisateur_id);
CREATE INDEX idx_membres_conv_utilisateur    ON membres_conversations (utilisateur_id);
CREATE INDEX idx_messages_prives_conv        ON messages_prives (conversation_id, cree_le DESC);
CREATE INDEX idx_messages_canal_canal        ON messages_canal (canal_id, cree_le DESC);

-- Progression, modération, notifications
CREATE INDEX idx_evenements_utilisateur_date ON evenements_activite (utilisateur_id, cree_le DESC);
CREATE INDEX idx_signalements_statut         ON signalements (statut);
CREATE INDEX idx_notifications_utilisateur   ON notifications (utilisateur_id, cree_le DESC);
CREATE INDEX idx_notifications_non_lues      ON notifications (utilisateur_id, type) WHERE lue_le IS NULL;

-- Une seule demande de vérification en attente par utilisateur
CREATE UNIQUE INDEX uq_demande_verification_en_attente
    ON demandes_verification (utilisateur_id) WHERE statut = 'en_attente';

-- Anti-doublon des notifications (un like et un abonnement ne notifient qu'une fois)
CREATE UNIQUE INDEX uq_notification_like
    ON notifications (utilisateur_id, acteur_id, publication_id) WHERE type = 'like';
CREATE UNIQUE INDEX uq_notification_abonnement
    ON notifications (utilisateur_id, acteur_id) WHERE type = 'abonnement';

COMMIT;