import pool from '../config/database';
import bcrypt from 'bcrypt';

const seedAdmin = async () => {
  try {
    // Encriptamos la contraseña "admin123"
    const hash = await bcrypt.hash('admin123', 10);
    
    await pool.query(
      `INSERT INTO users (email, password_hash, role, status) 
       VALUES ('admin@iglesia.com', $1, 'Admin', 'Aprobado')
       ON CONFLICT (email) DO NOTHING`,
      [hash]
    );
    
    console.log('✅ Usuario Admin creado exitosamente:');
    console.log('Correo: admin@iglesia.com');
    console.log('Contraseña: admin123');
  } catch (error) {
    console.error('❌ Error al crear el admin:', error);
  } finally {
    pool.end();
  }
};

seedAdmin();