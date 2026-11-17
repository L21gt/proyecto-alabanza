import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSongHistory } from '../services/songs.service';
import './CancionHistorial.css'; // <-- Importamos nuestro nuevo archivo CSS

interface AuditLog {
  id: number;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  user_name?: string;
}

const CancionHistorial: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!id) return;
        const data = await getSongHistory(id);
        const historyData = Array.isArray(data) ? data : (data.history || []);
        setLogs(historyData);
        
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocurrió un error desconocido al cargar el historial.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  return (
    <div className="historial-container">
      <header className="historial-header">
        <button 
          onClick={() => navigate(`/cancion/${id}`)}
          className="btn-back-historial"
        >
          &larr; Volver a la Canción
        </button>
        <h2>Historial de Cambios</h2>
      </header>

      {loading ? (
        <p>Cargando historial...</p>
      ) : error ? (
        <div style={{ backgroundColor: '#7f1d1d', padding: '1rem', borderRadius: '8px' }}>{error}</div>
      ) : logs.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No hay registros de auditoría para esta canción.</p>
      ) : (
        <div className="historial-logs-wrapper">
          {logs.map((log) => (
            <div key={log.id} className="log-card">
              <div className="log-header">
                <strong className="log-action">{log.action}</strong>
                <span className="log-date">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              
              <div className="log-body">
                {log.user_name && (
                  <p className="log-user">
                    Modificado por: <strong>{log.user_name}</strong>
                  </p>
                )}
                {log.previous_status && log.new_status && (
                  <p className="log-status">
                    Estado: <span className="status-old">{log.previous_status}</span> &rarr; <span className="status-new">{log.new_status}</span>
                  </p>
                )}
                {log.notes && (
                  <p className="log-note">
                    Nota: "{log.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CancionHistorial;