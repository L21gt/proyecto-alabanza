import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSongs, type SongFilters } from '../services/songs.service';
import type { Song } from '../types';
import './Catalogo.css';

const Catalogo: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de Filtros y Búsqueda (Se agrega 'author')
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: '', original_key: '', author: '' });
  
  // Estado de Paginación
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1, totalItems: 0 });
  
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  // Limpieza de sesión y redirección por expiración de credenciales
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  // Manejo de retraso (debounce) para optimizar peticiones de búsqueda principal e input de autor
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm, filters.author]);

  // Actualización de estado al modificar filtros (ahora soporta inputs y selects)
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  // Petición asíncrona para la obtención de registros paginados y filtrados
  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      setError('');
      try {
        const queryFilters: SongFilters = {
          search: debouncedSearchTerm,
          category: filters.category,
          author: filters.author, // Se inyecta el nuevo filtro de autor
          original_key: filters.original_key,
          page: page,
          limit: 24
        };
        
        const data = await getSongs(queryFilters);
        setSongs(data.songs);
        
        if (data.pagination) {
          setPagination(data.pagination);
        }
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
  }, [debouncedSearchTerm, filters.category, filters.original_key, filters.author, page, handleLogout]);

  return (
    <div className="catalogo-container">
      <header className="catalogo-header">
        <h2 className="catalogo-title">Catálogo de Canciones</h2>
        <button className="btn-primary" onClick={() => navigate('/cancion/nueva')}>
          {userRole === 'Admin' ? '+ Agregar Canción' : '+ Sugerir Canción'}
        </button>
      </header>

      <div className="catalogo-layout">
        {/* Panel lateral de filtrado avanzado */}
        <aside className="filters-sidebar">
          <h3>Filtros</h3>
          
          <div className="filter-group">
            <label>Búsqueda General</label>
            <input
              type="text"
              className="search-input"
              placeholder="Títulos o Temas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Autor / Artista</label>
            <input
              type="text"
              name="author"
              className="search-input"
              placeholder="Ej. Marcos Witt..."
              value={filters.author}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Categoría</label>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">Todas</option>
              <option value="Alabanza">Alabanza</option>
              <option value="Adoracion">Adoración</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Tonalidad</label>
            <select name="original_key" value={filters.original_key} onChange={handleFilterChange}>
              <option value="">Cualquiera</option>
              <optgroup label="Mayores">
                {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </optgroup>
              <optgroup label="Menores">
                {['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'].map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </aside>

        {/* Vista principal de canciones en formato de lista compacta */}
        <main className="catalogo-main">
          {loading ? (
            <div className="loading-container">Cargando catálogo...</div>
          ) : error ? (
            <div className="error-message-container">{error}</div>
          ) : songs.length === 0 ? (
            <p className="empty-catalog-message">No se encontraron canciones con estos filtros.</p>
          ) : (
            <>
              <div className="songs-list">
                <div className="songs-list-header">
                  <span>Título / Autor</span>
                  <span>Tonalidad</span>
                  <span>Categoría</span>
                  <span>Acción</span>
                </div>
                {songs.map((song) => (
                  <div 
                    key={song.id} 
                    className="song-list-item" 
                    onClick={() => navigate(`/cancion/${song.id}`)}
                  >
                    <div className="song-item-info">
                      <h4 className="song-item-title">{song.title}</h4>
                      <span className="song-item-author">{song.author}</span>
                    </div>
                    <div className="song-item-key">
                      <span className="badge-key">{song.original_key}</span>
                    </div>
                    <div className="song-item-category">
                      <span>{song.category}</span>
                    </div>
                    <div className="song-item-action">
                      <span className="action-link">Ver &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Controles de paginación */}
              {pagination.totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    className="btn-secondary" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                  >
                    &laquo; Anterior
                  </button>
                  <span className="page-indicator">
                    Página {pagination.currentPage} de {pagination.totalPages} (Total: {pagination.totalItems})
                  </span>
                  <button 
                    className="btn-secondary" 
                    disabled={page === pagination.totalPages} 
                    onClick={() => setPage(p => p + 1)}
                  >
                    Siguiente &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Catalogo;