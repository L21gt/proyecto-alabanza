import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSong } from '../services/songs.service';
import './CancionForm.css';

const CancionForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    version: '',
    original_key: 'C',
    tempo: '',
    category: 'Alabanza',
    themes: '', // Lo manejaremos como texto separado por comas
    video_link: '',
    content: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Procesamos los temas: de string separado por comas a un array limpio
      const themesArray = formData.themes
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const songPayload = {
        title: formData.title,
        author: formData.author,
        version: formData.version,
        original_key: formData.original_key,
        tempo: formData.tempo ? parseInt(formData.tempo) : undefined,
        category: formData.category,
        themes: themesArray,
        video_link: formData.video_link,
        content: formData.content
      };

      await createSong(songPayload);
      
      const role = localStorage.getItem('userRole');
      if (role === 'Admin') {
        alert('Canción publicada exitosamente en el catálogo.');
      } else {
        alert('Sugerencia enviada exitosamente. El administrador la revisará pronto.');
      }
      
      navigate('/catalogo');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al guardar la canción.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page-container">
      <div className="form-card">
        <header className="form-header">
          <button className="btn-back" onClick={() => navigate('/catalogo')} type="button">
            &larr; Volver al Catálogo
          </button>
          <h2>Proponer Canción</h2>
          <p>Llena los datos para agregar una nueva canción a la biblioteca.</p>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="song-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">Título de la Canción *</label>
              <input type="text" id="title" name="title" required value={formData.title} onChange={handleChange} placeholder="Ej. Cuan Grande Es El" />
            </div>

            <div className="form-group">
              <label htmlFor="author">Autor Original *</label>
              <input type="text" id="author" name="author" required value={formData.author} onChange={handleChange} placeholder="Ej. Tradicional" />
            </div>

            <div className="form-group">
              <label htmlFor="version">Versión (Opcional)</label>
              <input type="text" id="version" name="version" value={formData.version} onChange={handleChange} placeholder="Ej. En Vivo, Acústica" />
            </div>

            <div className="form-group">
              <label htmlFor="original_key">Tonalidad Original *</label>
              <select id="original_key" name="original_key" value={formData.original_key} onChange={handleChange}>
                {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tempo">Tempo (BPM) (Opcional)</label>
              <input type="number" id="tempo" name="tempo" value={formData.tempo} onChange={handleChange} placeholder="Ej. 72" min="30" max="300" />
            </div>

            <div className="form-group">
              <label htmlFor="category">Categoría *</label>
              <select id="category" name="category" value={formData.category} onChange={handleChange}>
                <option value="Alabanza">Alabanza (Rápida)</option>
                <option value="Adoracion">Adoración (Lenta)</option>
                <option value="Himno">Himno</option>
                <option value="Especial">Especial</option>
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="themes">Etiquetas / Temas (Opcional)</label>
            <input type="text" id="themes" name="themes" value={formData.themes} onChange={handleChange} placeholder="Ej. fe, esperanza, cruz (separados por comas)" />
          </div>

          <div className="form-group full-width">
            <label htmlFor="video_link">Enlace de Referencia (Opcional)</label>
            <input type="url" id="video_link" name="video_link" value={formData.video_link} onChange={handleChange} placeholder="Ej. https://youtube.com/watch?v=..." />
          </div>

          <div className="form-group full-width">
            <label htmlFor="content">Letra y Acordes *</label>
            <textarea 
              id="content" 
              name="content" 
              required 
              value={formData.content} 
              onChange={handleChange} 
              placeholder="Escribe la letra aquí. Coloca los acordes justo encima de la sílaba correspondiente..."
              rows={15}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/catalogo')}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Canción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancionForm;