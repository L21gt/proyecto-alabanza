import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentTheme, onToggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const role = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName') || 'Usuario'; 

  const handleLogout = () => {
    localStorage.clear(); // Limpiamos todo de forma segura
    navigate('/login');
  };

  // Condición simplificada: Solo lo ocultamos en el Login o la raíz absoluta
  if (location.pathname === '/login' || location.pathname === '/') {
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