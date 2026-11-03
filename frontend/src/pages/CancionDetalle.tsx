import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSongById } from '../services/songs.service';
import type { Song } from '../types';
import './CancionDetalle.css';

// Extendemos el tipo Song para que TypeScript reconozca la propiedad tags
interface SongExtended extends Song {
  tags?: Array<string | { name: string }>;
}

const CancionDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repertorioId = searchParams.get('repertorioId');

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

  return (
    <div className="cancion-detalle-container">
      <header className="cd-header">
        <button className="btn-back" onClick={() => navigate(repertorioId ? `/repertorios/${repertorioId}` : '/catalogo')}>
          &larr; Volver
        </button>
        
        {/* FILA DEL TÍTULO: Título a la izq, Botón a la derecha */}
        <div className="cd-title-row">
          <div>
            <div className="cd-title-area">
              <h2>{song.title}</h2>
              {song.version && <span className="cd-version-badge">{song.version}</span>}
              
              {/* INSIGNIAS VISUALES */}
              {song.status === 'Pendiente' && <span className="cd-status-badge cd-status-pending">En Revisión</span>}
              {song.status === 'Borrador' && <span className="cd-status-badge cd-status-draft">Borrador</span>}
            </div>
            <p className="cd-author">{song.author}</p>
            
            {/* ETIQUETAS (Tags) tipadas correctamente sin 'any' */}
            {song.tags && song.tags.length > 0 && (
              <div className="cd-tags-container">
                {song.tags.map((tag: string | { name: string }, index: number) => (
                  <span key={index} className="cd-tag">
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN DE VIDEO */}
          {song.video_link && (
            <div>
              <a 
                href={song.video_link} 
                target="_blank" 
                rel="noreferrer" 
                className="cd-video-btn"
              >
                🎥 Ver en YouTube
              </a>
            </div>
          )}
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
      </div>

      <div className="cd-content-area">
        <pre className="cd-lyrics">{song.content}</pre>
      </div>
    </div>
  );
};

export default CancionDetalle;