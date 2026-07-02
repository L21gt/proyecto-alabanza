import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './Header.css';

// 1. Definimos la interfaz para que TypeScript sepa qué props esperamos
interface HeaderProps {
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// 2. Le pasamos la interfaz al componente y extraemos las props
const Header: React.FC<HeaderProps> = ({ currentTheme, onToggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const role = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName') || 'Usuario'; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  // No mostramos el header en las pantallas de Login o Registro
  if (location.pathname === '/login' || location.pathname === '/registro' || !role) {
    return null; 
  }

  return (
    <header className="global-header">
      <div className="header-brand">
        <Link to="/catalogo" className="brand-link">
          🎵 Biblioteca de Alabanzas
        </Link>
      </div>
      
      <div className="header-nav">
        <Link to="/catalogo" className="nav-link">Catálogo</Link>
        <Link to="/repertorios" className="nav-link">Repertorios</Link>
      </div>

      <div className="header-user-info">
        {/* BOTÓN DEL TEMA AGREGADO AQUÍ */}
        <button onClick={onToggleTheme} className="btn-theme-toggle" title="Cambiar Tema">
          {currentTheme === 'light' ? '🌙' : '☀️'}
        </button>

        <span className="user-greeting">Bienvenido, <strong>{userName}</strong></span>
        <span className="badge-role">{role}</span>
        
        {role === 'Admin' && (
          <button onClick={() => navigate('/admin')} className="btn-header-admin">
            Panel Admin
          </button>
        )}
        
        <button onClick={handleLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

export default Header;