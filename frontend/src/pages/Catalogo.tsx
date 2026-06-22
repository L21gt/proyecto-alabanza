import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSongs } from '../services/songs.service';
import type { Song } from '../types';
import './Catalogo.css';

const Catalogo: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state management
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Debounce effect to limit API calls during rapid typing
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Fetch logic dependent on debounced search term
  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getSongs(debouncedSearchTerm);
        setSongs(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          if (err.message.includes('expirada')) {
            handleLogout();
          }
        } else {
          setError('Ocurrió un error inesperado');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, debouncedSearchTerm]);

  return (
    <div className="catalogo-container">
      <header className="catalogo-header">
        <h2 className="catalogo-title">Repertorio</h2>
        
        <div className="header-controls">
          {/* Global Navigation - Accesible para todos los roles */}
          <button 
            onClick={() => navigate('/repertorios')} 
            className="btn-secondary"
          >
            Gestor de Repertorios
          </button>

          <span className="user-role-label">
            Rol actual: <strong className="user-role-highlight">{userRole}</strong>
          </span>
          <button 
            onClick={handleLogout} 
            className="btn-logout"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="toolbar-container">
        {/* Real-time search input */}
        <div className="search-bar-container">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por título, autor o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Admin-only specific actions */}
        {userRole === 'Admin' && (
          <div className="admin-actions-container">
            <button className="btn-primary" onClick={() => navigate('/cancion/nueva')}>
              + Nueva Canción
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-container">Cargando catálogo...</div>
      ) : error ? (
        <div className="error-message-container">{error}</div>
      ) : (!songs || songs.length === 0) ? (
        <p className="empty-catalog-message">
          {debouncedSearchTerm 
            ? 'No se encontraron canciones que coincidan con la búsqueda.' 
            : 'No hay canciones en el catálogo. ¡Agrega la primera!'}
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