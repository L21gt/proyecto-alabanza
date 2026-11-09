-- ============================================================================
-- PROYECTO BIBLIOTECA DE ALABANZAS - ESQUEMA DEFINITIVO (SPRINT 4)
-- ============================================================================

-- ============================================================================
-- 1. TIPOS ENUMERADOS (Catálogos y Estados del Sistema)
-- ============================================================================

CREATE TYPE user_role     AS ENUM ('Admin', 'Usuario');
CREATE TYPE user_status   AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
CREATE TYPE song_category AS ENUM ('Alabanza', 'Adoracion');
CREATE TYPE song_status   AS ENUM ('Pendiente', 'Aprobado', 'Borrador');

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
    area                   VARCHAR(100),
    role                   user_role                NOT NULL DEFAULT 'Usuario'::user_role,
    status                 user_status              NOT NULL DEFAULT 'Pendiente'::user_status,
    reset_password_token   VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 3. MÓDULO DEL CATÁLOGO DE CANCIONES
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
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP WITH TIME ZONE 
);

CREATE INDEX idx_songs_title  ON songs (title);
CREATE INDEX idx_songs_author ON songs (author);

-- ============================================================================
-- 3.1 Módulo de Categorización: Etiquetas de Canciones (Tags)
-- ============================================================================
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE song_tags (
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (song_id, tag_id)
);

-- ============================================================================
-- 3.2 Módulo de Presentación: Estilos de Repertorio (Themes)
-- ============================================================================
CREATE TABLE themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    background_style TEXT,
    text_color VARCHAR(50) DEFAULT '#000000',
    font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 4. MÓDULO DE GESTIÓN DE REPERTORIOS (SETLISTS)
-- ============================================================================

CREATE TABLE setlists (
    id         SERIAL                   PRIMARY KEY,
    name       VARCHAR(255)             NOT NULL,
    event_date DATE,
    user_id    INTEGER                  REFERENCES users(id) ON DELETE SET NULL,
    theme_id   INTEGER                  REFERENCES themes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE setlist_songs (
    id             SERIAL                   PRIMARY KEY,
    setlist_id     INTEGER                  REFERENCES setlists(id) ON DELETE CASCADE,
    song_id        INTEGER                  REFERENCES songs(id)    ON DELETE CASCADE,
    transposed_key VARCHAR(10),
    sort_order     INTEGER                  NOT NULL DEFAULT 0,
    group_name     VARCHAR(50),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 5. MÓDULO DE AUDITORÍA Y TRAZABILIDAD (AUDIT TRAIL)
-- ============================================================================

CREATE TABLE song_audit_logs (
    id              SERIAL                   PRIMARY KEY,
    song_id         INTEGER                  NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id         INTEGER                  REFERENCES users(id)          ON DELETE SET NULL,
    action          VARCHAR(50)              NOT NULL,
    previous_status song_status,
    new_status      song_status,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_song_audit_logs_song_id ON song_audit_logs (song_id);

-- ============================================================================
-- 6. INSERCIÓN DE DATOS INICIALES (ESTILOS VISUALES)
-- ============================================================================

INSERT INTO themes (name, background_style, text_color, font_family) VALUES
('Clásico Blanco', 'none', '#000000', 'Arial, sans-serif'),
('Pergamino Elegante', 'url("/pergamino.png")', '#2c1e16', '"Georgia", serif'),
('Cielo Azul', 'linear-gradient(to bottom, #f0f9ff, #e0f2fe)', '#0369a1', '"Helvetica Neue", Helvetica, Arial, sans-serif'),
('Noche Estrellada', 'linear-gradient(to bottom, #1e293b, #0f172a)', '#f8fafc', '"Courier New", Courier, monospace');