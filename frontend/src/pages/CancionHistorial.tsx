import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSongHistory } from '../services/songs.service';

interface AuditLog {
  id: number;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  user_name?: string; // Si tu backend envía el nombre del admin que hizo el cambio
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
        // Dependiendo de cómo responda tu backend, puede ser data o data.history
        setLogs(data.history || data);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', backgroundColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <button 
            onClick={() => navigate(`/cancion/${id}`)}
            style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 'bold', padding: 0, marginBottom: '1rem' }}
          >
            &larr; Volver a la Canción
          </button>
          <h2 style={{ margin: 0, color: '#ffffff' }}>Historial de Cambios</h2>
        </div>
      </header>

      {loading ? (
        <p>Cargando historial...</p>
      ) : error ? (
        <div style={{ backgroundColor: '#7f1d1d', padding: '1rem', borderRadius: '8px' }}>{error}</div>
      ) : logs.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No hay registros de auditoría para esta canción.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {logs.map((log) => (
            <div key={log.id} style={{ backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ color: '#38bdf8', textTransform: 'uppercase' }}>{log.action}</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              
              <div style={{ fontSize: '0.95rem', color: '#cbd5e1' }}>
                {log.previous_status && log.new_status && (
                  <p style={{ margin: '0.5rem 0' }}>
                    Estado: <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{log.previous_status}</span> &rarr; <span style={{ color: '#10b981', fontWeight: 'bold' }}>{log.new_status}</span>
                  </p>
                )}
                {log.notes && (
                  <p style={{ margin: '0.5rem 0', fontStyle: 'italic', color: '#94a3b8' }}>
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