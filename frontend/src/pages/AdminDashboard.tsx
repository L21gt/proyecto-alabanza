import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingUsers, updateUserStatus } from '../services/users.service';
import { getSongs, updateSongStatus, deleteSong } from '../services/songs.service';
import type { PendingUser } from '../services/users.service';
import type { Song } from '../types';
import './AdminDashboard.css';

// Extendemos la interfaz Song localmente por si 'status' aún no está definido en types.ts
type PendingSong = Song & { status?: string };

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'canciones'>('usuarios');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [songs, setSongs] = useState<PendingSong[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificación de seguridad
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'Admin') {
      navigate('/catalogo');
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Obtenemos los usuarios pendientes
      const usersData = await getPendingUsers();
      setUsers(usersData);

      // Obtenemos las canciones y filtramos solo las pendientes
      const allSongs = await getSongs();
      const pendingSongs = allSongs.filter((song: PendingSong) => song.status === 'Pendiente');
      setSongs(pendingSongs);

      setError('');
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Le indicamos al linter que confíe en este Data Fetching inicial
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ==========================================
  // MANEJADORES DE ACCIONES
  // ==========================================

  const handleUserAction = async (id: number, status: 'Aprobado' | 'Rechazado') => {
    const action = status === 'Aprobado' ? 'aprobar' : 'rechazar';
    if (!window.confirm(`¿Estás seguro de que deseas ${action} a este usuario?`)) return;

    try {
      await updateUserStatus(id, status);
      await fetchData();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleSongApprove = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas aprobar esta canción para todo el catálogo?')) return;
    try {
      await updateSongStatus(id, 'Aprobado');
      await fetchData();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleSongReject = async (id: string | number) => {
    if (!window.confirm('¿Estás seguro de que deseas rechazar y eliminar esta propuesta?')) return;
    try {
      await deleteSong(id.toString());
      await fetchData();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  // ==========================================
  // RENDERIZADO DE TABLAS
  // ==========================================

  const renderUsersTable = () => {
    if (users.length === 0) {
      return (
        <div className="empty-state">
          <h3>¡Todo al día!</h3>
          <p>No hay usuarios pendientes de aprobación en este momento.</p>
        </div>
      );
    }
    return (
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Área / Ministerio</th>
              <th>Contacto</th>
              <th>Fecha Solicitud</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <br />
                  <span className="text-muted">{user.email}</span>
                </td>
                <td><span className="badge-area">{user.area}</span></td>
                <td>{user.phone || 'No especificado'}</td>
                <td>{new Date(user.created_at).toLocaleDateString('es-ES')}</td>
                <td className="actions-cell">
                  <button className="btn-approve" onClick={() => handleUserAction(user.id, 'Aprobado')}>
                    Aprobar
                  </button>
                  <button className="btn-reject" onClick={() => handleUserAction(user.id, 'Rechazado')}>
                    Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSongsTable = () => {
    if (songs.length === 0) {
      return (
        <div className="empty-state">
          <h3>Catálogo Limpio</h3>
          <p>No hay canciones pendientes de revisión en este momento.</p>
        </div>
      );
    }
    return (
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor Original</th>
              <th>Tono Original</th>
              <th>Categoría</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.id}>
                <td><strong>{song.title}</strong></td>
                <td>{song.author}</td>
                <td><span className="badge-area">{song.original_key}</span></td>
                <td>{song.category}</td>
                <td className="actions-cell">
                  {/* Cambiamos el botón Aprobar por Revisar */}
                  <button 
                    className="btn-approve" 
                    style={{ backgroundColor: '#3b82f6' }} 
                    onClick={() => navigate(`/cancion/${song.id}/editar`)}
                  >
                    Revisar y Editar
                  </button>
                  <button className="btn-approve" onClick={() => handleSongApprove(song.id)}>
                    Aprobar Directo
                  </button>
                  <button className="btn-reject" onClick={() => handleSongReject(song.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/catalogo')}>
            &larr; Volver al Catálogo
          </button>
          <h2 className="dashboard-title">Panel de Administración</h2>
          <p className="dashboard-subtitle">Gestión de solicitudes y moderación del catálogo</p>
        </div>
      </header>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          Usuarios Solicitantes {users.length > 0 && `(${users.length})`}
        </button>
        <button 
          className={`tab-button ${activeTab === 'canciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('canciones')}
        >
          Canciones Pendientes {songs.length > 0 && `(${songs.length})`}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">Cargando información...</div>
      ) : error ? (
        <div className="error-message-container">{error}</div>
      ) : (
        <>
          {activeTab === 'usuarios' && renderUsersTable()}
          {activeTab === 'canciones' && renderSongsTable()}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;