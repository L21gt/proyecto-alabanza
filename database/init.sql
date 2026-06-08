-- 1. Creación de tipos ENUM para asegurar la integridad de los datos
CREATE TYPE user_role AS ENUM ('Admin', 'Musico');
CREATE TYPE user_status AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
CREATE TYPE song_category AS ENUM ('Alabanza', 'Adoracion');

-- 2. Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Musico',
    status user_status NOT NULL DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Canciones
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    original_key VARCHAR(10) NOT NULL, -- Ej: "G", "A#m", "Fmaj7"
    tempo INTEGER,                      -- BPM (Beats Por Minuto)
    category song_category NOT NULL,
    content TEXT NOT NULL,              -- Bloque completo de texto (acordes + letra)
    video_link VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Temas (Catálogo: Sanidad, Amor, Liberación, etc.)
CREATE TABLE themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 5. Tabla Intermedia para la relación Muchos a Muchos (Canciones <-> Temas)
CREATE TABLE song_themes (
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    theme_id INTEGER REFERENCES themes(id) ON DELETE CASCADE,
    PRIMARY KEY (song_id, theme_id)
);

-- 6. Índices básicos para optimizar las búsquedas por metadatos
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_author ON songs(author);