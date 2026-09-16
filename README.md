# AppTrabajadores (Fichapp)

Sistema integral de gestión para trabajadores y control de recursos humanos, compuesto por la API Backend y la aplicación móvil oficial **Fichapp**.

---

## Estructura del Proyecto

El repositorio se divide en dos componentes principales además de la documentación y los scripts de base de datos:

- **`api/`**: Backend del sistema.
  - `backend/`: Código fuente de FastAPI (rutas, modelos de base de datos, esquemas Pydantic y lógica de seguridad).
  - `alembic/`: Control de versiones y migraciones de la base de datos.
- **`mobile/`**: Aplicación móvil **Fichapp** desarrollada con Expo y React Native.
- **`docs/`**: Documentación técnica del proyecto y esquemas SQL.
  - [`API.md`](docs/API.md): documentación generada de los endpoints y esquemas OpenAPI.
  - [`openapi.json`](docs/openapi.json): contrato OpenAPI generado desde FastAPI.
  - [`generate_api_docs.py`](docs/generate_api_docs.py): generador reproducible de la documentación.
  - [`FRONTEND.md`](docs/FRONTEND.md): documentación generada de la aplicación Expo/React Native.
  - [`generate_frontend_docs.py`](docs/generate_frontend_docs.py): generador reproducible de la documentación del frontend.
  - [`frontend-html/index.html`](docs/frontend-html/index.html): documentación HTML generada desde los comentarios TSDoc/JSDoc del frontend.
  - [`generate_frontend_html.py`](docs/generate_frontend_html.py): generador HTML de los comentarios del frontend.

---

## Tecnologías Utilizadas

### **Backend (`api/`)**

- **Python** (versión 3.14 compatible)
- **FastAPI**: Framework web moderno y rápido para construir APIs.
- **SQLAlchemy**: ORM para la gestión de la base de datos relacional.
- **Alembic**: Herramienta de migraciones para SQLAlchemy.

### **Frontend / Móvil (`mobile/`)**

- **React Native** / **Expo**: Framework para el desarrollo de la aplicación móvil **Fichapp** multiplataforma.

---

## Guía de Instalación y Configuración

### 1. Configuración del Backend (API)

Accede a la carpeta de la API e instala las dependencias necesarias:

```bash

```

Para ejecutar las migraciones de la base de datos con Alembic:

```bash

```

Para iniciar el servidor de desarrollo del backend:

```bash

```

### 2. Configuración de la Aplicación Móvil (Fichapp)

Accede a la carpeta de la aplicación móvil e instala las dependencias:

```bash

```

Para iniciar Fichapp con Expo:

```bash

```

---

## 🔧 Variables de Entorno y Configuración

Para que el proyecto funcione correctamente, es necesario configurar las variables de entorno tanto en el backend como en el cliente móvil.

### Backend (`api/backend/.env`)

Crea un archivo `.env` dentro de la carpeta `backend` basándote en la siguiente estructura:

```env
GEMINI_API_KEY=
DATABASE_URL=
SECRET_KEY=
SMTP_SERVER=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAILS_FROM=
```

## Módulos Principales del Backend

El sistema incluye modelos y rutas robustas para la gestión de:

- Gestión de Empresas, Centros de Trabajo y Departamentos.
- Control de Trabajadores, Contratos, Roles y Permisos de Usuarios.
- Control horario: Fichajes (núcleo de Fichapp), Correcciones de fichaje, Turnos y Asignaciones.
- Gestión de incidencias: Ausencias, Vacaciones y Festivos.
- Auditoría de accesos y políticas de retención.

## Documentación de la API

La referencia de endpoints se genera directamente desde `app.openapi()`, por lo que los `summary`,
descripciones, parámetros, respuestas y esquemas publicados reflejan el contrato real de FastAPI.

- [Documentación Markdown de la API](docs/API.md)
- [Contrato OpenAPI en JSON](docs/openapi.json)
- Swagger UI disponible en `http://localhost:8080/docs` cuando el backend está iniciado.
- ReDoc disponible en `http://localhost:8080/redoc` cuando el backend está iniciado.

Para regenerar la documentación después de modificar rutas o esquemas:

```bash
python docs/generate_api_docs.py
```

La documentación generada no debe editarse manualmente. Si una operación necesita una descripción
mejor, actualiza su `summary` o docstring en `api/backend/routes/` y vuelve a ejecutar el generador.

## Documentación del Frontend

La guía [FRONTEND.md](docs/FRONTEND.md) describe el funcionamiento actual de la aplicación móvil:

- Arquitectura de Expo Router y protección global de sesión.
- Rutas y pantallas detectadas en `mobile/app/`.
- Visibilidad de las pestañas según el rol del usuario.
- Estado global gestionado por `ProveedorSesion` y persistencia en `AsyncStorage`.
- Módulos de dominio, servicios API, tipos TypeScript y componentes compartidos.
- Scripts disponibles para iniciar, compilar y validar la aplicación.

Para regenerarla después de modificar rutas, módulos o scripts del frontend:

```bash
python docs/generate_frontend_docs.py
```

Para generar la documentación HTML multipágina a partir de los comentarios TSDoc/JSDoc del código TypeScript:

```bash
python docs/generate_frontend_docs.py
```

El resultado se genera en `docs/frontend-html/` con portada, arquitectura, rutas, módulos y páginas
individuales por archivo documentado. La documentación HTML no debe editarse manualmente; actualiza
los comentarios `/** ... */` del código y vuelve a ejecutar el comando.

---

## Pruebas y Validación

### Ejecutar Tests en el Backend

Para pruebas unitarias o de integración configuradas (por ejemplo, con `pytest`), puedes ejecutarlas desde la carpeta `api`:

```bash
cd api
pytest
```

---

## Despliegue (Deployment)

- **Backend**: Preparado para ser desplegado en servicios cloud (compatibles con contenedores Docker o plataformas como Render, Railway o AWS) utilizando `uvicorn` como servidor ASGI.
- **Móvil**: Compilación de Fichapp lista para producción mediante EAS (_Expo Application Services_) para generar los binarios nativos de Android (`.apk` / `.aab`) e iOS (`.ipa`).
