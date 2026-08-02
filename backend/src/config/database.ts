import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// 1. Elegimos el archivo .env correcto según el entorno de Node
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

// 2. Cargamos las variables con override: true para garantizar que .env.test tenga prioridad en Jest
dotenv.config({
  path: envFile,
  override: true,
});

// Detectamos de forma automática si la URL apunta al entorno local (localhost o 127.0.0.1)
const isLocal =
  process.env.DATABASE_URL?.includes('localhost') ||
  process.env.DATABASE_URL?.includes('127.0.0.1');

/* istanbul ignore next */
const poolConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // En local desactivamos SSL, en la nube lo activamos automáticamente
      ssl: isLocal
        ? false
        : {
            rejectUnauthorized: false,
          },
    }
  : {
      host: process.env.POSTGRES_HOST || 'localhost',
      user: process.env.POSTGRES_USER || 'admin',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'proyecto_alabanza',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    };

// Inicializamos el Pool de conexiones a PostgreSQL
const pool = new Pool(poolConfig);

/**
 * Health check de la base de datos en tiempo de inicialización.
 * Se omite intencionalmente en el entorno de pruebas (NODE_ENV === 'test')
 * para prevenir 'Open Handles' y llamadas a console.log post-ejecución en Jest.
 */
/* istanbul ignore next */
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