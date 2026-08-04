import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSetlists, createSetlist, deleteSetlist } from '../services/setlists.service';
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
  const role = localStorage.getItem('userRole');

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
      await fetchSetlists(); 
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // NUEVA FUNCIÓN: Eliminar Repertorio
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Evita que al hacer clic en "Eliminar" se abra el detalle del repertorio
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
        {/* Se sustituyó el estilo inline por una clase CSS dedicada */}
        <div className="repertorios-header-actions">
          {/* BOTÓN AGREGADO PARA SUGERIR CANCIONES */}
          <button 
            onClick={() => navigate('/cancion/nueva')} 
            className="btn-primary"
          >
            {role === 'Admin' ? '+ Agregar Canción al Catálogo' : '+ Sugerir Nueva Canción'}
          </button>
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
          setlists.map((setlist) => (
            <div 
              key={setlist.id} 
              className="setlist-card"
              onClick={() => navigate(`/repertorios/${setlist.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="setlist-card-content">
                <h3 className="setlist-name">{setlist.name}</h3>
                <p className="setlist-date">
                  {setlist.event_date 
                    ? new Date(setlist.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                    : 'Sin fecha programada'}
                </p>
              </div>
              <div className="setlist-card-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Ver canciones &rarr;</span>
                {/* BOTÓN PARA ELIMINAR */}
                <button 
                  className="btn-danger" 
                  onClick={(e) => handleDelete(e, setlist.id)}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Repertorios;