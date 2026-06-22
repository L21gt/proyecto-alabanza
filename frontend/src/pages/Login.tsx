import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService, register as registerService } from '../services/auth.service';
import './Login.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Estados compartidos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados exclusivos de Registro (Onboarding)
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('Musico'); // Valor por defecto
  
  // Estados de UI
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación temprana de contraseñas en el frontend
    if (!isLogin && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifícalas.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await loginService(email, password);
        localStorage.setItem('token', response.token || '');
        localStorage.setItem('userRole', response.user.role);
        navigate('/catalogo');
      } else {
        // Pasamos todo el objeto de perfil al servicio
        // Concatenamos el +502 automáticamente si el usuario ingresó un teléfono
        await registerService({
          email,
          password,
          name,
          birth_date: birthDate,
          phone: phone ? `+502 ${phone}` : '', 
          area
        });
        
        setIsLogin(true);
        setError('Cuenta creada con éxito. Tu cuenta está en estado "Pendiente", un administrador debe aprobarla antes de que puedas ingresar.');
        
        // Limpiamos los campos del formulario
        setPassword('');
        setConfirmPassword('');
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

  const resetFormAndToggle = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
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
          {/* ========================================== */}
          {/* CAMPOS EXCLUSIVOS DE REGISTRO */}
          {/* ========================================== */}
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Nombre Completo</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="form-group form-row">
                <div className="form-col">
                  <label className="form-label" htmlFor="birthDate">Fecha de Nacimiento</label>
                  <input
                    id="birthDate"
                    type="date"
                    className="form-input"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="form-col">
                  <label className="form-label" htmlFor="phone">Teléfono / WhatsApp</label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+502</span>
                    <input
                      id="phone"
                      type="tel"
                      className="phone-input"
                      value={phone}
                      onChange={(e) => {
                        const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setPhone(soloNumeros);
                      }}
                      placeholder="Ej: 5555 5555"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="area">Área Principal de Servicio</label>
                <select
                  id="area"
                  className="form-input"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option value="Musico">Músico</option>
                  <option value="Cantor">Cantor</option>
                  <option value="Director">Director de Alabanza</option>
                  <option value="Sonido">Ingeniería de Sonido</option>
                  <option value="Multimedia">Multimedia / Proyección</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* CAMPOS COMPARTIDOS (Email y Password) */}
          {/* ========================================== */}
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
            {/* Texto de ayuda dinámico solo para registro, usando clase CSS */}
            {!isLogin && (
              <p className="password-helper-text">
                Debe tener al menos 8 caracteres, incluyendo una mayúscula, un número y un carácter especial (@$!%*?&).
              </p>
            )}
          </div>

          {/* ========================================== */}
          {/* CONFIRMAR CONTRASEÑA (Solo Registro) */}
          {/* ========================================== */}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

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
              onClick={resetFormAndToggle}
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