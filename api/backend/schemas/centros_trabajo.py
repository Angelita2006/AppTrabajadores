import datetime
import decimal
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CENTROS DE TRABAJO
# ==========================================

class CentroTrabajoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un centro de trabajo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del centro de trabajo")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")

    nombre: str = Field(..., max_length=50, description="Nombre identificativo del centro de trabajo")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria específica del centro de trabajo")
    codigo_ccc: Optional[str] = Field(None, max_length=20, description="Código de Cuenta de Cotización a la Seguridad Social del centro, si aplica")
    direccion: Optional[str] = Field(None, max_length=50, description="Dirección postal o física del centro de trabajo")
    latitud: Optional[decimal.Decimal] = Field(None, max_digits=10, decimal_places=6, description="Latitud geográfica del centro de trabajo")  
    longitud: Optional[decimal.Decimal] = Field(None, max_digits=10, decimal_places=6, description="Longitud geográfica del centro de trabajo") 
    activo: Optional[bool] = Field(None, description="Indica si el centro de trabajo está activo o inactivo")

    model_config = ConfigDict(from_attributes=True)

class CentroTrabajoCreate(CentroTrabajoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un centro de trabajo.
    Contiene campos de localización y registro de cotización opcionales.
    """
    model_config = ConfigDict(from_attributes=True)
    
class CentroTrabajoUpdate(BaseModel):
    """
    Esquema para la actualización parcial de un centro de trabajo.
    Todos los campos son opcionales para permitir actualizaciones 'patch'.
    """
    model_config = ConfigDict(from_attributes=True)

class CentroTrabajoSimpleResponse(CentroTrabajoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    Muestra la vigencia operativa y los metadatos de auditoría temporal del sistema.
    """
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última actualización efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class CentroTrabajoResponse(CentroTrabajoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)