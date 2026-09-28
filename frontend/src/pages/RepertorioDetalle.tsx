import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSetlistById, addSongToSetlist, removeSongFromSetlist, updateSetlistOrder } from '../services/setlists.service';
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
  const [selectedKeys, setSelectedKeys] = useState<Record<number, string>>({});
  // Mapeo para guardar la sección/bloque seleccionado
  const [selectedGroups, setSelectedGroups] = useState<Record<number, string>>({});

  // Estados para el Drag & Drop
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

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
        const data = await getSongs(debouncedSearchTerm);
        const results = data.songs || []; 
        
        setSearchResults(results);
        
        const initialKeys: Record<number, string> = {};
        results.forEach((song: Song) => {
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
    
    // Por defecto, si no selecciona nada, lo asignamos a "Alabanza"
    const groupName = selectedGroups[song.id] || 'Alabanza';
    const nextOrder = (setlist.songs?.length || 0) + 1;
    const transposedKey = selectedKeys[song.id] || song.original_key;

    try {
      await addSongToSetlist(id, {
        song_id: song.id,
        transposed_key: transposedKey,
        sort_order: nextOrder,
        group_name: groupName // Enviamos el bloque al backend
      });
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

  const handleDragStart = (index: number) => {
    setDragItemIndex(index);
  };

  const handleDragEnter = (index: number) => {
    setDragOverItemIndex(index);
  };

  const handleDragEnd = async () => {
    if (dragItemIndex === null || dragOverItemIndex === null || dragItemIndex === dragOverItemIndex) {
      setDragItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }

    if (!setlist || !setlist.songs || !id) return;

    const newSongs = [...setlist.songs];
    const draggedItem = newSongs[dragItemIndex];
    newSongs.splice(dragItemIndex, 1);
    newSongs.splice(dragOverItemIndex, 0, draggedItem);

    setSetlist({ ...setlist, songs: newSongs });
    setDragItemIndex(null);
    setDragOverItemIndex(null);
    setIsUpdatingOrder(true);

    try {
      const orderPayload = newSongs.map((song, index) => ({
        song_id: song.song_id,
        sort_order: index + 1,
        group_name: song.group_name || null 
      }));

      await updateSetlistOrder(id, orderPayload);
    } catch (err) {
      alert('Error al guardar el nuevo orden en el servidor. Se recargará la lista original.');
      console.error('Error al actualizar orden:', err);
      await fetchSetlistDetails();
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // FUNCIÓN UNIFICADA: Cambiar grupo o tonalidad en vivo
  const handleUpdateSongMeta = async (index: number, field: 'group_name' | 'transposed_key', value: string) => {
    if (!setlist || !setlist.songs || !id) return;

    const newSongs = [...setlist.songs];
    
    // Asignación explícita para resolver el error estricto de TypeScript
    if (field === 'group_name') {
      newSongs[index].group_name = value === "" ? undefined : value;
    } else {
      // Simplemente asignamos el valor directo. Si está vacío será "", lo cual es un string válido.
      newSongs[index].transposed_key = value;
    }
    
    setSetlist({ ...setlist, songs: newSongs });
    setIsUpdatingOrder(true);

    try {
      const orderPayload = newSongs.map((song, i) => ({
        song_id: song.song_id,
        sort_order: i + 1,
        group_name: song.group_name || null,
        transposed_key: song.transposed_key || null
      }));

      await updateSetlistOrder(id, orderPayload);
    } catch (err) {
      // Usamos la variable 'err' para limpiar la advertencia de ESLint
      console.error('Error de red o base de datos al actualizar:', err);
      alert('Error al guardar el cambio.');
      await fetchSetlistDetails(); 
    } finally {
      setIsUpdatingOrder(false);
    }
  };
  
  if (loading) return <div className="loading-container">Cargando detalles...</div>;
  if (error) return <div className="error-message-container">{error}</div>;
  if (!setlist) return <div className="error-message-container">Repertorio no encontrado</div>;

  return (
    <div className="repertorio-detalle-container">
      <header className="rd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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

        {/* BOTÓN DE INICIAR PRESENTACIÓN CON VALIDACIÓN */}
        <button 
          className="btn-primary" 
          onClick={() => {
            if (!setlist || !setlist.songs || setlist.songs.length === 0) {
              alert('Debes agregar canciones al repertorio primero.');
              return;
            }
            
            // Verificamos qué grupos están presentes en la lista actual
            const groupsPresent = setlist.songs.map(s => s.group_name).filter(Boolean);
            const missingGroups = [];
            
            if (!groupsPresent.includes('Alabanza')) missingGroups.push('Alabanza');
            if (!groupsPresent.includes('Adoración')) missingGroups.push('Adoración');
            if (!groupsPresent.includes('Ofrendas')) missingGroups.push('Ofrendas');

            if (missingGroups.length > 0) {
              alert(`⚠️ No puedes iniciar la presentación. \n\nFaltan asignar canciones en las siguientes secciones obligatorias:\n- ${missingGroups.join('\n- ')}`);
              return;
            }

            // Si pasa la validación, navegamos al modo lectura
            navigate(`/repertorios/${id}/presentacion`);
          }}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem', backgroundColor: '#10b981', color: 'white' }}
        >
          ▶ Iniciar Presentación
        </button>
      </header>

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
                  
                  {/* INYECTA ESTE BLOQUE NUEVO PARA ELIMINAR EL ERROR */}
                  <div className="group-selector" style={{ marginLeft: '10px' }}>
                    <label>Momento:</label>
                    <select 
                      value={selectedGroups[song.id] || 'Alabanza'}
                      onChange={(e) => setSelectedGroups({ ...selectedGroups, [song.id]: e.target.value })}
                    >
                      <option value="Alabanza">Alabanza</option>
                      <option value="Adoración">Adoración</option>
                      <option value="Ofrendas">Ofrendas</option>
                      <option value="Santa Cena">Santa Cena</option>
                    </select>
                  </div>

                  <button className="btn-add" onClick={() => handleAddSong(song)} style={{ marginLeft: '10px' }}>
                    Añadir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rd-suggest-container">
          <p className="rd-suggest-text">
            ¿No encuentras la canción en el catálogo?
          </p>
          <button 
            className="btn-secondary" 
            onClick={() => navigate(`/cancion/nueva?repertorioId=${id}`)}
          >
            + Sugerir y agregar al repertorio
          </button>
        </div>
      </section>

      <hr className="rd-divider" />

      <section className="rd-list-section">
        <h3>Lista del Servicio ({setlist.songs?.length || 0})</h3>
        
        {(!setlist.songs || setlist.songs.length === 0) ? (
          <p className="rd-empty">No hay canciones asignadas a este repertorio todavía.</p>
        ) : (
          <div className="rd-songs-list">
            {isUpdatingOrder && <p className="rd-helper-text">Guardando nuevo orden...</p>}
            
            {setlist.songs.map((song, index) => (
              <div 
                key={`${song.song_id}-${index}`} 
                className={`rd-song-row ${dragItemIndex === index ? 'dragging' : ''} ${dragOverItemIndex === index ? 'drag-over' : ''} ${song.status === 'Pendiente' ? 'song-pending' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="rd-drag-handle" title="Arrastrar para reordenar">☰</div>
                
                <div className="rd-song-number">{index + 1}</div>
                
                <div 
                  className="rd-song-details" 
                  onClick={() => {
                    if (song.status === 'Pendiente') {
                      alert('Esta canción se encuentra en revisión editorial y aún no tiene los acordes disponibles para ensayar.');
                    } else {
                      navigate(`/cancion/${song.song_id}?repertorioId=${id}`);
                    }
                  }}
                  title={song.status === 'Pendiente' ? 'Canción en revisión' : 'Haz clic para ver acordes y ensayar'}
                >
                  <h4 className="rd-song-title-link">
                    {song.title} {song.status === 'Pendiente' && <span style={{ color: '#eab308', fontSize: '0.8rem', marginLeft: '8px' }}>(En revisión)</span>}
                  </h4>
                  <p>{song.author}</p>
                </div>
                
                <div className="rd-song-meta rd-meta-controls">
                  {/* Selector de categoría */}
                  <select 
                    className={`rd-select-meta ${!song.group_name ? 'rd-select-unassigned' : ''}`}
                    value={song.group_name || ""} 
                    onChange={(e) => handleUpdateSongMeta(index, 'group_name', e.target.value)}
                  >
                    <option value="">-- Asignar --</option>
                    <option value="Alabanza">Alabanza</option>
                    <option value="Adoración">Adoración</option>
                    <option value="Ofrendas">Ofrendas</option>
                    <option value="Santa Cena">Santa Cena</option>
                  </select>

                  {/* Selector de Tonalidad */}
                  <select 
                    className="rd-select-meta"
                    value={song.transposed_key || song.original_key || ""} 
                    onChange={(e) => handleUpdateSongMeta(index, 'transposed_key', e.target.value)}
                  >
                    {MUSICAL_KEYS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>

                  <span className="rd-tempo">{song.tempo} BPM</span>
                </div>
                <div className="rd-song-remove">
                  <button onClick={() => handleRemoveSong(song.song_id)} title="Quitar del setlist">&times;</button>
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