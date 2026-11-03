import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSongById } from '../services/songs.service';
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

  // Simulación simple para transponer (opcional)
  const [currentKey, setCurrentKey] = useState<string>('');

  useEffect(() => {
    const fetchSong = async () => {
      try {
        if (!id) return;
        const data = await getSongById(id);
        
        // Si la API sí devuelve la canción, la mostramos y verificamos su estado
        setSong(data);
        setCurrentKey(data.original_key);
        
      } catch (err) {
        if (err instanceof Error) {
          // INTERCEPCIÓN DEL ERROR: 
          // Si el backend arrojó un error porque la canción está pendiente/oculta
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
  
  // RENDERIZADO DEL MENSAJE DE REVISIÓN
  if (error) {
    return (
      <div className="error-message-container" style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#1e293b', borderRadius: '8px' }}>
        <h3 style={{ color: '#fbbf24' }}>⏳ Canción en Revisión</h3>
        <p style={{ color: '#f8fafc', marginTop: '1rem', fontSize: '1.1rem' }}>{error}</p>
        <button 
          className="btn-secondary" 
          onClick={() => navigate(repertorioId ? `/repertorios/${repertorioId}` : '/catalogo')} 
          style={{ marginTop: '2rem' }}
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
        <div className="cd-title-area" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>{song.title}</h2>
          {song.version && <span className="cd-version-badge">{song.version}</span>}
          
          {/* INSIGNIA VISUAL si el backend sí permitió verla (ej. si el usuario es Admin) */}
          {song.status === 'Pendiente' && <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>En Revisión</span>}
          {song.status === 'Borrador' && <span style={{ backgroundColor: '#6b7280', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Borrador</span>}
        </div>
        <p className="cd-author">{song.author}</p>
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

      {song.video_link && (
        <div className="cd-video-section">
          <h3>Referencia en Video</h3>
          <a href={song.video_link} target="_blank" rel="noreferrer" className="btn-secondary">
            🎥 Ver en YouTube
          </a>
        </div>
      )}
    </div>
  );
};

export default CancionDetalle;