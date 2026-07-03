import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import Repertorios from './pages/Repertorios';
import CancionDetalle from './pages/CancionDetalle';
import CancionForm from './pages/CancionForm';
import CancionEdit from './pages/CancionEdit';
import RepertorioDetalle from './pages/RepertorioDetalle';
import AdminDashboard from './pages/AdminDashboard';
import Header from './components/Header'; // <-- Importamos el Header global
import './index.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'; // Dark por defecto es más elegante
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
      {/* El Header envuelve toda la aplicación, le pasamos la función del tema */}
      <Header currentTheme={theme} onToggleTheme={toggleTheme} />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/repertorios" element={<Repertorios />} />
            <Route path="/repertorios/:id" element={<RepertorioDetalle />} />
            <Route path="/cancion/:id" element={<CancionDetalle />} />
            <Route path="/cancion/nueva" element={<CancionForm />} />
            <Route path="/cancion/:id/editar" element={<CancionEdit />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;