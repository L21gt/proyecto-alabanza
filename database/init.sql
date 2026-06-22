-- ==========================================
-- ESTRUCTURA DEFINITIVA DE LA BASE DE DATOS
-- ==========================================

-- 1. Tipos ENUM
CREATE TYPE user_role AS ENUM ('Admin', 'Usuario');
CREATE TYPE user_status AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
CREATE TYPE song_category AS ENUM ('Alabanza', 'Adoracion');
CREATE TYPE song_status AS ENUM ('Pendiente', 'Aprobado');

-- 2. Tabla de Usuarios (Onboarding y Seguridad)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    phone VARCHAR(20),
    area VARCHAR(100), -- Ej: musico, cantor, director, sonido
    role user_role NOT NULL DEFAULT 'Usuario',
    status user_status NOT NULL DEFAULT 'Pendiente',
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Canciones (Versiones y Sugerencias)
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    version VARCHAR(100), 
    original_key VARCHAR(10) NOT NULL,
    tempo INTEGER,
    category song_category NOT NULL,
    status song_status NOT NULL DEFAULT 'Aprobado',
    content TEXT NOT NULL,
    video_link VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Temas
CREATE TABLE themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 5. Relación Canciones <-> Temas
CREATE TABLE song_themes (
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    theme_id INTEGER REFERENCES themes(id) ON DELETE CASCADE,
    PRIMARY KEY (song_id, theme_id)
);

CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_author ON songs(author);

-- 6. Gestor de Repertorios
CREATE TABLE setlists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_date DATE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE setlist_songs (
    id SERIAL PRIMARY KEY,
    setlist_id INTEGER REFERENCES setlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    transposed_key VARCHAR(10),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);