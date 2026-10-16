import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - DEPARTAMENTOS
# ==========================================

class DepartamentoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un departamento
    basado en el modelo inmutable mapeado por sqlacodegen.
    """
    nombre: str = Field(..., max_length=255, description="Nombre descriptivo del departamento")
    activo: Optional[bool] = Field(None, description="Indica si el departamento está activo o no")

    model_config = ConfigDict(from_attributes=True)

class DepartamentoCreate(DepartamentoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un departamento.
    Los departamentos pertenecen a la empresa y son independientes de los centros físicos.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")

    model_config = ConfigDict(from_attributes=True)

class DepartamentoUpdate(BaseModel):
    """
    Esquema para actualizar datos de un departamento.
    """
    nombre: Optional[str] = Field(None, max_length=255, description="Nombre descriptivo del departamento")
    activo: Optional[bool] = Field(None, description="Indica si el departamento está activo o no")

    model_config = ConfigDict(from_attributes=True)

class DepartamentoSimpleResponse(DepartamentoBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye las propiedades automáticas y metadatos de auditoría temporal del sistema.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del departamento")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")

    created_at: datetime.datetime = Field(..., description="Fecha y hora de inserción real calculada por el servidor (now)")
    updated_at: datetime.datetime = Field(..., description="Fecha y hora de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class DepartamentoResponse(DepartamentoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)
