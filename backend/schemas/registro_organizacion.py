import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from schemas.empresas import EmpresaSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

class RegistroOrganizacionCompleta(BaseModel):
    # Datos de la licencia
    codigo_licencia: Optional[str] = Field(None, max_length=12, description="Código de licencia emitido previamente; si se omite, se crea una prueba de 14 días.")

    # Datos de la empresa
    nombre_comercial: str = Field(..., max_length=50, description="Nombre comercial de la empresa")
    razon_social: str = Field(..., max_length=50, description="RazÃ³n social o denominaciÃ³n legal")
    cif: str = Field(..., max_length=20, description="CÃ³digo de IdentificaciÃ³n Fiscal Ãºnico")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria por defecto para los centros de trabajo")
    activa: Optional[bool] = Field(None, description="Indica si la empresa estÃ¡ activa o no")
    configuracion: Optional[dict] = Field(None, description="Ajustes y parÃ¡metros especÃ­ficos en formato JSON")
    es_gestoria: Optional[bool] = Field(None, description="Indica si la empresa es una gestorÃ­a o no")
    
    codigo_cnae: Optional[str] = Field(None, max_length=10, description="CÃ³digo CNAE de la empresa")
    convenio_colectivo: Optional[str] = Field(None, max_length=50, description="Convenio colectivo aplicable a la empresa")
    direccion: Optional[str] = Field(None, max_length=50, description="DirecciÃ³n fiscal de la empresa")
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja de la empresa si aplica")
    logo_url: Optional[str] = Field(None, description="URL del logo de la empresa")

    # Datos del Administrador
    nombre_admin: str = Field(..., max_length=150, description="Nombre completo del administrador")
    email_admin: EmailStr = Field(..., max_length=150, description="Correo electrÃ³nico Ãºnico de acceso del administrador")
    telefono_admin: Optional[str] = Field(None, max_length=30, description="NÃºmero de telÃ©fono Ãºnico de acceso del administrador")
    password: str = Field(..., description="ContraseÃ±a Ãºnica de acceso del administrador")

    @field_validator("password")
    @classmethod
    def validar_limite_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password exceeds bcrypt 72-byte limit.")
        return value

class RespuestaRegistroCompletoDTO(BaseModel):
    empresa: EmpresaSimpleResponse
    usuario: UsuarioSimpleResponse

    model_config = ConfigDict(from_attributes=True)

