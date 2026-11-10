import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSetlists, createSetlist, deleteSetlist } from '../services/setlists.service';
import type { Setlist } from '../types';
import './Repertorios.css';

// 1. Usamos Omit para quitar el user_id base de Setlist y reescribirlo, evitando el choque de tipos
interface SetlistExtended extends Omit<Setlist, 'user_id'> {
  owner_name?: string;
  user_id: number | null; 
  status?: string;
}

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const Repertorios: React.FC = () => {
  const [setlists, setSetlists] = useState<SetlistExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'Usuario';
  
  let currentUserId = 0;
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = parseJwt(token);
    if (decoded && decoded.id) {
      currentUserId = Number(decoded.id);
    }
  }

  const fetchSetlists = useCallback(async () => {
    try {
      const data = await getSetlists();
      setSetlists(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        if (err.message.includes('expirada')) {
          localStorage.clear();
          navigate('/login');
        }
      } else {
        setError('Error al cargar los repertorios');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Definimos una función asíncrona autoejecutable dentro del efecto
    const init = async () => {
      await fetchSetlists();
    };
    init();
  }, [fetchSetlists]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await createSetlist({ name: newName, event_date: newEventDate || undefined });
      setNewName('');
      setNewEventDate('');
      await fetchSetlists(); 
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    if (!window.confirm('¿Estás seguro de eliminar este repertorio permanentemente?')) return;
    
    try {
      await deleteSetlist(id);
      await fetchSetlists();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  if (loading) return <div className="loading-container">Cargando repertorios...</div>;

  return (
    <div className="repertorios-container">
      <header className="repertorios-header">
        <h2 className="repertorios-title">Gestor de Repertorios</h2>
        <div className="repertorios-header-actions">
          <button 
            onClick={() => navigate('/catalogo')} 
            className="btn-secondary"
          >
            Ir al Catálogo
          </button>
        </div>
      </header>

      {error && <div className="error-message-container">{error}</div>}

      <div className="create-setlist-card">
        <h3>Crear Nuevo Ensayo / Servicio</h3>
        <form onSubmit={handleCreate} className="create-setlist-form">
          <input
            type="text"
            placeholder="Ej: Servicio de Domingo AM"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="form-input"
            required
          />
          <input
            type="date"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
            className="form-input date-input"
          />
          <button type="submit" className="btn-primary" disabled={isCreating}>
            {isCreating ? 'Creando...' : 'Crear Repertorio'}
          </button>
        </form>
      </div>

      <div className="setlists-grid">
        {setlists.length === 0 ? (
          <p className="empty-message">No hay repertorios creados aún.</p>
        ) : (
          setlists.map((setlist: SetlistExtended) => {
            const isOwner = currentUserId !== 0 && Number(setlist.user_id) === currentUserId;
            const isAdmin = role === 'Admin';
            
            if (setlist.status === 'Borrador' && !isOwner && !isAdmin) {
                return null;
            }

            return (
              <div 
                key={setlist.id} 
                className="setlist-card setlist-card-clickable"
                onClick={() => navigate(`/repertorios/${setlist.id}`)}
                style={{ opacity: setlist.status === 'Borrador' ? 0.8 : 1 }}
              >
                <div className="setlist-card-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className="setlist-name">{setlist.name}</h3>
                    {setlist.status === 'Borrador' && (
                      <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Borrador
                      </span>
                    )}
                  </div>
                  <p className="setlist-date">
                    {setlist.event_date 
                      ? new Date(setlist.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                      : 'Sin fecha programada'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    De: {setlist.owner_name || 'Usuario'}
                  </p>
                </div>
                <div className="setlist-card-action">
                  <span>Ver repertorio &rarr;</span>
                  {(isOwner || isAdmin) && (
                    <button 
                      className="btn-danger btn-delete-setlist" 
                      onClick={(e) => handleDelete(e, setlist.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Repertorios;