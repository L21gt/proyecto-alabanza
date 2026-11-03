import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSetlistById } from '../services/setlists.service';
import { getSongById } from '../services/songs.service'; 
import type { Song } from '../types';
import './Presentacion.css';

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
  
  // Nuevo estado para controlar la transposición en vivo
  const [transposeOffset, setTransposeOffset] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadPresentation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getSetlistById(id);

        if (data.songs && data.songs.length > 0) {
          // Cargamos las canciones pasando el transposeOffset actual
          const songsWithContent = await Promise.all(
            data.songs.map(async (setlistSong: { song_id: number | string; transposed_key?: string; group_name?: string }) => {
              const songData = await getSongById(String(setlistSong.song_id), transposeOffset);
              return {
                ...songData,
                // Si hay un tono transpuesto guardado en el setlist, lo usamos como base, sino el original
                transposed_key: setlistSong.transposed_key || songData.original_key,
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
  }, [id, transposeOffset]); // Agregamos transposeOffset como dependencia para recargar al cambiar el tono

  // Restablecer el offset a 0 cuando el usuario cambia de canción
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransposeOffset(0);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < fullSongs.length - 1 ? prev + 1 : prev));
  }, [fullSongs.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleTranspose = (amount: number) => {
    setTransposeOffset(prev => prev + amount);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') navigate(`/repertorios/${id}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, id, navigate]);

  if (loading && fullSongs.length === 0) return <div className="presentation-loading">Cargando setlist...</div>;
  if (error) return <div className="presentation-error">{error}</div>;
  if (fullSongs.length === 0) return <div className="presentation-error">No hay canciones para presentar.</div>;

  const currentSong = fullSongs[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === fullSongs.length - 1;

  // Calculamos el tono a mostrar en pantalla basado en lo que devuelve la API tras aplicar el offset
  const displayKey = currentSong.original_key;

  return (
    <div className="presentation-layout">
      <header className="presentation-header-horizontal">
        <button className="btn-exit-presentation" onClick={() => navigate(`/repertorios/${id}`)}>
          ✕ Salir
        </button>
        
        <div className="presentation-info-horizontal">
          <span className="presentation-badge-group">{currentSong.group_name || 'Sin Asignar'}</span>
          <h2 className="presentation-title-horizontal">{currentSong.title}</h2>
          
          {/* CONTROL DE TRANSPOSICIÓN EN VIVO */}
          <div className="presentation-key-controls">
            <button className="btn-transpose" onClick={() => handleTranspose(-1)} disabled={loading}>-</button>
            <span className="presentation-key-horizontal">Tono: {displayKey}</span>
            <button className="btn-transpose" onClick={() => handleTranspose(1)} disabled={loading}>+</button>
          </div>
        </div>
        
        <div className="presentation-counter">
          {currentIndex + 1} / {fullSongs.length}
        </div>
      </header>

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