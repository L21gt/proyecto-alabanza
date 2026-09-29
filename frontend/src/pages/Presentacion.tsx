import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSetlistById } from '../services/setlists.service';
import { getSongById } from '../services/songs.service'; 
import type { Song } from '../types'; // Eliminamos 'Setlist' para borrar el error
import './Presentacion.css'; // NOTA: Crearemos este archivo en el siguiente paso

interface SongDetails extends Song {
  transposed_key?: string;
  group_name?: string;
}

const Presentacion: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [fullSongs, setFullSongs] = useState<SongDetails[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true; // Previene actualizaciones de estado si el componente se desmonta

    const loadPresentation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getSetlistById(id);

        if (data.songs && data.songs.length > 0) {
          const songsWithContent = await Promise.all(
            data.songs.map(async (setlistSong: { song_id: number | string; transposed_key?: string; group_name?: string }) => {
              const songData = await getSongById(String(setlistSong.song_id));
              return {
                ...songData,
                transposed_key: setlistSong.transposed_key,
                group_name: setlistSong.group_name
              };
            })
          );
          if (isMounted) setFullSongs(songsWithContent);
        }
      } catch (err) {
        if (err instanceof Error && isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPresentation();

    return () => {
      isMounted = false;
    };
  }, [id]);

    // Controles de navegación envueltos en useCallback para quitar el error de dependencias
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < fullSongs.length - 1 ? prev + 1 : prev));
  }, [fullSongs.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') navigate(`/repertorios/${id}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, id, navigate]);

  if (loading) return <div className="presentation-loading">Cargando setlist...</div>;
  if (error) return <div className="presentation-error">{error}</div>;
  if (fullSongs.length === 0) return <div className="presentation-error">No hay canciones para presentar.</div>;

  const currentSong = fullSongs[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === fullSongs.length - 1;

  return (
    <div className="presentation-layout">
      {/* Barra superior horizontal y compacta */}
      <header className="presentation-header-horizontal">
        <button className="btn-exit-presentation" onClick={() => navigate(`/repertorios/${id}`)}>
          ✕ Salir
        </button>
        
        <div className="presentation-info-horizontal">
          <span className="presentation-badge-group">{currentSong.group_name || 'Sin Asignar'}</span>
          <h2 className="presentation-title-horizontal">{currentSong.title}</h2>
          <span className="presentation-key-horizontal">Tono: {currentSong.transposed_key}</span>
        </div>
        
        <div className="presentation-counter">
          {currentIndex + 1} / {fullSongs.length}
        </div>
      </header>

      {/* Área central con flechas de navegación a los lados */}
      <main className="presentation-body-with-arrows">
        <button 
          className="nav-arrow" 
          onClick={handlePrev} 
          disabled={isFirst}
          title="Canción Anterior (Flecha Izquierda)"
        >
          &#10094;
        </button>
        
        <div className="presentation-chords-container">
          <pre className="presentation-chords">{currentSong.content}</pre>
        </div>

        <button 
          className="nav-arrow" 
          onClick={handleNext} 
          disabled={isLast}
          title="Siguiente Canción (Flecha Derecha o Espacio)"
        >
          &#10095;
        </button>
      </main>
    </div>
  );
};

export default Presentacion;