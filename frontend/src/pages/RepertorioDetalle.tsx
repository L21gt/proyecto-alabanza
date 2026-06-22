import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSetlistById, addSongToSetlist, removeSongFromSetlist } from '../services/setlists.service';
import { getSongs } from '../services/songs.service';
import type { Setlist, Song } from '../types';
import './RepertorioDetalle.css';

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const RepertorioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados del Repertorio (Zona Inferior)
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados del Buscador (Zona Superior)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Mapeo para guardar la tonalidad seleccionada de cada canción en los resultados
  // Estructura: { [songId]: 'D#' }
  const [selectedKeys, setSelectedKeys] = useState<Record<number, string>>({});

  // Carga inicial y refresco del Repertorio
  const fetchSetlistDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSetlistById(id);
      setSetlist(data);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Le indicamos al linter que hacer setState aquí es intencional y seguro (Data Fetching inicial)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSetlistDetails();
  }, [fetchSetlistDetails]);

  // Manejo del Debounce para el buscador
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Ejecución de la búsqueda
  useEffect(() => {
    const search = async () => {
      if (!debouncedSearchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await getSongs(debouncedSearchTerm);
        setSearchResults(results);
        
        // Inicializar el diccionario de tonalidades con la tonalidad original de cada canción
        const initialKeys: Record<number, string> = {};
        results.forEach(song => {
          initialKeys[song.id] = song.original_key;
        });
        setSelectedKeys(prev => ({ ...prev, ...initialKeys }));
      } catch (err) {
        console.error('Error buscando canciones:', err);
      } finally {
        setIsSearching(false);
      }
    };
    search();
  }, [debouncedSearchTerm]);

  // Mutaciones
  const handleAddSong = async (song: Song) => {
    if (!setlist || !id) return;
    
    // El orden será secuencial al final de la lista actual
    const nextOrder = (setlist.songs?.length || 0) + 1;
    const transposedKey = selectedKeys[song.id] || song.original_key;

    try {
      await addSongToSetlist(id, {
        song_id: song.id,
        transposed_key: transposedKey,
        sort_order: nextOrder
      });
      // Limpiamos la búsqueda y recargamos el repertorio
      setSearchTerm('');
      setSearchResults([]);
      await fetchSetlistDetails();
    } catch (err) {
      if (err instanceof Error) alert(`Error al agregar: ${err.message}`);
    }
  };

  const handleRemoveSong = async (songId: number) => {
    if (!id || !window.confirm('¿Seguro que deseas quitar esta canción del repertorio?')) return;
    
    try {
      await removeSongFromSetlist(id, songId);
      await fetchSetlistDetails();
    } catch (err) {
      if (err instanceof Error) alert(`Error al quitar: ${err.message}`);
    }
  };

  if (loading) return <div className="loading-container">Cargando detalles...</div>;
  if (error) return <div className="error-message-container">{error}</div>;
  if (!setlist) return <div className="error-message-container">Repertorio no encontrado</div>;

  return (
    <div className="repertorio-detalle-container">
      <header className="rd-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/repertorios')}>
            &larr; Volver a Repertorios
          </button>
          <h2 className="rd-title">{setlist.name}</h2>
          {setlist.event_date && (
            <p className="rd-date">
              {new Date(setlist.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </header>

      {/* ZONA SUPERIOR: Buscador Fijo */}
      <section className="rd-search-section">
        <h3>Agregar Canciones</h3>
        <input
          type="text"
          className="rd-search-input"
          placeholder="Busca en el catálogo para agregar a este servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {isSearching && <p className="rd-helper-text">Buscando...</p>}
        
        {searchResults.length > 0 && (
          <div className="rd-search-results">
            {searchResults.map(song => (
              <div key={song.id} className="rd-result-card">
                <div className="rd-result-info">
                  <strong>{song.title}</strong>
                  <span>{song.author}</span>
                </div>
                
                <div className="rd-result-actions">
                  <div className="key-selector">
                    <label>Tonalidad:</label>
                    <select 
                      value={selectedKeys[song.id] || song.original_key}
                      onChange={(e) => setSelectedKeys({ ...selectedKeys, [song.id]: e.target.value })}
                    >
                      {MUSICAL_KEYS.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-add" onClick={() => handleAddSong(song)}>
                    Añadir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="rd-divider" />

      {/* ZONA INFERIOR: El Repertorio Armado */}
      <section className="rd-list-section">
        <h3>Lista del Servicio ({setlist.songs?.length || 0})</h3>
        
        {(!setlist.songs || setlist.songs.length === 0) ? (
          <p className="rd-empty">No hay canciones asignadas a este repertorio todavía.</p>
        ) : (
          <div className="rd-songs-list">
            {setlist.songs.map((song, index) => (
              <div key={`${song.song_id}-${index}`} className="rd-song-row">
                <div className="rd-song-number">{index + 1}</div>
                <div className="rd-song-details">
                  <h4>{song.title}</h4>
                  <p>{song.author}</p>
                </div>
                <div className="rd-song-meta">
                  <span className="rd-badge-key" title="Tonalidad a tocar">
                    {song.transposed_key}
                  </span>
                  <span className="rd-tempo">{song.tempo} BPM</span>
                </div>
                <div className="rd-song-remove">
                  <button onClick={() => handleRemoveSong(song.song_id)} title="Quitar del setlist">
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default RepertorioDetalle;