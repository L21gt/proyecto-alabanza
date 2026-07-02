import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSongById, updateSong, deleteSong } from '../services/songs.service';
import './CancionForm.css';
import './Login.css';

const CancionEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [originalKey, setOriginalKey] = useState('');
  const [tempo, setTempo] = useState<number>(120);
  const [category, setCategory] = useState('Alabanza');
  const [themesInput, setThemesInput] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const loadSongData = async () => {
      if (!id) return;
      try {
        const data = await getSongById(id);
        setTitle(data.title);
        setAuthor(data.author);
        setOriginalKey(data.original_key);
        setTempo(data.tempo || 120);
        setCategory(data.category);
        setContent(data.content);
        if (data.themes) {
          setThemesInput(data.themes.join(', '));
        }
      } catch (err) {
        console.error("Error al cargar la canción:", err);
        setError('No se pudieron cargar los datos de la canción');
      }
    };
    loadSongData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsLoading(true);
    setError('');

    try {
      const themesArray = themesInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== '');

      await updateSong(id, {
        title,
        author,
        original_key: originalKey,
        tempo,
        category,
        themes: themesArray,
        content
      });

      navigate(`/cancion/${id}`);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmDelete = window.confirm('¿Está seguro de que desea eliminar esta canción de forma permanente?');
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      await deleteSong(id);
      navigate('/catalogo');
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>Editar Canción</h2>
        <button 
          type="button" 
          className="btn-danger" 
          onClick={handleDelete}
          disabled={isLoading}
        >
          Eliminar Canción
        </button>
      </div>
      
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
            <label className="form-label">Tonalidad Original</label>
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
            <input type="text" className="form-input" value={themesInput} onChange={e => setThemesInput(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Letra y Acordes</label>
          <textarea
            className="form-textarea" 
            required 
            rows={15}
            value={content} 
            onChange={e => setContent(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-primary" style={{ backgroundColor: 'var(--text-secondary)' }} onClick={() => navigate(`/cancion/${id}`)} disabled={isLoading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CancionEdit;