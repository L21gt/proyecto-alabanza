import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingUsers, getAllUsers, updateUserStatus, updateUserRole } from '../services/users.service';
import { deleteSong, getPendingSongs, getDeletedSongs, restoreSong } from '../services/songs.service';
import type { PendingUser, SystemUser } from '../services/users.service';
import type { Song } from '../types';
import './AdminDashboard.css';

// Extendemos la interfaz Song localmente
type PendingSong = Song & { status?: string };
type DeletedSong = Song & { deleted_by_name?: string };

const AdminDashboard: React.FC = () => {
  // Añadimos 'cuentas' como un nuevo estado posible para las pestañas
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'cuentas' | 'canciones' | 'papelera'>('canciones');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [allAccounts, setAllAccounts] = useState<SystemUser[]>([]); // Nuevo estado para el listado global
  const [songs, setSongs] = useState<PendingSong[]>([]); 
  const [deletedSongs, setDeletedSongs] = useState<DeletedSong[]>([]);
  const [previewSong, setPreviewSong] = useState<DeletedSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // SOLUCIÓN INFALIBLE: Extraemos el ID directamente del Token JWT que viene del backend
  const token = localStorage.getItem('token');
  let currentUserId: string | null = null;
  
  if (token) {
    try {
      // El JWT tiene 3 partes separadas por punto. El payload (datos) es la parte del medio [1].
      const payloadBase64 = token.split('.')[1];
      // Decodificamos el Base64 nativamente en el navegador
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      currentUserId = String(payload.id);
    } catch (e) {
      console.error("Error al decodificar el token para obtener el ID de usuario", e);
    }
  }

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
      // Optimizamos cargando todo en paralelo
      const [usersData, accountsData, pendingSongsData, deletedSongsData] = await Promise.all([
        getPendingUsers(),
        getAllUsers(),
        getPendingSongs(),
        getDeletedSongs()
      ]);
      
      setUsers(usersData);
      setAllAccounts(accountsData);
      setSongs(pendingSongsData);
      setDeletedSongs(deletedSongsData);

      setError('');
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ==========================================
  // MANEJADORES DE ACCIONES DE USUARIOS
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

  const handleRoleChange = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'Admin' ? 'Usuario' : 'Admin';
    if (!window.confirm(`¿Estás seguro de que deseas cambiar el rol a ${newRole}?`)) return;

    try {
      await updateUserRole(id, newRole);
      await fetchData();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleBlockUser = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas SUSPENDER esta cuenta? El usuario perderá acceso al sistema.')) return;

    try {
      // Reutilizamos el estado 'Rechazado' para revocar acceso
      await updateUserStatus(id, 'Rechazado');
      await fetchData();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  // ==========================================
  // MANEJADORES DE ACCIONES DE CANCIONES
  // ==========================================

  const handleSongReject = async (id: string | number) => {
    if (!window.confirm('¿Estás seguro de que deseas rechazar y eliminar esta propuesta?')) return;
    try {
      await deleteSong(id.toString());
      await fetchData();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handleRestoreSong = async (id: string | number) => {
    if (!window.confirm('¿Estás seguro de que deseas restaurar esta canción al catálogo?')) return;
    try {
      await restoreSong(id);
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

  const renderAccountsTable = () => {
    if (allAccounts.length === 0) {
      return (
        <div className="empty-state">
          <h3>Sin cuentas</h3>
          <p>No hay cuentas registradas en el sistema.</p>
        </div>
      );
    }
    return (
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol Actual</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Acciones de Seguridad</th>
            </tr>
          </thead>
          <tbody>
            {allAccounts.map((account) => {
              // Comparamos forzando ambos a String para evitar el error de ===
              const isCurrentUser = String(account.id) === currentUserId;

              return (
                <tr key={account.id} className={account.status === 'Rechazado' ? 'row-rejected' : ''}>
                  <td>
                    <strong>{account.name}</strong>
                    <br />
                    <span className="text-muted">{account.email}</span>
                  </td>
                  <td>
                    <span className={`badge-area ${account.role === 'Admin' ? 'badge-admin' : ''}`}>
                      {account.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${account.status.toLowerCase()}`}>
                      {account.status}
                    </span>
                  </td>
                  <td>{new Date(account.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="actions-cell">
                    {isCurrentUser ? (
                      <span className="text-muted text-protected">
                        Tu cuenta (Protegida)
                      </span>
                    ) : (
                      <>
                        <button 
                          className="btn-review" 
                          onClick={() => handleRoleChange(account.id, account.role)}
                        >
                          Hacer {account.role === 'Admin' ? 'Usuario' : 'Admin'}
                        </button>
                        
                        {account.status !== 'Rechazado' && (
                          <button 
                            className="btn-reject" 
                            onClick={() => handleBlockUser(account.id)}
                          >
                            Bloquear
                          </button>
                        )}
                        
                        {account.status === 'Rechazado' && (
                          <button 
                            className="btn-approve" 
                            onClick={() => handleUserAction(account.id, 'Aprobado')}
                          >
                            Reactivar
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
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
                  <button 
                    className="btn-review" 
                    onClick={() => navigate(`/cancion/${song.id}/editar`)}
                  >
                    Revisar y Editar
                  </button>
                  <button 
                    className="btn-reject" 
                    onClick={() => handleSongReject(song.id)}
                  >
                    Eliminar Propuesta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDeletedTable = () => {
    if (deletedSongs.length === 0) {
      return (
        <div className="empty-state">
          <h3>Papelera Vacía</h3>
          <p>No hay canciones eliminadas recientemente.</p>
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
              <th>Categoría</th>
              <th>Eliminado Por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {deletedSongs.map((song) => (
              <tr key={song.id}>
                <td><strong className="text-strikethrough">{song.title}</strong></td>
                <td>{song.author}</td>
                <td>{song.category}</td>
                <td>{song.deleted_by_name || 'Usuario del Sistema'}</td>
                <td className="actions-cell">
                  <button 
                    className="btn-review" 
                    onClick={() => setPreviewSong(song)}
                  >
                    🔍 Ver Letra
                  </button>
                  <button 
                    className="btn-approve" 
                    onClick={() => handleRestoreSong(song.id)}
                  >
                    Restaurar
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
          <p className="dashboard-subtitle">Gestión de cuentas, roles y moderación del catálogo</p>
        </div>
      </header>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'solicitudes' ? 'active' : ''}`}
          onClick={() => setActiveTab('solicitudes')}
        >
          Solicitudes {users.length > 0 && `(${users.length})`}
        </button>
        <button 
          className={`tab-button ${activeTab === 'cuentas' ? 'active' : ''}`}
          onClick={() => setActiveTab('cuentas')}
        >
          Cuentas Registradas
        </button>
        <button 
          className={`tab-button ${activeTab === 'canciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('canciones')}
        >
          Canciones Pendientes {songs.length > 0 && `(${songs.length})`}
        </button>
        <button 
          className={`tab-button ${activeTab === 'papelera' ? 'active' : ''}`}
          onClick={() => setActiveTab('papelera')}
        >
          Papelera {deletedSongs.length > 0 && `(${deletedSongs.length})`}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">Cargando información...</div>
      ) : error ? (
        <div className="error-message-container">{error}</div>
      ) : (
        <>
          {activeTab === 'solicitudes' && renderUsersTable()}
          {activeTab === 'cuentas' && renderAccountsTable()}
          {activeTab === 'canciones' && renderSongsTable()}
          {activeTab === 'papelera' && renderDeletedTable()}
        </>
      )}
      
    {/* MODAL DE PREVISUALIZACIÓN DE PAPELERA */}
      {previewSong && (
        <div className="modal-overlay" onClick={() => setPreviewSong(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{previewSong.title}</h3>
              <button className="btn-close" onClick={() => setPreviewSong(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-metadata">
                <span><strong>Autor:</strong> {previewSong.author}</span>
                <span><strong>Tonalidad:</strong> <span className="badge-area">{previewSong.original_key}</span></span>
                <span><strong>Categoría:</strong> {previewSong.category}</span>
              </div>
              {/* La etiqueta pre respeta los saltos de línea de la base de datos */}
              <pre className="song-preview-content">{previewSong.content}</pre>
            </div>
            <div className="modal-footer">
              <button className="btn-reject" onClick={() => setPreviewSong(null)}>
                Cerrar
              </button>
              <button className="btn-approve" onClick={() => {
                handleRestoreSong(previewSong.id);
                setPreviewSong(null); // Cerramos el modal tras restaurar
              }}>
                Confirmar Restauración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;