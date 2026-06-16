import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import './index.css';
import CancionDetalle from './pages/CancionDetalle';
import CancionForm from './pages/CancionForm';
import CancionEdit from './pages/CancionEdit';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <BrowserRouter>
      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Biblioteca de Alabanzas</h1>
          <button className="btn-primary" onClick={toggleTheme}>
            Modo {theme === 'light' ? 'Oscuro' : 'Claro'}
          </button>
        </header>
        
        <main>
          <Routes>
            {/* Ruta base redirige a login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Pantalla de Autenticación */}
            <Route path="/login" element={<Login />} />
            
            {/* Placeholder para el catálogo que haremos después */}
            <Route path="/catalogo" element={<Catalogo />} />

            {/* Detalle de canción con transposición */}
            <Route path="/cancion/:id" element={<CancionDetalle />} />
            {/* Formulario para crear nueva canción */}
            <Route path="/cancion/nueva" element={<CancionForm />} />
            {/* Formulario para editar canción existente */}
            <Route path="/cancion/:id/editar" element={<CancionEdit />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;