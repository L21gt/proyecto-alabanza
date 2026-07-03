# 🎵 Biblioteca de Alabanzas

Una plataforma web integral para la gestión de catálogos musicales, acordes, transposiciones y planificación de repertorios (setlists) para equipos de alabanza y músicos.

## 🚀 Características Principales

- **Arquitectura de Seguridad Zero Trust:** Autenticación mediante JWT, contraseñas fuertemente encriptadas y protección estricta de rutas basada en roles (`Admin` y `Musico`).
- **Flujo Editorial Integrado:** Los músicos pueden sugerir nuevas canciones. Estas se mantienen en estado "Pendiente" y no son públicas hasta que un Administrador las revisa, edita y aprueba.
- **Gestor de Repertorios (Setlists):** Creación de listas de canciones para ensayos o eventos específicos. Permite la integración de canciones existentes o la sugerencia de nuevas "al vuelo".
- **Transposición Dinámica:** Motor interno que permite cambiar la tonalidad original de las canciones automáticamente (Subir/Bajar semitonos).
- **Panel de Administración:** Interfaz dedicada para aprobar nuevos usuarios solicitantes y moderar el catálogo musical.
- **Diseño UI/UX Moderno:** Tema Oscuro/Claro global, alertas integradas, diseño completamente responsivo y separación absoluta de estilos (Cero CSS en línea).

## 🛠️ Stack Tecnológico

El proyecto está dividido en un entorno de trabajo moderno (Monorepo lógico):

**Frontend:**

- React 18
- Vite (Bundler ultra rápido)
- TypeScript (Tipado estricto)
- React Router DOM v6
- CSS3 puro (Variables nativas)

**Backend:**

- Node.js con Express
- TypeScript
- PostgreSQL (Motor de Base de Datos)
- `pg` (Driver nativo)
- JSON Web Tokens (JWT) & bcrypt

## ⚙️ Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Para correr el contenedor de PostgreSQL)
- Git

## 📦 Instalación y Configuración Local

**1. Clonar el repositorio:**
\`\`\`bash
git clone <tu-url-del-repositorio>
cd proyecto-alabanza
\`\`\`

**2. Levantar la Base de Datos:**
Asegúrate de que Docker esté abierto y ejecuta:
\`\`\`bash
docker compose up -d
\`\`\`

**3. Configurar el Backend:**
\`\`\`bash
cd backend
npm install
\`\`\`
_Crea un archivo `.env` en la carpeta `backend` basado en el `.env.example` con tus credenciales de base de datos y tu `JWT_SECRET`._

**4. Configurar el Frontend:**
\`\`\`bash
cd ../frontend
npm install
\`\`\`
_Crea un archivo `.env` en la carpeta `frontend` si necesitas apuntar a una URL de API específica (ej. `VITE_API_URL=http://localhost:3000/api`)._

## 🚀 Modo de Uso (Desarrollo)

Para una experiencia libre de conflictos de puertos, asegúrate de mantener Docker encendido **solo** para la base de datos, y levanta los servidores en tu terminal local.

**Terminal 1 (Backend):**
\`\`\`bash
cd backend
npm run dev
\`\`\`
_(El servidor iniciará en `http://localhost:3000`)_

**Terminal 2 (Frontend):**
\`\`\`bash
cd frontend
npm run dev
\`\`\`
_(Vite iniciará en `http://localhost:5173` o `5174`)_

## 🛡️ Estándares de Código

- No se utilizan tipos `any`. Las interfaces TypeScript dictan la estructura de datos (`types/index.ts`).
- Cero estilos en línea (`style={{...}}`). Cada componente React está ligado a su respectivo archivo `.css`.
- Uso exhaustivo de Linters (ESLint) para prevenir "código muerto" y variables sin uso.

---

_Desarrollado con arquitectura escalable y pensado para despliegue Serverless a cero costo._
