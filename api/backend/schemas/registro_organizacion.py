import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from schemas.empresas import EmpresaResponse
from schemas.trabajadores import TrabajadorSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse


class RegistroOrganizacionCompletaDTO(BaseModel):
    codigo_licencia: str
    razon_social: str
    nombre_comercial: Optional[str] = None
    cif: str
    direccion_fiscal: str
    codigo_cnae: Optional[str] = None
    convenio_colectivo: Optional[str] = None
    logo_url: Optional[str] = None
    
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
    empresa: EmpresaResponse
    trabajador: TrabajadorSimpleResponse
    usuario: UsuarioSimpleResponse

    model_config = ConfigDict(from_attributes=True)