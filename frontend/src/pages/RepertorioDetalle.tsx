import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { getSetlistById, addSongToSetlist, removeSongFromSetlist, updateSetlistOrder, updateSetlistTheme } from '../services/setlists.service';
import { getSongs } from '../services/songs.service';
import { getThemes } from '../services/themes.service';
import type { Setlist, Song, SetlistSong, Theme } from '../types';
import './RepertorioDetalle.css';

interface SetlistExtended extends Setlist {
  owner_id?: number;
  owner_name?: string;
}

const KANBAN_COLUMNS = ['Sin Asignar', 'ALABANZA', 'ADORACIÓN', 'OFRENDAS', 'MINISTRACIÓN', 'SANTA CENA'];

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const RepertorioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [setlist, setSetlist] = useState<SetlistExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedKeys, setSelectedKeys] = useState<Record<number, string>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<number, string>>({});
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  let currentUserId = 0;
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = parseJwt(token);
    if (decoded && decoded.id) {
      currentUserId = Number(decoded.id);
    }
  }

  const userRole = localStorage.getItem('userRole') || 'Usuario';
  
  const isOwnerOrAdmin = setlist 
    ? (userRole === 'Admin' || (currentUserId !== 0 && Number(setlist.owner_id) === currentUserId)) 
    : false;

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
        setSearchResults([]); 
        return;
      }
      setIsSearching(true);
      try {
        const data = await getSongs({ search: debouncedSearchTerm });
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

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (!setlist || !setlist.songs || !id) return;
    
    if (!isOwnerOrAdmin) {
        alert("No tienes permisos para reordenar este repertorio.");
        return;
    }

    setIsUpdatingOrder(true);

    const getSongsByCol = (col: string) => 
      setlist.songs!.filter(s => {
          if (col === 'Sin Asignar') return !s.group_name;
          return s.group_name && s.group_name.toUpperCase() === col.toUpperCase();
      });

    type SetlistSongType = NonNullable<Setlist['songs']>[number];

    const columnsData = KANBAN_COLUMNS.reduce((acc, col) => {
      acc[col] = getSongsByCol(col);
      return acc;
    }, {} as Record<string, SetlistSongType[]>); 

    const sourceCol = [...columnsData[source.droppableId]];
    const [movedSong] = sourceCol.splice(source.index, 1);

    movedSong.group_name = destination.droppableId === 'Sin Asignar' ? undefined : destination.droppableId;

    const destCol = source.droppableId === destination.droppableId ? sourceCol : [...columnsData[destination.droppableId]];
    destCol.splice(destination.index, 0, movedSong);

    columnsData[source.droppableId] = sourceCol;
    columnsData[destination.droppableId] = destCol;

    const flatNewSongs = KANBAN_COLUMNS.flatMap(col => columnsData[col]);
    setSetlist({ ...setlist, songs: flatNewSongs });

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

  const isSetlistComplete = (): boolean => {
    if (!setlist?.songs || setlist.songs.length === 0) {
      alert('El repertorio está vacío.');
      return false;
    }
    return true;
  };

  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    const fetchAllThemes = async () => {
      try {
        const data = await getThemes();
        setThemes(data);
      } catch (err) {
        console.error("Error al cargar temas", err);
      }
    };
    fetchAllThemes();
  }, []);

  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newThemeId = e.target.value ? Number(e.target.value) : null;
    if (!id) return;
    
    try {
      await updateSetlistTheme(id, newThemeId);
      await fetchSetlistDetails();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  if (loading) return <div className="loading-container">Cargando detalles...</div>;
  if (error) return <div className="error-message-container">{error}</div>;
  if (!setlist) return <div className="error-message-container">Repertorio no encontrado</div>;

  return (
    <div className="repertorio-detalle-container">
      <header className="rd-header rd-header-layout">
        <div>
          <button className="btn-back" onClick={() => navigate('/repertorios')}>&larr; Volver a Repertorios</button>
          <h2 className="rd-title">{setlist.name}</h2>
          {setlist.event_date && <p className="rd-date">{new Date(setlist.event_date).toLocaleDateString('es-ES')}</p>}
          <p className="rd-date" style={{ marginTop: '0.2rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Creado por: {setlist.owner_name || 'Usuario Desconocido'} 
              {!isOwnerOrAdmin && <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '5px' }}>(Modo Lectura)</span>}
          </p>
        </div>
        
        <div className="rd-header-actions rd-header-actions-align">
          {isOwnerOrAdmin && (
              <div className="rd-theme-selector-container">
                <label className="rd-theme-selector-label" style={{ fontWeight: 'bold', marginRight: '5px' }}>Tema PDF:</label>
                <select 
                  className="rd-select-meta rd-theme-select" 
                  value={setlist.theme_id || ''} 
                  onChange={handleThemeChange}
                >
                  <option value="">Fondo Blanco (Por defecto)</option>
                  {themes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
          )}

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
            ▶ Presentación
          </button>
        </div>
      </header>

      {isOwnerOrAdmin && (
          <section className="rd-search-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Agregar Canciones</h3>
              <button 
                className="btn-primary" 
                onClick={() => navigate(`/cancion/nueva?repertorioId=${id}`)}
                title="¿No encuentras la canción? Envíala para revisión"
              >
                ➕ Sugerir Nueva Canción
              </button>
            </div>

            <input 
              type="text" 
              className="rd-search-input" 
              placeholder="Busca en el catálogo..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
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
                      {/* SELECTOR 1: BÚSQUEDA */}
                      <select className="rd-select-meta" value={selectedKeys[song.id] || song.original_key} onChange={(e) => setSelectedKeys({ ...selectedKeys, [song.id]: e.target.value })}>
                        <optgroup label="Mayores">
                          {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => <option key={k} value={k}>{k}</option>)}
                        </optgroup>
                        <optgroup label="Menores">
                          {['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'].map(k => <option key={k} value={k}>{k}</option>)}
                        </optgroup>
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
      )}

      {isOwnerOrAdmin && <hr className="rd-divider" />}

      <section className="rd-kanban-section">
        <div className="rd-kanban-header">
          <h3>Tablero de Servicio ({setlist.songs?.length || 0})</h3>
          {isUpdatingOrder && <span className="rd-helper-text">Guardando cambios...</span>}
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {KANBAN_COLUMNS.map(columnId => {
              const columnSongs = setlist.songs?.filter(s => {
                  if (columnId === 'Sin Asignar') return !s.group_name;
                  return s.group_name && s.group_name.toUpperCase() === columnId.toUpperCase();
              }) || [];
              
              if (columnId === 'Sin Asignar' && columnSongs.length === 0) return null;
              
              if (!isOwnerOrAdmin && columnSongs.length === 0) return null;

              return (
                <div key={columnId} className={`kanban-column ${columnId === 'Sin Asignar' ? 'col-unassigned' : ''}`}>
                  <h4 className="kanban-column-title">{columnId} <span>{columnSongs.length}</span></h4>
                  
                  <Droppable droppableId={columnId} isDropDisabled={!isOwnerOrAdmin}>
                    {(provided, snapshot) => (
                      <div 
                        className={`kanban-droppable ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                      >
                        {columnSongs.map((song: SetlistSong, index: number) => (
                          <Draggable key={String(song.song_id)} draggableId={String(song.song_id)} index={index} isDragDisabled={!isOwnerOrAdmin}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-card ${snapshot.isDragging ? 'is-dragging' : ''} ${song.status === 'Pendiente' ? 'song-pending' : ''}`}
                              >
                                <div className="kanban-card-header">
                                  <strong 
                                    className="kanban-song-title-link"
                                    onClick={() => navigate(`/cancion/${song.song_id}?repertorioId=${id}`)}
                                  >
                                    {song.title}
                                  </strong>
                                  {isOwnerOrAdmin && (
                                      <button onClick={() => handleRemoveSong(song.song_id)} className="btn-remove-card">&times;</button>
                                  )}
                                </div>
                                <p className="kanban-card-author">{song.author}</p>
                                
                                <div className="kanban-card-footer">
                                  {isOwnerOrAdmin ? (
                                      /* SELECTOR 2: TABLERO KANBAN */
                                      <select 
                                        className="rd-select-meta kanban-select"
                                        value={song.transposed_key || song.original_key || ""} 
                                        onChange={(e) => handleUpdateKey(song.song_id, e.target.value)}
                                      >
                                        <optgroup label="Mayores">
                                          {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => <option key={k} value={k}>{k}</option>)}
                                        </optgroup>
                                        <optgroup label="Menores">
                                          {['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'].map(k => <option key={k} value={k}>{k}</option>)}
                                        </optgroup>
                                      </select>
                                  ) : (
                                      <span className="rd-select-meta kanban-select" style={{ cursor: 'default', background: 'transparent', border: 'none', paddingLeft: 0 }}>
                                          Tono: <strong>{song.transposed_key || song.original_key}</strong>
                                      </span>
                                  )}
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

      <div 
        className="printable-setlist-pdf"
        style={{
          ['--theme-bg' as string]: setlist.theme_background_style || 'white',
          ['--theme-color' as string]: setlist.theme_text_color || 'black',
          ['--theme-font' as string]: setlist.theme_font_family || 'inherit',
        }}
      >
        <div className="pdf-header">
          <h1>{setlist.name}</h1>
          <div className="pdf-date">
            {setlist.event_date ? new Date(setlist.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
          </div>
        </div>

        <div className="pdf-body">
          {KANBAN_COLUMNS.filter(col => col !== 'Sin Asignar').map(categoria => {
            const cancionesEnCategoria = setlist.songs?.filter(s => s.group_name && s.group_name.toUpperCase() === categoria.toUpperCase());
            
            if (!cancionesEnCategoria || cancionesEnCategoria.length === 0) return null;

            return (
              <div key={categoria} className="pdf-category-section">
                <h2>{categoria.toUpperCase()}</h2>
                <ul>
                  {cancionesEnCategoria.map((song: SetlistSong) => (
                    <li key={song.song_id}>
                      <strong>({song.transposed_key || song.original_key})</strong> {song.title}
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