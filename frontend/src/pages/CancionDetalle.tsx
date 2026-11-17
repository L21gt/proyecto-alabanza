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
      
      {/* NUEVO CONTENEDOR: Agrupa todo el encabezado para unificarlo en Impresión */}
      <div className="cd-print-header-box">
        <header className="cd-header">
          
          <div className="cd-top-row">
            <button className="btn-back" onClick={() => navigate(repertorioId ? `/repertorios/${repertorioId}` : '/catalogo')}>
              &larr; Volver
            </button>

            <div className="cd-actions-right">
              <button onClick={() => window.print()} className="cd-print-btn">
                🖨️ Imprimir PDF
              </button>
              
              {song.video_link && (
                <a href={song.video_link} target="_blank" rel="noreferrer" className="cd-video-btn">
                  🎥 YouTube
                </a>
              )}
            </div>
          </div>

          {role === 'Admin' && (
            <div className="admin-controls-row">
              <button 
                className="cd-btn-edit"
                onClick={() => navigate(`/cancion/editar/${song.id}`)}
              >
                ✏️ Editar
              </button>
              <button 
                className="cd-btn-history"
                onClick={() => navigate(`/cancion/historial/${song.id}`)}
              >
                📜 Historial
              </button>
              <button 
                className="cd-btn-delete"
                onClick={handleDelete}
              >
                🗑️ Eliminar
              </button>
            </div>
          )}
          
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
          
          <div className="cd-meta-tags-wrapper">
            {renderTags()}
          </div>
        </div>
      </div>

      <div className="cd-content-area">
        <pre className="cd-lyrics">
          {song.content}
        </pre>
      </div>
    </div>
  );
};

export default CancionDetalle;