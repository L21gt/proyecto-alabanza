import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { getSetlistById, addSongToSetlist, removeSongFromSetlist, updateSetlistOrder } from '../services/setlists.service';
import { getSongs } from '../services/songs.service';
import type { Setlist, Song, SetlistSong } from '../types';
import './RepertorioDetalle.css';

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KANBAN_COLUMNS = ['Sin Asignar', 'Alabanza', 'Adoración', 'Ofrendas', 'Santa Cena'];

const RepertorioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedKeys, setSelectedKeys] = useState<Record<number, string>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<number, string>>({});
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

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

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    const search = async () => {
      if (!debouncedSearchTerm.trim()) {
        setSearchResults([]); // <-- Restaurado a la forma simple, eliminando ambos errores
        return;
      }
      setIsSearching(true);
      try {
        const data = await getSongs(debouncedSearchTerm);
        const results = data.songs || []; 
        setSearchResults(results);
        
        const initialKeys: Record<number, string> = {};
        results.forEach((song: Song) => { initialKeys[song.id] = song.original_key; });
        setSelectedKeys(prev => ({ ...prev, ...initialKeys }));
      } catch (err) {
        console.error('Error buscando canciones:', err);
      } finally {
        setIsSearching(false);
      }
    };
    search();
  }, [debouncedSearchTerm]);

  const handleAddSong = async (song: Song) => {
    if (!setlist || !id) return;
    const groupName = selectedGroups[song.id] || undefined;
    const nextOrder = (setlist.songs?.length || 0) + 1;
    const transposedKey = selectedKeys[song.id] || song.original_key;

    try {
      await addSongToSetlist(id, {
        song_id: song.id,
        transposed_key: transposedKey,
        sort_order: nextOrder,
        group_name: groupName
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

  // Cambio de Tono en vivo
  const handleUpdateKey = async (songId: number, newKey: string) => {
    if (!setlist || !setlist.songs || !id) return;
    const newSongs = [...setlist.songs];
    const songIndex = newSongs.findIndex(s => s.song_id === songId);
    if (songIndex === -1) return;

    newSongs[songIndex].transposed_key = newKey;
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
      console.error('Error al actualizar tono:', err);
      alert('Error al actualizar tono.');
      await fetchSetlistDetails(); 
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Motor del Tablero Kanban (Pangea DND)
  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (!setlist || !setlist.songs || !id) return;

    setIsUpdatingOrder(true);

    // 1. Agrupamos las canciones actuales lógicamente por columna
    const getSongsByCol = (col: string) => 
      setlist.songs!.filter(s => col === 'Sin Asignar' ? !s.group_name : s.group_name === col);

    // INYECTAMOS UN TIPO SEGURO PARA CONTENTAR A TYPESCRIPT
    type SetlistSongType = NonNullable<Setlist['songs']>[number];

    const columnsData = KANBAN_COLUMNS.reduce((acc, col) => {
      acc[col] = getSongsByCol(col);
      return acc;
    }, {} as Record<string, SetlistSongType[]>); // <-- Usamos el tipo exacto en lugar de any[]

    // 2. Extraemos la canción movida de la columna de origen
    const sourceCol = [...columnsData[source.droppableId]];
    const [movedSong] = sourceCol.splice(source.index, 1);

    // 3. Modificamos su grupo (si se movió a Sin Asignar, es null/undefined)
    movedSong.group_name = destination.droppableId === 'Sin Asignar' ? undefined : destination.droppableId;

    // 4. Insertamos la canción en la columna de destino
    const destCol = source.droppableId === destination.droppableId ? sourceCol : [...columnsData[destination.droppableId]];
    destCol.splice(destination.index, 0, movedSong);

    // Actualizamos nuestro mapa temporal
    columnsData[source.droppableId] = sourceCol;
    columnsData[destination.droppableId] = destCol;

    // 5. Aplanamos todas las columnas en un solo arreglo para reconstruir el sort_order general
    const flatNewSongs = KANBAN_COLUMNS.flatMap(col => columnsData[col]);
    setSetlist({ ...setlist, songs: flatNewSongs });

    // 6. Enviamos el nuevo orden al servidor
    try {
      const orderPayload = flatNewSongs.map((song, i) => ({
        song_id: song.song_id,
        sort_order: i + 1,
        group_name: song.group_name || null,
        transposed_key: song.transposed_key || null
      }));
      await updateSetlistOrder(id, orderPayload);
    } catch (err) {
      console.error('Error al guardar el nuevo orden:', err);
      alert('Error al guardar el nuevo orden.');
      await fetchSetlistDetails();
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Validador de reglas de negocio para el repertorio
  const isSetlistComplete = (): boolean => {
    if (!setlist?.songs || setlist.songs.length === 0) {
      alert('Debes agregar canciones al repertorio primero.');
      return false;
    }
    const groupsPresent = setlist.songs.map(s => s.group_name).filter(Boolean);
    const missing = ['Alabanza', 'Adoración', 'Ofrendas'].filter(g => !groupsPresent.includes(g));
    
    if (missing.length > 0) {
      alert(`⚠️ Acción denegada. Faltan asignar canciones en: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  if (loading) return <div className="loading-container">Cargando detalles...</div>;
  if (error) return <div className="error-message-container">{error}</div>;
  if (!setlist) return <div className="error-message-container">Repertorio no encontrado</div>;

  return (
    <div className="repertorio-detalle-container">
      {/* HEADER Y BÚSQUEDA IGUALES A TU VERSIÓN ANTERIOR */}
      <header className="rd-header rd-header-layout">
        <div>
          <button className="btn-back" onClick={() => navigate('/repertorios')}>&larr; Volver a Repertorios</button>
          <h2 className="rd-title">{setlist.name}</h2>
          {setlist.event_date && <p className="rd-date">{new Date(setlist.event_date).toLocaleDateString('es-ES')}</p>}
        </div>
        
        <div className="rd-header-actions">
          <button 
            className="btn-secondary rd-btn-print" 
            onClick={() => {
              if (isSetlistComplete()) {
                window.print();
              }
            }}
          >
            🖨️ PDF / Imprimir
          </button>

          <button 
            className="btn-primary rd-btn-presentation" 
            onClick={() => {
              if (isSetlistComplete()) {
                navigate(`/repertorios/${id}/presentacion`);
              }
            }}
          >
            ▶ Iniciar Presentación
          </button>
        </div>
      </header>

      <section className="rd-search-section">
        <h3>Agregar Canciones</h3>
        <input type="text" className="rd-search-input" placeholder="Busca en el catálogo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        {isSearching && <p className="rd-helper-text">Buscando...</p>}
        {searchResults.length > 0 && (
          <div className="rd-search-results">
            {searchResults.map(song => (
              <div key={song.id} className="rd-result-card">
                <div className="rd-result-info rd-result-info-layout">
                  <strong 
                    className="kanban-song-title-link"
                    onClick={() => navigate(`/cancion/${song.id}?repertorioId=${id}`)}
                  >
                    {song.title}
                  </strong>
                  <span>{song.author}</span>
                </div>
                <div className="rd-result-actions">
                  <select className="rd-select-meta" value={selectedKeys[song.id] || song.original_key} onChange={(e) => setSelectedKeys({ ...selectedKeys, [song.id]: e.target.value })}>
                    {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <select className="rd-select-meta rd-select-margin" value={selectedGroups[song.id] || 'Sin Asignar'} onChange={(e) => setSelectedGroups({ ...selectedGroups, [song.id]: e.target.value })}>
                    {KANBAN_COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                  <button className="btn-add rd-btn-margin" onClick={() => handleAddSong(song)}>Añadir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="rd-divider" />

      {/* NUEVO: SECCIÓN KANBAN */}
      <section className="rd-kanban-section">
        <div className="rd-kanban-header">
          <h3>Tablero de Servicio ({setlist.songs?.length || 0})</h3>
          {isUpdatingOrder && <span className="rd-helper-text">Guardando cambios...</span>}
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {KANBAN_COLUMNS.map(columnId => {
              const columnSongs = setlist.songs?.filter(s => columnId === 'Sin Asignar' ? !s.group_name : s.group_name === columnId) || [];
              
              // No mostrar "Sin Asignar" si está vacía, para mantener limpio el tablero
              if (columnId === 'Sin Asignar' && columnSongs.length === 0) return null;

              return (
                <div key={columnId} className={`kanban-column ${columnId === 'Sin Asignar' ? 'col-unassigned' : ''}`}>
                  <h4 className="kanban-column-title">{columnId} <span>{columnSongs.length}</span></h4>
                  
                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div 
                        className={`kanban-droppable ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                      >
                        {/* Agregamos ": SetlistSong" al parámetro song */}
                        {columnSongs.map((song: SetlistSong, index: number) => (
                          <Draggable key={String(song.song_id)} draggableId={String(song.song_id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-card ${snapshot.isDragging ? 'is-dragging' : ''} ${song.status === 'Pendiente' ? 'song-pending' : ''}`}
                              >
                                <div className="kanban-card-header">
                                  {/* Ya no usamos "any", TypeScript ahora sabe que es válido */}
                                  <strong 
                                    className="kanban-song-title-link"
                                    onClick={() => navigate(`/cancion/${song.song_id}?repertorioId=${id}`)}
                                  >
                                    {song.title}
                                  </strong>
                                  <button onClick={() => handleRemoveSong(song.song_id)} className="btn-remove-card">&times;</button>
                                </div>
                                <p className="kanban-card-author">{song.author}</p>
                                
                                <div className="kanban-card-footer">
                                  <select 
                                    className="rd-select-meta kanban-select"
                                    value={song.transposed_key || song.original_key || ""} 
                                    onChange={(e) => handleUpdateKey(song.song_id, e.target.value)}
                                  >
                                    {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                                  </select>
                                  <span className="rd-tempo">{song.tempo} BPM</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </section>

      {/* =========================================
          PLANTILLA OCULTA PARA IMPRESIÓN / PDF
      ========================================= */}
      <div className="printable-setlist-pdf">
        <div className="pdf-header">
          <h1>{setlist.name}</h1>
          <div className="pdf-date">
            {setlist.event_date ? new Date(setlist.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
          </div>
        </div>

        <div className="pdf-body">
          {['Alabanza', 'Adoración', 'Ofrendas', 'Santa Cena'].map(categoria => {
            const cancionesEnCategoria = setlist.songs?.filter(s => s.group_name === categoria);
            
            if (!cancionesEnCategoria || cancionesEnCategoria.length === 0) return null;

            return (
              <div key={categoria} className="pdf-category-section">
                <h2>{categoria.toUpperCase()}</h2>
                <ul>
                  {/* Agregamos ": SetlistSong" aquí también */}
                  {cancionesEnCategoria.map((song: SetlistSong) => (
                    <li key={song.song_id}>
                      <strong>({song.transposed_key || song.original_key})</strong> - {song.title}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RepertorioDetalle;