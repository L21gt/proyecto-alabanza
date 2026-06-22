import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingUsers, updateUserStatus } from '../services/users.service';
import type { PendingUser } from '../services/users.service';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificación de seguridad adicional en el frontend
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'Admin') {
      navigate('/catalogo');
    }
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingUsers();
      setUsers(data);
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
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (id: number, status: 'Aprobado' | 'Rechazado') => {
    const action = status === 'Aprobado' ? 'aprobar' : 'rechazar';
    if (!window.confirm(`¿Estás seguro de que deseas ${action} a este usuario?`)) return;

    try {
      await updateUserStatus(id, status);
      // Recargamos la lista para que el usuario desaparezca de la tabla de pendientes
      await fetchUsers();
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/catalogo')}>
            &larr; Volver al Catálogo
          </button>
          <h2 className="dashboard-title">Panel de Administración</h2>
          <p className="dashboard-subtitle">Gestión de solicitudes de acceso a la plataforma</p>
        </div>
      </header>

      {loading ? (
        <div className="loading-container">Cargando solicitudes...</div>
      ) : error ? (
        <div className="error-message-container">{error}</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h3>¡Todo al día!</h3>
          <p>No hay usuarios pendientes de aprobación en este momento.</p>
        </div>
      ) : (
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
                  <td>
                    <span className="badge-area">{user.area}</span>
                  </td>
                  <td>{user.phone || 'No especificado'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="actions-cell">
                    <button 
                      className="btn-approve" 
                      onClick={() => handleStatusChange(user.id, 'Aprobado')}
                    >
                      Aprobar
                    </button>
                    <button 
                      className="btn-reject" 
                      onClick={() => handleStatusChange(user.id, 'Rechazado')}
                    >
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;