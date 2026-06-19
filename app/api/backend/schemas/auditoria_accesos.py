import datetime
from pydantic import BaseModel, Field, IPvAnyAddress
from typing import Optional
from uuid import UUID
from models.enums import AccionAuditoriaEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class AuditoriaAccesoBase(BaseModel):
    """
    Propiedades comunes compartidas para el registro legal de accesos y consultas,
    basado en el modelo relacional inmutable mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente analizada (tenant)")
    accion: AccionAuditoriaEnum = Field(..., description="Tipo de acción efectuada (consulta, exportacion, descarga, etc.)")


class AuditoriaAccesoCreate(AuditoriaAccesoBase):
    """
    Esquema utilizado de forma interna por el backend para registrar un evento
    cada vez que alguien consulta, exporta o descarga registros de la jornada.
    """
    usuario_id: Optional[UUID] = Field(None, description="ID UUID del usuario que realiza la consulta")
    trabajador_id: Optional[UUID] = Field(None, description="ID UUID del trabajador cuyo historial ha sido consultado")
    detalle: Optional[dict] = Field(default_factory=dict, description="Bloque JSONB con metadatos técnicos adicionales de la acción")
    ip_address: Optional[IPvAnyAddress] = Field(None, description="Dirección IP de red desde donde se efectúa el acceso")


class AuditoriaAccesoResponse(AuditoriaAccesoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON destinadas a los informes de auditoría,
    representantes legales o Inspectores de Trabajo.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    fecha_hora: datetime.datetime = Field(..., description="Marca de tiempo real e inmutable del acceso (now)")
    
    # Propiedades complementarias de trazabilidad relacional
    usuario_id: Optional[UUID] = Field(None)
    trabajador_id: Optional[UUID] = Field(None)
    detalle: Optional[dict] = Field(None)
    ip_address: Optional[IPvAnyAddress] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
