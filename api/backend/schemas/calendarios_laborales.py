import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.empresas import EmpresaSimpleResponse
from schemas.festivos import FestivoSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CALENDARIOS LABORALES
# ==========================================

class CalendarioLaboralBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un calendario laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(None, description="ID único UUID autogenerado (gen_random_uuid) del calendario laboral")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo asociado al calendario laboral")

    anio: int = Field(..., description="Año numérico correspondiente al calendario (SmallInteger)")
    nombre: str = Field(..., max_length=50, description="Nombre descriptivo del calendario (Ej: 'Calendario de Oficinas 2026')")
    activo: Optional[bool] = Field(None, description="Indica si el calendario laboral está activo")

    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralCreate(CalendarioLaboralBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un calendario.
    Permite acotar el calendario a un centro de trabajo específico si fuera necesario.
    """
    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un calendario laboral.
    """
    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralSimpleResponse(CalendarioLaboralBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de última actualización real del registro (now)")

    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralResponse(CalendarioLaboralSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)

class CalendarioConFestivosSimpleResponse(CalendarioLaboralSimpleResponse):
    """
    Esquema compuesto que devuelve los datos del calendario junto con su lista de días festivos.
    """
    festivos: List[FestivoSimpleResponse] = Field(..., description="Lista de festivos vinculados al calendario")

    model_config = ConfigDict(from_attributes=True)

class CalendarioConFestivosResponse(CalendarioLaboralResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    festivos: List[FestivoSimpleResponse] = Field(..., description="Lista de festivos vinculados al calendario")

    model_config = ConfigDict(from_attributes=True)


