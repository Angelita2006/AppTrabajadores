import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import UUID
from schemas.empresas import EmpresaSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

class RegistroOrganizacionCompletaDTO(BaseModel):
    # Datos de la empresa
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la empresa")

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

    
    # Datos del Administrador / Primer Trabajador
    nombre_admin: str
    apellidos_admin: str
    dni_nif_nie_admin: str
    email_admin: EmailStr
    password_raw: str
    telefono_admin: Optional[str] = None
    nss_admin: Optional[str] = None
    fecha_nacimiento_admin: Optional[datetime.date] = None

class RespuestaRegistroCompletoDTO(BaseModel):
    empresa: EmpresaSimpleResponse
    usuario: UsuarioSimpleResponse

    model_config = ConfigDict(from_attributes=True)