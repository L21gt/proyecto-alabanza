import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSongById, deleteSong } from '../services/songs.service';
import type { Song } from '../types';
import './CancionDetalle.css';

// Interfaz para tipar los registros de auditoría devueltos por /api/songs/:id/history
interface AuditLog {
  id: number;
  action: string;
  previous_status?: string;
  new_status?: string;
  notes?: string;
  created_at: string;
  user_name: string;
  user_email?: string;
}

const CancionDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const repertorioId = searchParams.get('repertorioId');
  
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transposeOffset, setTransposeOffset] = useState(0);

  // ESTADOS DEL HISTORIAL DE AUDITORÍA (Sprint 2)
  const [showHistory, setShowHistory] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Validación de control de acceso en interfaz (RBAC)
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

  // Obtención asíncrona de la línea de tiempo de auditoría
  const handleToggleHistory = async () => {
    if (!id) return;
    
    // Si ya está abierto, simplemente lo ocultamos
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/songs/${id}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('No se pudo cargar el historial');
      
      const data = await response.json();
      setAuditHistory(data.history || []);
      setShowHistory(true);
    } catch (err) {
      console.error("Error al obtener historial de auditoría:", err);
      alert("Hubo un problema al cargar el historial de cambios.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTranspose = (amount: number) => {
    setTransposeOffset(prev => prev + amount);
  };

  // Manejador de eliminación permanente del recurso
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

        {/* BOTÓN AGREGADO PARA VISUALIZAR EL HISTORIAL DE CAMBIOS */}
        <button 
          className="btn-history"
          onClick={handleToggleHistory}
          disabled={loadingHistory}
          title="Ver registro cronológico de creaciones y ediciones"
        >
          {loadingHistory ? 'Cargando...' : showHistory ? '▲ Ocultar Historial de cambios' : '📜 Ver el Historial de Cambios'}
        </button>

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

      {/* SECCIÓN DESPLEGABLE DEL HISTORIAL DE CAMBIOS (AUDIT TRAIL) */}
      {showHistory && (
        <section className="audit-history-section">
          <h3 className="audit-history-title">Historial de Auditoría de la Canción</h3>
          
          {auditHistory.length === 0 ? (
            <p className="audit-notes">No hay registros de cambios para esta canción todavía.</p>
          ) : (
            <div className="audit-timeline">
              {auditHistory.map((log) => (
                <div key={log.id} className="audit-item">
                  <div className="audit-item-header">
                    <span className="audit-action-badge">{log.action}</span>
                    <span className="audit-date">
                      {new Date(log.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <span className="audit-user">Responsable: {log.user_name}</span>
                  {log.notes && <p className="audit-notes">{log.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CancionDetalle;