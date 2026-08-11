import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSongById, updateSong, deleteSong } from '../services/songs.service';
import './CancionForm.css';
import './Login.css';

const CancionEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');
  
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
  const [videoLink, setVideoLink] = useState('');
  const [originalStatus, setOriginalStatus] = useState('');

  // Calculamos en tiempo real la cantidad de etiquetas válidas
  const currentThemesCount = themesInput
    .split(',')
    .map(t => t.trim())
    .filter(t => t !== '').length;
    
  const isThemesExceeded = currentThemesCount > 10;

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
        setVideoLink(data.video_link || '');
        setOriginalStatus(data.status || '');
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

  // Permite guardar especificando si se cambia el estado a Borrador o Aprobado
  const handleSave = async (e: React.FormEvent, targetStatus?: 'Borrador' | 'Aprobado') => {
    e.preventDefault();
    if (!id) return;
    
    // Validación extra de seguridad
    if (isThemesExceeded) {
      setError('Has excedido el límite máximo de 10 etiquetas.');
      return;
    }

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
        content,
        video_link: videoLink,
        status: targetStatus || 'Aprobado'
      });

      // LÓGICA DE ENRUTAMIENTO INTELIGENTE
      if (targetStatus === 'Borrador') {
        alert('Canción guardada en estado Borrador. No aparecerá en el catálogo público.');
        navigate('/admin');
      } else if (originalStatus === 'Pendiente') {
        alert('Canción editada y aprobada exitosamente.');
        navigate('/admin');
      } else {
        alert('Cambios guardados correctamente.');
        navigate(`/cancion/${id}`);
      }
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

      <form onSubmit={(e) => handleSave(e)}>
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
            <input 
              type="text" 
              className={`form-input ${isThemesExceeded ? 'input-error' : ''}`} 
              value={themesInput} 
              onChange={e => setThemesInput(e.target.value)} 
            />
            {/* Contador dinámico integrado */}
            <div className={`themes-counter ${isThemesExceeded ? 'text-danger' : 'text-muted'}`}>
              {currentThemesCount} / 10 etiquetas permitidas
              {isThemesExceeded && <span> - Límite excedido.</span>}
            </div>
          </div>
        </div>

        <div className="form-group full-width">
          <label className="form-label">Enlace de Referencia (Video)</label>
          <input 
            type="url" 
            className="form-input" 
            value={videoLink} 
            onChange={e => setVideoLink(e.target.value)} 
            placeholder="Ej. https://youtube.com/watch?v=..."
          />
        </div>

        <div className="form-group full-width">
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
          {/* Usamos btn-secondary que es el estándar del otro formulario */}
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => navigate(-1)}
            disabled={isLoading}
          >
            Cancelar
          </button>

          {/* Opción editorial de guardar revisión incompleta solo visible para Admin */}
          {role === 'Admin' && (
            <button 
              type="button" 
              className="btn-draft" 
              disabled={isLoading || isThemesExceeded}
              onClick={(e) => handleSave(e, 'Borrador')}
            >
              {isLoading ? 'Guardando...' : '💾 Guardar como Borrador'}
            </button>
          )}

          <button type="submit" className="btn-primary" disabled={isLoading || isThemesExceeded}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios y Publicar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CancionEdit;