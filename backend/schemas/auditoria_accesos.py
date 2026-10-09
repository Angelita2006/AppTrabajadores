import datetime
from pydantic import BaseModel, Field, IPvAnyAddress, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import AccionAuditoriaEnum
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - AUDITORÍA DE ACCESOS
# ==========================================

class AuditoriaAccesoBase(BaseModel):
    """
    Propiedades comunes compartidas para el registro legal de accesos y consultas,
    basado en el modelo relacional inmutable mapeado por sqlacodegen.
    """
    accion: AccionAuditoriaEnum = Field(..., description="Tipo de acción efectuada (consulta, exportacion, descarga, etc.)")
    fecha_hora: datetime.datetime = Field(default_factory=datetime.datetime.now, description="Fecha y hora de tiempo real e inmutable del acceso (now)")
    detalle: Optional[dict] = Field(None, description="Bloque JSONB con metadatos técnicos adicionales de la acción")
    ip_address: Optional[IPvAnyAddress] = Field(None, description="Dirección IP de red desde donde se efectúa el acceso")   

    model_config = ConfigDict(from_attributes=True)

class AuditoriaAccesoCreate(AuditoriaAccesoBase):
    """
    Esquema utilizado de forma interna por el backend para registrar un evento
    cada vez que alguien consulta, exporta o descarga registros de la jornada.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente analizada (tenant)")
    usuario_id: Optional[UUID] = Field(None, description="ID único UUID del usuario que realiza la acción")
    trabajador_id: Optional[UUID] = Field(None, description="ID único UUID del trabajador consultado, si aplica")
    
    model_config = ConfigDict(from_attributes=True)

class AuditoriaAccesoSimpleResponse(AuditoriaAccesoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON destinadas a los informes de auditoría,
    representantes legales o Inspectores de Trabajo.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del registro de auditoría")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente analizada (tenant)")
    usuario_id: Optional[UUID] = Field(None, description="ID único UUID del usuario que realiza la acción")
    trabajador_id: Optional[UUID] = Field(None, description="ID único UUID del trabajador consultado, si aplica")
    
    model_config = ConfigDict(from_attributes=True)

class AuditoriaAccesoResponse(AuditoriaAccesoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario que realizó el acceso")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador consultado")

    model_config = ConfigDict(from_attributes=True)