import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService, register as registerService } from '../services/auth.service';
import './Login.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true); // Controla si mostramos Login o Registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Flujo de Iniciar Sesión
        const response = await loginService(email, password);
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', response.user.role);
        navigate('/catalogo');
      } else {
        // Flujo de Registro
        await registerService(email, password);
        // Si el registro es exitoso, pasamos automáticamente al modo Login para que entre
        setIsLogin(true);
        setError('Cuenta creada con éxito. Ahora puedes iniciar sesión.'); // Usamos el área de error como mensaje de éxito temporal
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>
        
        {error && (
          <div className="error-message" style={{ backgroundColor: error.includes('éxito') ? '#dcfce3' : '#fee2e2', color: error.includes('éxito') ? '#166534' : '#991b1b' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading 
              ? 'Procesando...' 
              : isLogin ? 'Ingresar' : 'Registrarse'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-color)', 
                cursor: 'pointer',
                fontWeight: 'bold',
                marginLeft: '0.5rem',
                fontSize: '0.9rem'
              }}
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;