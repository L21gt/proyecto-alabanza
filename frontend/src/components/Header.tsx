import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentTheme, onToggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado para controlar el menú en dispositivos móviles
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const role = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName') || 'Usuario'; 

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/login');
  };

  // Cierra el menú móvil al navegar
  const closeMenu = () => setIsMenuOpen(false);

  if (location.pathname === '/login' || location.pathname === '/') {
    return null; 
  }

  return (
    <header className="global-header">
      <div className="header-brand-container">
        <div className="header-brand">
          <Link to="/catalogo" className="brand-link" onClick={closeMenu}>
            🎵 Biblioteca de Alabanzas
          </Link>
        </div>
        
        {/* Botón Hamburguesa (solo visible en móviles) */}
        <button 
          className="mobile-toggle" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Alternar menú"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      
      {/* Contenedor colapsable en móviles */}
      <div className={`header-content ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="header-nav">
          <Link to="/catalogo" className="nav-link" onClick={closeMenu}>Catálogo</Link>
          <Link to="/repertorios" className="nav-link" onClick={closeMenu}>Repertorios</Link>
        </div>

        <div className="header-user-info">
          <button onClick={onToggleTheme} className="btn-theme-toggle" title="Cambiar Tema">
            {currentTheme === 'light' ? '🌙' : '☀️'}
          </button>

          <span className="user-greeting">Bienvenido, <strong>{userName}</strong></span>
          <span className="badge-role">{role}</span>
          
          {role === 'Admin' && (
            <button 
              onClick={() => { navigate('/admin'); closeMenu(); }} 
              className="btn-header-admin"
            >
              Panel Admin
            </button>
          )}
          
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;