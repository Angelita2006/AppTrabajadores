import datetime
import decimal
from zoneinfo import available_timezones
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CENTROS DE TRABAJO
# ==========================================

class CentroTrabajoBase(BaseModel):
    """
    Propiedades comunes de negocio para la validación.
    """
    nombre: str = Field(..., max_length=50, description="Nombre identificativo del centro de trabajo")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria específica del centro de trabajo")
    codigo_ccc: Optional[str] = Field(None, max_length=20, description="Código de Cuenta de Cotización")
    direccion: Optional[str] = Field(None, max_length=50, description="Dirección postal o física")
    latitud: Optional[decimal.Decimal] = Field(None, max_digits=10, decimal_places=6, description="Latitud geográfica")  
    longitud: Optional[decimal.Decimal] = Field(None, max_digits=10, decimal_places=6, description="Longitud geográfica") 
    activo: Optional[bool] = Field(True, description="Indica si el centro de trabajo está activo")

    @field_validator("zona_horaria")
    @classmethod
    def validar_zona_horaria(cls, v: str) -> str:
        """Valida que el string pertenezca a la base de datos oficial IANA."""
        if v not in available_timezones():
            raise ValueError(f"Zona horaria no válida: '{v}'. Debe ser un identificador IANA correcto (ej. Europe/Madrid).")
        return v

    model_config = ConfigDict(from_attributes=True)

class CentroTrabajoCreate(CentroTrabajoBase):
    """
    Esquema para crear: Hereda el Base y añade obligatoriamente la empresa.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    model_config = ConfigDict(from_attributes=True)
    
class CentroTrabajoUpdate(BaseModel):
    """
    Esquema para actualización parcial (PATCH). 
    TODOS los campos son opcionales para que el cliente pueda enviar solo lo que cambie.
    """
    nombre: Optional[str] = Field(None, max_length=50, description="Nombre identificativo del centro de trabajo")
    zona_horaria: Optional[str] = Field(None, max_length=50, description="Zona horaria específica del centro de trabajo")
    codigo_ccc: Optional[str] = Field(None, max_length=20, description="Código de Cuenta de Cotización")
    direccion: Optional[str] = Field(None, max_length=50, description="Dirección postal o física")
    latitud: Optional[decimal.Decimal] = Field(None, max_digits=10, decimal_places=6, description="Latitud geográfica")
    longitud: Optional[decimal.Decimal] = Field(None, max_digits=10, decimal_places=6, description="Longitud geográfica") 
    activo: Optional[bool] = Field(True, description="Indica si el centro de trabajo está activo")

    @field_validator("zona_horaria")
    @classmethod
    def validar_zona_horaria_opcional(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in available_timezones():
            raise ValueError(f"Zona horaria no válida: '{v}'.")
        return v

    model_config = ConfigDict(from_attributes=True)

class CentroTrabajoSimpleResponse(CentroTrabajoBase):
    """
    Esquema para respuestas: Añade el ID y metadatos generados por la BD.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado")
    empresa_id: UUID = Field(..., description="ID de la empresa asociada")
    
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de actualización")

    model_config = ConfigDict(from_attributes=True)

class CentroTrabajoResponse(CentroTrabajoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")

    model_config = ConfigDict(from_attributes=True)