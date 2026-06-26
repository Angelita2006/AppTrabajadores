import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class DepartamentoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un departamento
    basado en el modelo inmutable mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    nombre: str = Field(..., max_length=255, description="Nombre descriptivo del departamento")


class DepartamentoCreate(DepartamentoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un departamento.
    Permite asociar opcionalmente el departamento a un centro de trabajo físico.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo asociado")


class DepartamentoResponse(DepartamentoBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envía a la app.
    Incluye las propiedades automáticas y metadatos de auditoría temporal del sistema.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    created_at: datetime.datetime = Field(..., description="Fecha de inserción real calculada por el servidor (now)")
    updated_at: datetime.datetime = Field(..., description="Fecha de la última modificación efectuada (now)")
    
    # Propiedades complementarias opcionales
    centro_trabajo_id: Optional[UUID] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
