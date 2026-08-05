-- ============================================================================
-- PROYECTO BIBLIOTECA DE ALABANZAS - ESQUEMA DEFINITIVO (SPRINT 2)
-- ============================================================================
-- Autor: Equipo de Desarrollo
-- Motor: PostgreSQL 14+
-- Descripción: Esquema relacional con soporte para RBAC, control editorial 
--              (borradores), repertorios dinámicos y bitácora de auditoría.
-- ============================================================================


-- ============================================================================
-- 1. TIPOS ENUMERADOS (Catálogos y Estados del Sistema)
-- ============================================================================

CREATE TYPE user_role     AS ENUM ('Admin', 'Usuario');
CREATE TYPE user_status   AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
CREATE TYPE song_category AS ENUM ('Alabanza', 'Adoracion');
CREATE TYPE song_status   AS ENUM ('Pendiente', 'Aprobado', 'Borrador');

ALTER TYPE user_role     OWNER TO admin;
ALTER TYPE user_status   OWNER TO admin;
ALTER TYPE song_category OWNER TO admin;
ALTER TYPE song_status   OWNER TO admin;


-- ============================================================================
-- 2. MÓDULO DE USUARIOS Y SEGURIDAD
-- ============================================================================

CREATE TABLE users (
    id                     SERIAL                   PRIMARY KEY,
    email                  VARCHAR(255)             NOT NULL UNIQUE,
    password_hash          VARCHAR(255)             NOT NULL,
    name                   VARCHAR(255)             NOT NULL,
    birth_date             DATE                     NOT NULL,
    phone                  VARCHAR(20),
    area                   VARCHAR(100),            -- Ej: músico, cantor, director, sonido
    role                   user_role                NOT NULL DEFAULT 'Usuario'::user_role,
    status                 user_status              NOT NULL DEFAULT 'Pendiente'::user_status,
    reset_password_token   VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users OWNER TO admin;


-- ============================================================================
-- 3. MÓDULO DEL CATÁLOGO DE CANCIONES Y ETIQUETAS
-- ============================================================================

CREATE TABLE songs (
    id           SERIAL                   PRIMARY KEY,
    title        VARCHAR(255)             NOT NULL,
    author       VARCHAR(255)             NOT NULL,
    version      VARCHAR(100),
    original_key VARCHAR(10)              NOT NULL,
    tempo        INTEGER,
    category     song_category            NOT NULL,
    status       song_status              NOT NULL DEFAULT 'Aprobado'::song_status,
    content      TEXT                     NOT NULL,
    video_link   VARCHAR(500),
    created_by   INTEGER                  REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE songs OWNER TO admin;

-- Índices de búsqueda frecuente en el catálogo
CREATE INDEX idx_songs_title  ON songs (title);
CREATE INDEX idx_songs_author ON songs (author);


CREATE TABLE themes (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

ALTER TABLE themes OWNER TO admin;


CREATE TABLE song_themes (
    song_id  INTEGER NOT NULL REFERENCES songs(id)  ON DELETE CASCADE,
    theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    PRIMARY KEY (song_id, theme_id)
);

ALTER TABLE song_themes OWNER TO admin;


-- ============================================================================
-- 4. MÓDULO DE GESTIÓN DE REPERTORIOS (SETLISTS)
-- ============================================================================

CREATE TABLE setlists (
    id         SERIAL                   PRIMARY KEY,
    name       VARCHAR(255)             NOT NULL,
    event_date DATE,
    user_id    INTEGER                  REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE setlists OWNER TO admin;


CREATE TABLE setlist_songs (
    id             SERIAL                   PRIMARY KEY,
    setlist_id     INTEGER                  REFERENCES setlists(id) ON DELETE CASCADE,
    song_id        INTEGER                  REFERENCES songs(id)    ON DELETE CASCADE,
    transposed_key VARCHAR(10),
    sort_order     INTEGER                  NOT NULL DEFAULT 0,
    group_name     VARCHAR(50),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE setlist_songs OWNER TO admin;


-- ============================================================================
-- 5. MÓDULO DE AUDITORÍA Y TRAZABILIDAD (AUDIT TRAIL)
-- ============================================================================

CREATE TABLE song_audit_logs (
    id              SERIAL                   PRIMARY KEY,
    song_id         INTEGER                  NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id         INTEGER                  REFERENCES users(id)          ON DELETE SET NULL,
    action          VARCHAR(50)              NOT NULL, -- Ej: 'CREACION', 'EDICION', 'CAMBIO_ESTADO'
    previous_status song_status,
    new_status      song_status,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE song_audit_logs OWNER TO admin;

-- Índice para optimizar consultas de línea de tiempo por canción
CREATE INDEX idx_song_audit_logs_song_id ON song_audit_logs (song_id);