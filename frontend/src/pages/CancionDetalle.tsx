import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSongById } from '../services/songs.service';
import type { Song } from '../types';
import './CancionDetalle.css';

const CancionDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para llevar el control de los semitonos que subimos o bajamos
  const [transposeOffset, setTransposeOffset] = useState(0);

  useEffect(() => {
    const fetchSong = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getSongById(id, transposeOffset);
        setSong(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [id, transposeOffset]); // Se vuelve a ejecutar si cambia el ID o la transposición

  const handleTranspose = (amount: number) => {
    setTransposeOffset(prev => prev + amount);
  };

  if (loading && !song) return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando canción...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!song) return <div style={{ textAlign: 'center' }}>Canción no encontrada</div>;

  return (
    <div className="detalle-container">
      <button 
        className="btn-primary" 
        style={{ marginBottom: '1rem', backgroundColor: 'var(--text-secondary)' }}
        onClick={() => navigate('/catalogo')}
      >
        &larr; Volver al catálogo
      </button>

      <div className="detalle-header">
        <h1 className="detalle-title">{song.title}</h1>
        <p className="detalle-author">{song.author}</p>
      </div>

      <div className="controls-panel">
        <div className="control-group">
          <span style={{ fontWeight: 500 }}>Tonalidad:</span>
          <button className="btn-circle" onClick={() => handleTranspose(-1)} disabled={loading}>-</button>
          <span className="key-display">{song.original_key}</span>
          <button className="btn-circle" onClick={() => handleTranspose(1)} disabled={loading}>+</button>
        </div>
        
        {transposeOffset !== 0 && (
          <button 
            className="btn-primary" 
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => setTransposeOffset(0)}
            disabled={loading}
          >
            Restaurar Original
          </button>
        )}
        
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Tempo: {song.tempo} BPM
        </span>
      </div>

      <div className="lyric-content">
        {song.content}
      </div>
    </div>
  );
};

export default CancionDetalle;