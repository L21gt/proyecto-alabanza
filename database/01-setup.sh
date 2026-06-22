#!/bin/bash
set -e

echo "=== Iniciando configuración de múltiples bases de datos ==="

# 1. Crear la base de datos de pruebas
echo "Creando base de datos: alabanza_db_test"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE alabanza_db_test;
EOSQL

# 2. Inyectar el diseño (init.sql) dentro de la base de datos de pruebas
echo "Aplicando estructura a alabanza_db_test..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "alabanza_db_test" -f /docker-entrypoint-initdb.d/02-init.sql

echo "=== Bases de datos inicializadas correctamente ==="