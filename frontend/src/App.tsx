import { useEffect, useState } from 'react';
import './index.css';

function App() {
  // Inicializamos el estado del tema leyendo la preferencia guardada, o por defecto 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Cada vez que 'theme' cambie, actualizamos el HTML y guardamos en localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Biblioteca de Alabanzas</h1>
        <button className="btn-primary" onClick={toggleTheme}>
          Modo {theme === 'light' ? 'Oscuro' : 'Claro'}
        </button>
      </header>
      
      <main>
        <p style={{ color: 'var(--text-secondary)' }}>
          El frontend se ha inicializado correctamente. Aquí construiremos el catálogo y las hojas de canciones.
        </p>
      </main>
    </div>
  );
}

export default App;