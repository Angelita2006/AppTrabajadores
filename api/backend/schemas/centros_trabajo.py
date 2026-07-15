import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class CentroTrabajoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un centro de trabajo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    nombre: str = Field(..., max_length=255, description="Nombre identificativo del centro de trabajo")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria específica del centro de trabajo")


class CentroTrabajoCreate(CentroTrabajoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un centro de trabajo.
    Contiene campos de localización y registro de cotización opcionales.
    """
    codigo_ccc: Optional[str] = Field(None, max_length=20, description="Código de Cuenta de Cotización a la Seguridad Social")
    direccion: Optional[str] = Field(None, description="Dirección postal o física del centro")

class CentroTrabajoUpdate(BaseModel):
    """
    Esquema para la actualización parcial de un centro de trabajo.
    Todos los campos son opcionales para permitir actualizaciones 'patch'.
    """
    nombre: Optional[str] = Field(None, max_length=255, description="Nuevo nombre del centro")
    zona_horaria: Optional[str] = Field(None, max_length=50, description="Nueva zona horaria")
    activo: Optional[bool] = Field(None, description="Cambiar estado operativo del centro")
    codigo_ccc: Optional[str] = Field(None, max_length=20, description="Actualizar código CCC")
    direccion: Optional[str] = Field(None, description="Actualizar dirección postal")

    class Config:
        from_attributes = True

class CentroTrabajoResponse(CentroTrabajoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    Muestra la vigencia operativa y los metadatos de auditoría temporal del sistema.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activo: bool = Field(..., description="Determina si el centro de trabajo se encuentra operativo")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    codigo_ccc: Optional[str] = Field(None)
    direccion: Optional[str] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
