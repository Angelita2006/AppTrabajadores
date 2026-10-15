import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE_CONFIGURED = os.getenv("FICHAPP_ENV_FILE")
ENV_FILE_PROJECT = BASE_DIR / ".env"
ENV_FILE_LEGACY = Path(__file__).resolve().parents[3] / ".env"
if ENV_FILE_CONFIGURED:
    ENV_FILE = Path(ENV_FILE_CONFIGURED).expanduser()
elif ENV_FILE_PROJECT.exists():
    ENV_FILE = ENV_FILE_PROJECT
elif ENV_FILE_LEGACY.exists():
    # Compatibilidad con la ubicación externa usada por la configuración anterior.
    ENV_FILE = ENV_FILE_LEGACY
else:
    ENV_FILE = ENV_FILE_PROJECT

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = ""
    DB_NAME: str = ""
    SECRET_KEY: str = ""
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 0
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    URL: str = ""
    ALLOWED_ORIGINS: str = ""
    UPLOAD_DIR: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_BASICO_MENSUAL: str = ""
    STRIPE_PRICE_BASICO_ANUAL: str = ""
    STRIPE_PRICE_PRO_MENSUAL: str = ""
    STRIPE_PRICE_PRO_ANUAL: str = ""
    STRIPE_PRICE_ENTERPRISE_MENSUAL: str = ""
    STRIPE_PRICE_ENTERPRISE_ANUAL: str = ""
    STRIPE_SUCCESS_URL: str = ""
    STRIPE_CANCEL_URL: str = ""
    STRIPE_AUTOMATIC_TAX_ENABLED: bool = False
    
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="forbid"
    )

settings = Settings()


def obtener_directorio_archivos() -> Path:
    """Devuelve la carpeta privada compartida para los archivos de la aplicación."""
    if settings.UPLOAD_DIR.strip():
        directorio = Path(settings.UPLOAD_DIR).expanduser()
        if not directorio.is_absolute():
            directorio = BASE_DIR / directorio
        return directorio.resolve()

    # Mantiene la ubicación histórica para no dejar huérfanos archivos existentes.
    return Path(__file__).resolve().parents[3] / "static"


def obtener_url_publica() -> str:
    """Valida y devuelve el origen público usado en enlaces de confirmación."""
    url = settings.URL.strip().rstrip("/")
    if not url:
        raise RuntimeError("URL debe contener el origen público del frontend.")
    if "://" not in url:
        esquema = "https" if settings.ENVIRONMENT.strip().lower() == "production" else "http"
        url = f"{esquema}://{url}"
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path not in {"", "/"}:
        raise RuntimeError("URL debe ser un origen válido, sin rutas ni parámetros.")
    if settings.ENVIRONMENT.strip().lower() == "production" and parsed.scheme != "https":
        raise RuntimeError("URL debe usar HTTPS en producción.")
    return url


def validar_configuracion_produccion() -> None:
    """Falla al arrancar si faltan secretos o ajustes esenciales de producción."""
    if not settings.DATABASE_URL.strip():
        raise RuntimeError("DATABASE_URL es obligatoria para iniciar la API.")

    try:
        database_url = make_url(settings.DATABASE_URL)
    except Exception as exc:
        raise RuntimeError("DATABASE_URL no tiene un formato válido.") from exc
    if database_url.drivername not in {"postgresql", "postgresql+psycopg2"}:
        raise RuntimeError("Fichapp requiere PostgreSQL para aplicar RLS, triggers y migraciones.")

    secret_key = settings.SECRET_KEY.strip()
    secret_key_lower = secret_key.casefold()
    if (
        len(secret_key.encode("utf-8")) < 32
        or secret_key_lower.startswith(("replace", "reemplazar", "change-me"))
    ):
        raise RuntimeError("SECRET_KEY debe contener al menos 32 bytes.")

    if settings.ENVIRONMENT.strip().lower() == "production":
        origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
        if not origins:
            raise RuntimeError("ALLOWED_ORIGINS debe configurarse en producción.")
        if "*" in origins:
            raise RuntimeError("ALLOWED_ORIGINS no puede contener '*' cuando CORS permite credenciales.")
        if any(not origin.startswith("https://") for origin in origins):
            raise RuntimeError("Todos los ALLOWED_ORIGINS de producción deben usar HTTPS.")
        if not settings.UPLOAD_DIR.strip():
            raise RuntimeError("UPLOAD_DIR debe apuntar a una carpeta privada en producción.")
        if not Path(settings.UPLOAD_DIR).expanduser().is_absolute():
            raise RuntimeError("UPLOAD_DIR debe ser una ruta absoluta en producción.")
        obtener_url_publica()
        campos_smtp = (
            settings.SMTP_SERVER,
            settings.SMTP_USER,
            settings.SMTP_PASSWORD,
            settings.EMAILS_FROM,
        )
        if not all(valor.strip() for valor in campos_smtp) or not 1 <= settings.SMTP_PORT <= 65535:
            raise RuntimeError("La configuración SMTP debe estar completa en producción.")
