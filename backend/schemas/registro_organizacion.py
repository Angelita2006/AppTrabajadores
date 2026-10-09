import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from schemas.empresas import EmpresaSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

class RegistroOrganizacionCompletaDTO(BaseModel):
    # Datos de la licencia
    codigo_licencia: str = Field(..., max_length=12, description="Código de la licencia")

    # Datos de la empresa
    nombre_comercial: str = Field(..., description="Nombre comercial de la empresa")
    razon_social: str = Field(..., max_length=50, description="Razón social o denominación legal")
    cif: str = Field(..., max_length=20, description="Código de Identificación Fiscal único")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria por defecto para los centros de trabajo")
    activa: Optional[bool] = Field(None, description="Indica si la empresa está activa o no")
    configuracion: Optional[dict] = Field(None, description="Ajustes y parámetros específicos en formato JSON")
    es_gestoria: Optional[bool] = Field(None, description="Indica si la empresa es una gestoría o no")
    
    codigo_cnae: Optional[str] = Field(None, max_length=10, description="Código CNAE de la empresa")
    convenio_colectivo: Optional[str] = Field(None, max_length=50, description="Convenio colectivo aplicable a la empresa")
    direccion: Optional[str] = Field(None, max_length=50, description="Dirección fiscal de la empresa")
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja de la empresa si aplica")
    logo_url: Optional[str] = Field(None, description="URL del logo de la empresa")

    # Datos del Administrador
    nombre_admin: str = Field(..., max_length=150, description="Nombre completo del administrador")
    email_admin: EmailStr = Field(..., max_length=30, description="Correo electrónico único de acceso del administrador")
    telefono_admin: Optional[str] = Field(None, max_length=30, description="Número de teléfono único de acceso del administrador")
    password: str = Field(..., description="Contraseña única de acceso del administrador")

class RespuestaRegistroCompletoDTO(BaseModel):
    empresa: EmpresaSimpleResponse
    usuario: UsuarioSimpleResponse

    model_config = ConfigDict(from_attributes=True)