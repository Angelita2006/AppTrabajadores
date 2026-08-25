import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - DEPARTAMENTOS
# ==========================================

class DepartamentoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un departamento
    basado en el modelo inmutable mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    nombre: str = Field(..., min_length=2, max_length=255, description="Nombre descriptivo del departamento")

class DepartamentoCreate(DepartamentoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un departamento.
    Permite asociar opcionalmente el departamento a un centro de trabajo físico.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo asociado")

class DepartamentoUpdate(BaseModel):
    """
    Esquema para actualizar datos de un departamento.
    """
    nombre: Optional[str] = Field(None, min_length=2, max_length=255, description="Nuevo nombre descriptivo del departamento")
    centro_trabajo_id: Optional[UUID] = Field(None, description="Nuevo ID de centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)

class DepartamentoResponse(DepartamentoBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye las propiedades automáticas y metadatos de auditoría temporal del sistema.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    created_at: datetime.datetime = Field(..., description="Fecha de inserción real calculada por el servidor (now)")
    updated_at: datetime.datetime = Field(..., description="Fecha de la última modificación efectuada (now)")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo asociado si aplica")

    model_config = ConfigDict(from_attributes=True)