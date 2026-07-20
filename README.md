# 📱 AppTrabajadores (Fichapp)

Sistema integral de gestión para trabajadores y control de recursos humanos, compuesto por la API Backend y la aplicación móvil oficial **Fichapp**.

---

## 🏗️ Estructura del Proyecto

El repositorio se divide en dos componentes principales además de la documentación y los scripts de base de datos:

* **`api/`**: Backend del sistema. 
  * `backend/`: Código fuente de FastAPI (rutas, modelos de base de datos, esquemas Pydantic y lógica de seguridad).
  * `alembic/`: Control de versiones y migraciones de la base de datos.
* **`mobile/`**: Aplicación móvil **Fichapp** desarrollada con Expo y React Native.
* **`docs/`**: Documentación técnica del proyecto y esquemas SQL.

---

## 🚀 Tecnologías Utilizadas

### **Backend (`api/`)**
* **Python** (versión 3.14 compatible)
* **FastAPI**: Framework web moderno y rápido para construir APIs.
* **SQLAlchemy**: ORM para la gestión de la base de datos relacional.
* **Alembic**: Herramienta de migraciones para SQLAlchemy.

### **Frontend / Móvil (`mobile/`)**
* **React Native** / **Expo**: Framework para el desarrollo de la aplicación móvil **Fichapp** multiplataforma.

---

## ⚙️ Guía de Instalación y Configuración

### 1. Configuración del Backend (API)

Accede a la carpeta de la API e instala las dependencias necesarias:

```bash
cd api
# Se recomienda crear y activar un entorno virtual
python -m venv venv
source venv/bin/activate # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install fastapi uvicorn sqlalchemy alembic
```

Para ejecutar las migraciones de la base de datos con Alembic:

```bash
alembic upgrade head
```

Para iniciar el servidor de desarrollo del backend:

```bash
cd backend
uvicorn main:app --reload
```

### 2. Configuración de la Aplicación Móvil (Fichapp)

Accede a la carpeta de la aplicación móvil e instala las dependencias:

```bash
cd mobile
npm install
```

Para iniciar Fichapp con Expo:

```bash
npx expo start
```

---

## 🔧 Variables de Entorno y Configuración

Para que el proyecto funcione correctamente, es necesario configurar las variables de entorno tanto en el backend como en el cliente móvil.

### Backend (`api/backend/.env`)

Crea un archivo `.env` dentro de la carpeta `backend` basándote en la siguiente estructura:

```env
# Configuración de la Base de Datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/fichapp_db

# Seguridad y Autenticación
SECRET_KEY=tu_clave_secreta_super_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Aplicación Móvil (`mobile/.env`)

Crea un archivo `.env` (o configura tu archivo de entorno de Expo) en la raíz de la carpeta `mobile`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## 📂 Módulos Principales del Backend

El sistema incluye modelos y rutas robustas para la gestión de:

* Gestión de Empresas, Centros de Trabajo y Departamentos.
* Control de Trabajadores, Contratos, Roles y Permisos de Usuarios.
* Control horario: Fichajes (núcleo de Fichapp), Correcciones de fichaje, Turnos y Asignaciones.
* Gestión de incidencias: Ausencias, Vacaciones y Festivos.
* Auditoría de accesos y políticas de retención.

---

## 🧪 Pruebas y Validación

### Ejecutar Tests en el Backend

Si cuentas con pruebas unitarias o de integración configuradas (por ejemplo, con `pytest`), puedes ejecutarlas desde la carpeta `api`:

```bash
cd api
pytest
```

---

## 📦 Despliegue (Deployment)

* **Backend**: Preparado para ser desplegado en servicios cloud compatibles con contenedores Docker o plataformas como Render, Railway o AWS utilizando `uvicorn` como servidor ASGI.
* **Móvil**: Compilación de Fichapp lista para producción mediante EAS (*Expo Application Services*) para generar los binarios nativos de Android (`.apk` / `.aab`) e iOS (`.ipa`).
