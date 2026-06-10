import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSongs } from '../services/songs.service';
import type { Song } from '../types';
import './Catalogo.css';

const Catalogo: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const data = await getSongs();
        setSongs(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          // Si el token expiró, lo enviamos de vuelta al login
          if (err.message.includes('expirada')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
        } else {
          setError('Ocurrió un error inesperado');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [navigate]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando catálogo...</div>;
  }

  if (error) {
    return (
      <div className="error-message" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="catalogo-container">
      <div className="catalogo-header">
        <h2 className="catalogo-title">Repertorio</h2>
        <button className="btn-primary" onClick={() => navigate('/cancion/nueva')}>
          + Nueva Canción
        </button>
      </div>

      {(!songs || songs.length === 0) ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          No hay canciones en el catálogo. ¡Agrega la primera!
        </p>
      ) : (
        <div className="songs-grid">
          {songs.map((song) => (
            <div key={song.id} className="song-card" onClick={() => navigate(`/cancion/${song.id}`)}>
              <div>
                <h3 className="song-title">{song.title}</h3>
                <p className="song-author">{song.author}</p>
                <div className="song-meta">
                  <span className="badge-key">{song.original_key}</span>
                  <span>{song.category}</span>
                </div>
              </div>
              
              <div className="themes-container">
                {song.themes?.map((theme, index) => (
                  <span key={index} className="theme-tag">
                    #{theme}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalogo;