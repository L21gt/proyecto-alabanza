import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSongById, deleteSong } from '../services/songs.service';
import type { Song } from '../types';
import './CancionDetalle.css';

const CancionDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const repertorioId = searchParams.get('repertorioId');
  
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transposeOffset, setTransposeOffset] = useState(0);

  // RBAC validation: Retrieve current user role from session
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const fetchSong = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getSongById(id, transposeOffset);
        setSong(data);
      } catch (err) {
        console.error("Error al cargar la canción:", err);
        setError('Error al obtener los detalles de la canción');
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [id, transposeOffset]);

  const handleTranspose = (amount: number) => {
    setTransposeOffset(prev => prev + amount);
  };

  // Resource deletion handler
  const handleDeleteDirect = async () => {
    if (!id) return;

    const confirmDelete = window.confirm('¿Está seguro de que desea eliminar esta canción?');
    if (!confirmDelete) return;

    try {
      await deleteSong(id);
      navigate('/catalogo');
    } catch (err) {
      console.error("Error al eliminar:", err);
      setError('Ocurrió un error al intentar eliminar la canción.');
    }
  };

  if (loading && !song) return <div className="loading-message">Cargando canción...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!song) return <div className="not-found-message">Canción no encontrada</div>;

  return (
    <div className="detalle-container">
      {repertorioId ? (
        <button 
          className="btn-back" 
          onClick={() => navigate(`/repertorios/${repertorioId}`)}
        >
          &larr; Volver al repertorio
        </button>
      ) : (
        <button 
          className="btn-back" 
          onClick={() => navigate('/catalogo')}
        >
          &larr; Volver al catálogo
        </button>
      )}

      <div className="detalle-header">
        <h1 className="detalle-title">{song.title}</h1>
        <p className="detalle-author">{song.author}</p>

        {/* INICIO NUEVO BLOQUE DE METADATOS */}
        <div className="detalle-metadata">
          {song.video_link && (
            <a 
              href={song.video_link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="metadata-video-btn"
            >
              ▶ Ver Video de Referencia
            </a>
          )}
          
          {song.themes && song.themes.length > 0 && (
            <div className="metadata-themes-wrapper">
              <span className="metadata-label">Etiquetas:</span>
              <div className="metadata-tags">
                {song.themes.map((theme, i) => (
                  <span key={i} className="metadata-badge">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* FIN NUEVO BLOQUE DE METADATOS */}
      </div>

      <div className="controls-panel">
        <div className="control-group">
          <span className="control-label">Tonalidad:</span>
          <button className="btn-circle" onClick={() => handleTranspose(-1)} disabled={loading}>-</button>
          <span className="key-display">{song.original_key}</span>
          <button className="btn-circle" onClick={() => handleTranspose(1)} disabled={loading}>+</button>
        </div>
        
        {transposeOffset !== 0 && (
          <button 
            className="btn-restore" 
            onClick={() => setTransposeOffset(0)}
            disabled={loading}
          >
            Restaurar Original
          </button>
        )}
        
        <span className="tempo-display">
          Tempo: {song.tempo} BPM
        </span>

        {/* Conditional rendering for destructive actions (Admin only) */}
        {userRole === 'Admin' && (
          <div className="action-buttons">
            <button 
              className="btn-edit" 
              onClick={() => navigate(`/cancion/${id}/editar`)}
              disabled={loading}
            >
              Editar
            </button>

            <button 
              className="btn-delete-small" 
              onClick={handleDeleteDirect}
              disabled={loading}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="lyric-content">
        {song.content}
      </div>
    </div>
  );
};

export default CancionDetalle;