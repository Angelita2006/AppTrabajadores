import datetime
from pydantic import BaseModel, Field, IPvAnyAddress, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import AccionAuditoriaEnum
from schemas.empresas import EmpresaResponse
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
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente analizada (tenant)")
    accion: AccionAuditoriaEnum = Field(..., description="Tipo de acción efectuada (consulta, exportacion, descarga, etc.)")

    model_config = ConfigDict(from_attributes=True)

class AuditoriaAccesoCreate(AuditoriaAccesoBase):
    """
    Esquema utilizado de forma interna por el backend para registrar un evento
    cada vez que alguien consulta, exporta o descarga registros de la jornada.
    """
    usuario_id: Optional[UUID] = Field(None, description="ID UUID del usuario que realiza la consulta")
    trabajador_id: Optional[UUID] = Field(None, description="ID UUID del trabajador cuyo historial ha sido consultado")
    detalle: Optional[dict] = Field(default_factory=dict, description="Bloque JSONB con metadatos técnicos adicionales de la acción")
    ip_address: Optional[IPvAnyAddress] = Field(None, description="Dirección IP de red desde donde se efectúa el acceso")

class AuditoriaAccesoSimpleResponse(AuditoriaAccesoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON destinadas a los informes de auditoría,
    representantes legales o Inspectores de Trabajo.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    fecha_hora: datetime.datetime = Field(..., description="Marca de tiempo real e inmutable del acceso (now)")
    
    usuario_id: Optional[UUID] = Field(None, description="ID UUID del usuario que realizó el acceso")
    trabajador_id: Optional[UUID] = Field(None, description="ID UUID del trabajador consultado")
    detalle: Optional[dict] = Field(None, description="Metadatos técnicos almacenados")
    ip_address: Optional[IPvAnyAddress] = Field(None, description="Dirección IP registrada")

    model_config = ConfigDict(from_attributes=True)

class AuditoriaAccesoResponse(AuditoriaAccesoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario que realizó el acceso")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador consultado")

    model_config = ConfigDict(from_attributes=True)