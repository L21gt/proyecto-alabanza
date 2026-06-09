import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/auth.service';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Hook de React Router para cambiar de página
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await loginUser(email, password);
      
      // Guardamos el token en localStorage para mantener la sesión
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Si el login es exitoso, viajamos al catálogo
      navigate('/catalogo');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error desconocido');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title" id="login-heading">Iniciar Sesión</h2>
        
        {error && (
          <div className="error-message" id="login-error-alert" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label htmlFor="email-input" className="form-label">Correo Electrónico</label>
            <input
              type="email"
              id="email-input"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@iglesia.com"
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password-input" className="form-label">Contraseña</label>
            <input
              type="password"
              id="password-input"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary btn-submit" 
            id="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;