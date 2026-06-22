import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Inicializamos el Pool de conexiones a PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'proyecto_alabanza',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

/**
 * Health check de la base de datos en tiempo de inicialización.
 * Se omite intencionalmente en el entorno de pruebas (NODE_ENV === 'test')
 * para prevenir 'Open Handles' y llamadas a console.log post-ejecución en Jest.
 */
if (process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error al conectar a la base de datos:', err.stack);
    } else {
      console.log('Conexión exitosa a la base de datos PostgreSQL');
    }
    if (release) release();
  });
}

export default pool;