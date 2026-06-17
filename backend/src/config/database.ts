import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  // La variable clave es host. Si existe POSTGRES_HOST (en Docker será 'db'), la usa. Si no, usa localhost.
  host: process.env.POSTGRES_HOST || 'localhost',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'proyecto_alabanza',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

// Prueba la conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('Conexión exitosa a la base de datos PostgreSQL');
  }
  if (release) release();
});

export default pool;