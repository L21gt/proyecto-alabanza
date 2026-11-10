import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSongById, deleteSong } from '../services/songs.service';
import type { Song } from '../types';
import './CancionDetalle.css';

interface SongExtended extends Song {
  tags?: string[];
}

const CancionDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repertorioId = searchParams.get('repertorioId');

  const role = localStorage.getItem('userRole');

  const [song, setSong] = useState<SongExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentKey, setCurrentKey] = useState<string>('');
  
  const [printColumns, setPrintColumns] = useState<1 | 2>(1);

  useEffect(() => {
    const fetchSong = async () => {
      try {
        if (!id) return;
        const data = await getSongById(id);
        setSong(data);
        setCurrentKey(data.original_key);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('403') || err.message.toLowerCase().includes('no encontrad') || err.message.toLowerCase().includes('detalle')) {
             setError('Esta canción se encuentra actualmente en revisión o guardada como borrador, por lo que su letra aún no es pública.');
          } else {
             setError(err.message);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [id]);

  // Manejador para eliminar canción
  const handleDelete = async () => {
    if (!song || !song.id) return;
    const confirmDelete = window.confirm('¿Está seguro de que desea eliminar esta canción? (Se enviará a la papelera)');
    if (!confirmDelete) return;

    try {
      await deleteSong(song.id.toString());
      navigate('/catalogo');
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  if (loading) return <div className="loading-container">Cargando...</div>;
  
  if (error) {
    return (
      <div className="error-message-container cd-error-view">
        <h3>⏳ Canción en Revisión</h3>
        <p>{error}</p>
        <button 
          className="btn-secondary cd-error-btn" 
          onClick={() => navigate(repertorioId ? `/repertorios/${repertorioId}` : '/catalogo')} 
        >
          &larr; Volver
        </button>
      </div>
    );
  }
  
  if (!song) return <div className="error-message-container">Canción no encontrada</div>;

  const renderTags = () => {
    if (!song.tags || song.tags.length === 0) return null;

    return (
      <div className="cd-tags-container">
        {song.tags.map((tag: string, index: number) => {
          const tagText = tag.trim();
          if (!tagText) return null;
          return <span key={index} className="cd-tag">{tagText}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="cancion-detalle-container">
      <header className="cd-header">
        
        {/* Fila Superior: Botón Volver (Izquierda) y Botones de Impresión/Video (Derecha) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="btn-back" onClick={() => navigate(repertorioId ? `/repertorios/${repertorioId}` : '/catalogo')} style={{ margin: 0 }}>
            &larr; Volver
          </button>

          <div className="cd-actions-right" style={{ gap: '8px' }}>
            <select 
              className="print-controls"
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#1e293b', color: '#e2e8f0', fontSize: '0.85rem' }}
              value={printColumns}
              onChange={(e) => setPrintColumns(Number(e.target.value) as 1 | 2)}
            >
              <option value={1}>📄 1 Columna</option>
              <option value={2}>📖 2 Columnas</option>
            </select>

            <button onClick={() => window.print()} className="cd-print-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              🖨️ Imprimir PDF
            </button>
            
            {song.video_link && (
              <a href={song.video_link} target="_blank" rel="noreferrer" className="cd-video-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                🎥 Ver en YouTube
              </a>
            )}
          </div>
        </div>

        {/* Fila Admin: Botones de Gestión (Solo visibles para administradores) */}
        {role === 'Admin' && (
          <div className="admin-controls-row" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate(`/cancion/editar/${song.id}`)}
              style={{ backgroundColor: '#f59e0b', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✏️ Editar
            </button>
            <button 
              onClick={() => navigate(`/cancion/historial/${song.id}`)} /* Ruta corregida aquí */
              style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              📜 Ver Historial
            </button>
            <button 
              onClick={handleDelete}
              style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              🗑️ Eliminar
            </button>
          </div>
        )}
        
        {/* Título de la Canción */}
        <div className="cd-title-row">
          <div>
            <div className="cd-title-area">
              <h2>{song.title}</h2>
              {song.version && <span className="cd-version-badge">{song.version}</span>}
              {song.status === 'Pendiente' && <span className="cd-status-badge cd-status-pending">En Revisión</span>}
              {song.status === 'Borrador' && <span className="cd-status-badge cd-status-draft">Borrador</span>}
            </div>
            <p className="cd-author">{song.author}</p>
          </div>
        </div>
      </header>

      {/* Barra de Metadatos y Etiquetas Integradas */}
      <div className="cd-meta-bar">
        <div className="cd-meta-item">
          <span className="cd-meta-label">Tono:</span>
          <span className="cd-meta-value">{currentKey}</span>
        </div>
        <div className="cd-meta-item">
          <span className="cd-meta-label">Tempo:</span>
          <span className="cd-meta-value">{song.tempo ? `${song.tempo} BPM` : 'N/A'}</span>
        </div>
        <div className="cd-meta-item">
          <span className="cd-meta-label">Categoría:</span>
          <span className="cd-meta-value">{song.category}</span>
        </div>
        {/* Envoltorio de Etiquetas Integradas para ocupar el espacio a la derecha */}
        <div className="cd-meta-tags-wrapper">
          {renderTags()}
        </div>
      </div>

      <div className="cd-content-area">
        {/* APLICAMOS LA CLASE CONDICIONAL PARA 2 COLUMNAS */}
        <pre className={`cd-lyrics ${printColumns === 2 ? 'print-two-columns' : ''}`}>
          {song.content}
        </pre>
      </div>
    </div>
  );
};

export default CancionDetalle;