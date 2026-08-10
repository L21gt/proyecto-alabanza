import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// La función 'up' aplica los cambios a la base de datos
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Agregamos las columnas para el Borrado Lógico (Soft Deletes)
    ALTER TABLE songs
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);
}

// La función 'down' deshace los cambios (por si necesitas revertir la migración)
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE songs
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS deleted_by;
  `);
}