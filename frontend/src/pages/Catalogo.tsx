import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Importamos SongFilters explícitamente como tipo para cumplir con verbatimModuleSyntax
import { getSongs, type SongFilters } from '../services/songs.service';
import type { Song } from '../types';
import './Catalogo.css';

const Catalogo: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: '', original_key: '' });
  
  // Estado de Paginación
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1, totalItems: 0 });
  
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  // useCallback previene que la función se recree en cada render,
  // evitando ciclos infinitos cuando se pasa como dependencia en useEffect.
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  // Efecto de Debounce: Espera 500ms después de que el usuario deja de escribir
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reiniciar a la primera página al realizar una nueva búsqueda
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Manejador genérico para los selectores de filtros
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reiniciar la paginación al cambiar un filtro
  };

  // Efecto principal para obtener los datos del servidor
  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      setError('');
      try {
        // Construimos el payload de filtros para el servicio
        const queryFilters: SongFilters = {
          search: debouncedSearchTerm,
          category: filters.category,
          original_key: filters.original_key,
          page: page,
          limit: 12
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
  }, [debouncedSearchTerm, filters, page, handleLogout]);

  return (
    <div className="catalogo-container">
      <header className="catalogo-header">
        <h2 className="catalogo-title">Catálogo de Canciones</h2>
        <button className="btn-primary" onClick={() => navigate('/cancion/nueva')}>
          {userRole === 'Admin' ? '+ Agregar Canción' : '+ Sugerir Canción'}
        </button>
      </header>

      <div className="catalogo-layout">
        {/* Panel Lateral de Filtros */}
        <aside className="filters-sidebar">
          <h3>Filtros</h3>
          <div className="filter-group">
            <label>Buscar</label>
            <input
              type="text"
              className="search-input"
              placeholder="Títulos o Autores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <option value="C">C</option>
              <option value="C#">C#</option>
              <option value="D">D</option>
              <option value="D#">D#</option>
              <option value="E">E</option>
              <option value="F">F</option>
              <option value="F#">F#</option>
              <option value="G">G</option>
              <option value="G#">G#</option>
              <option value="A">A</option>
              <option value="A#">A#</option>
              <option value="B">B</option>
            </select>
          </div>
        </aside>

        {/* Cuadrícula Principal de Canciones */}
        <main className="catalogo-main">
          {loading ? (
            <div className="loading-container">Cargando catálogo...</div>
          ) : error ? (
            <div className="error-message-container">{error}</div>
          ) : songs.length === 0 ? (
            <p className="empty-catalog-message">No se encontraron canciones con estos filtros.</p>
          ) : (
            <>
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
                  </div>
                ))}
              </div>

              {/* Controles de Paginación */}
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
                    Página {pagination.currentPage} de {pagination.totalPages}
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