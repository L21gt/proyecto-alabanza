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
import Header from './components/Header';
import './index.css';
import Presentacion from './pages/Presentacion';

// AÑADIDO: Importamos el componente del Historial 
// (Nota: Si tu archivo se llama diferente, por ejemplo 'Historial.tsx', ajusta el nombre aquí)
import CancionHistorial from './pages/CancionHistorial'; 

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
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
            
            {/* RUTAS CORREGIDAS: Ahora coinciden exactamente con los botones */}
            <Route path="/cancion/editar/:id" element={<CancionEdit />} />
            <Route path="/cancion/historial/:id" element={<CancionHistorial />} />
            
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/repertorios/:id/presentacion" element={<Presentacion />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;