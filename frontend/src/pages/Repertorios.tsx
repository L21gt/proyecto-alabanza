import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSetlists, createSetlist } from '../services/setlists.service';
import type { Setlist } from '../types';
import './Repertorios.css';

const Repertorios: React.FC = () => {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();

  // Utilizamos useCallback para estabilizar la función y complacer al linter
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
    // Le indicamos al linter que hacer setState aquí es intencional y seguro (Data Fetching)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSetlists();
  }, [fetchSetlists]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await createSetlist({ name: newName, event_date: newEventDate || undefined });
      setNewName('');
      setNewEventDate('');
      await fetchSetlists(); // Recargamos la lista
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="loading-container">Cargando repertorios...</div>;

  return (
    <div className="repertorios-container">
      <header className="repertorios-header">
        <h2 className="repertorios-title">Gestor de Repertorios</h2>
        <button 
          onClick={() => navigate('/catalogo')} 
          className="btn-secondary"
        >
          Ir al Catálogo
        </button>
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
          setlists.map((setlist) => (
            <div 
              key={setlist.id} 
              className="setlist-card"
              onClick={() => navigate(`/repertorios/${setlist.id}`)}
            >
              <div className="setlist-card-content">
                <h3 className="setlist-name">{setlist.name}</h3>
                <p className="setlist-date">
                  {setlist.event_date 
                    ? new Date(setlist.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                    : 'Sin fecha programada'}
                </p>
              </div>
              <div className="setlist-card-action">
                <span>Ver canciones &rarr;</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Repertorios;