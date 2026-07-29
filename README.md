# 🎵 Biblioteca de Alabanzas

Una plataforma web integral para la gestión de catálogos musicales, acordes, transposiciones complejas y planificación de repertorios (setlists) para equipos de alabanza y músicos profesionales.

## 🚀 Características Principales

- **Gestor de Repertorios Avanzado:** Creación de listas de canciones para ensayos o eventos. Soporta ordenamiento intuitivo mediante **Drag & Drop** (HTML5 nativo), edición dinámica de tonalidades y sugerencia de canciones "al vuelo".
- **Transposición Dinámica Inteligente:** Motor interno de cifrado americano que permite subir o bajar semitonos al instante. Es capaz de procesar notaciones musicales complejas como bajos invertidos (`D/F#`) y acordes ligados (`C-Am`).
- **Catálogo Optimizado:** Implementación de paginación y panel de filtrado avanzado (búsqueda con _debounce_, categorías y tonalidades) para manejar grandes volúmenes de datos sin comprometer la memoria del navegador.
- **Flujo Editorial Integrado:** Sistema de moderación donde los músicos pueden sugerir canciones (estado "Pendiente") y los Administradores revisan, editan y aprueban el catálogo para el público general.
- **Arquitectura de Seguridad Robusta:** Autenticación JWT, contraseñas encriptadas (bcrypt), mitigación de ataques DoS con Rate Limiting, protección contra fuerza bruta y cabeceras seguras configuradas con Helmet.
- **Diseño UI/UX Moderno:** Tema Oscuro/Claro global, notificaciones condicionales, diseño completamente responsivo y estricta separación de estilos (Cero CSS en línea).

## 🛠️ Stack Tecnológico

El proyecto está diseñado bajo una arquitectura de monorepo lógico:

**Frontend:**

- React 18 & Vite (Bundler ultra rápido)
- TypeScript (Tipado estricto)
- React Router DOM v6
- CSS3 puro (Variables nativas)

**Backend:**

- Node.js con Express
- TypeScript
- PostgreSQL (Motor de Base de Datos relacional)
- JWT & bcrypt (Autenticación)
- Helmet & Express Rate Limit (Seguridad perimetral)

**Infraestructura & Testing:**

- Docker & Docker Compose
- Jest & Supertest (Pruebas unitarias y de integración)

## ⚙️ Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recomendado para la ejecución "cero configuraciones")
- [Node.js](https://nodejs.org/) v18+ y Git (Si se desea correr el entorno manual)

## 📦 Ejecución "Cero Configuraciones" (Recomendado)

El proyecto está completamente dockerizado. Puedes levantar la base de datos, el backend y el frontend simultáneamente con un solo comando.

**1. Clonar el repositorio e inyectar variables:**

```bash
git clone <tu-url-del-repositorio>
cd proyecto-alabanza
cp .env.example .env
```

**2. Levantar los contenedores:**

```bash
docker-compose up --build
```

¡Listo! La interfaz estará disponible en http://localhost:5173 y la API en http://localhost:3000/api.

## 💻 Ejecución para Desarrollo Local (Manual)

Si prefieres correr los servidores localmente para tener recarga en caliente directa (Hot Reload) fuera de contenedores:

**1. Base de Datos (Docker):**

```bash
docker-compose up -d db
```

**2. Servidor Backend (Terminal 1):**

```bash
cd backend
npm install
npm run dev
```

**3. Interfaz Frontend (Terminal 2):**

```bash
cd frontend
npm install
npm run dev
```

## 🛡️ Estándares y Buenas Prácticas Aplicadas

- **Tipado Estricto:** Prohibido el uso de la variante any. Las interfaces TypeScript dictan la estructura de datos y promesas en todo el sistema.

- **Clean Code & UI:** Cero estilos en línea (style={{...}}). Cada componente React cuenta con su respectivo archivo .css modular.

- **Calidad de Código:** Uso exhaustivo de ESLint para prevención de renderizados en cascada, revisión exhaustiva del array de dependencias en Hooks y limpieza de código muerto.

- **Cobertura de Pruebas:** Suite de testing que audita controladores, validaciones RBAC, y el algoritmo matemático del motor de transposición musical.

Desarrollado con arquitectura escalable, preparado para despliegue continuo (CI/CD) y orientado a la nube.
