import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar las variables de entorno del archivo .env
dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Comprobar la conexión inicial
pool.on('connect', () => {
  console.log('Conexión exitosa a la base de datos PostgreSQL');
});

export default pool;