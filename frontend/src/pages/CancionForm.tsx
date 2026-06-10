import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSong } from '../services/songs.service';
import './CancionForm.css';
import './Login.css'; // Reutilizamos estilos base de inputs

const CancionForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [originalKey, setOriginalKey] = useState('C');
  const [tempo, setTempo] = useState<number>(120);
  const [category, setCategory] = useState('Alabanza');
  const [themesInput, setThemesInput] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Limpiamos los temas: de "gozo, paz" a ["gozo", "paz"]
      const themesArray = themesInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== '');

      await createSong({
        title,
        author,
        original_key: originalKey,
        tempo,
        category,
        themes: themesArray,
        content
      });

      // Si todo sale bien, volvemos al catálogo
      navigate('/catalogo');
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 style={{ marginBottom: '2rem' }}>Nueva Canción</h2>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Título</label>
            <input type="text" className="form-input" required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          
          <div className="form-group">
            <label className="form-label">Autor / Artista</label>
            <input type="text" className="form-input" required value={author} onChange={e => setAuthor(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Tonalidad Original (Ej: C, D#m, F)</label>
            <input type="text" className="form-input" required value={originalKey} onChange={e => setOriginalKey(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Tempo (BPM)</label>
            <input type="number" className="form-input" required value={tempo} onChange={e => setTempo(Number(e.target.value))} />
          </div>

          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Alabanza">Alabanza</option>
              <option value="Adoracion">Adoración</option>
              <option value="Especial">Especial</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Etiquetas (separadas por coma)</label>
            <input type="text" className="form-input" placeholder="majestad, gratitud, comunion" value={themesInput} onChange={e => setThemesInput(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Letra y Acordes</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Usa la barra espaciadora para alinear los acordes exactamente sobre la sílaba correspondiente.
          </p>
          <textarea 
            className="form-textarea" 
            required 
            value={content} 
            onChange={e => setContent(e.target.value)}
            placeholder="C        G&#10;Dios es bueno"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-primary" style={{ backgroundColor: 'var(--text-secondary)' }} onClick={() => navigate('/catalogo')} disabled={isLoading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Canción'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CancionForm;