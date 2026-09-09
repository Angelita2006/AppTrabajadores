from datetime import date, datetime
from pydantic import UUID4, BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.empresas import EmpresaResponse

# ==========================================
# 1. ESQUEMAS DE VALIDACIÓN (PYDANTIC) - FESTIVOS
# ==========================================

class FestivoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un día festivo
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    calendario_id: UUID = Field(..., description="ID único UUID del calendario laboral al que se asocia")
    fecha: date = Field(..., description="Fecha del día festivo en formato AAAA-MM-DD")
    tipo: str = Field("nacional", min_length=2, max_length=30, description="Ámbito del festivo (ej: 'nacional', 'autonomico', 'local')")

    model_config = ConfigDict(from_attributes=True)

class FestivoCreate(FestivoBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al registrar un festivo en el cuadrante.
    """
    descripcion: Optional[str] = Field(None, max_length=255, description="Nombre o motivo del festivo (Ej: 'Año Nuevo')")

class FestivoUpdate(BaseModel):
    """
    Esquema para la actualización de un día festivo.
    """
    calendario_id: Optional[UUID] = Field(None, description="ID único UUID del calendario laboral")
    fecha: Optional[date] = Field(None, description="Fecha del día festivo")
    tipo: Optional[str] = Field(None, min_length=2, max_length=30, description="Ámbito del festivo")
    descripcion: Optional[str] = Field(None, max_length=255, description="Nombre o motivo del festivo")

    model_config = ConfigDict(from_attributes=True)

class FestivoSimpleResponse(FestivoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    descripcion: Optional[str] = Field(None, description="Nombre o motivo del festivo")

    model_config = ConfigDict(from_attributes=True)

class FestivoResponse2(BaseModel):
    """
    Esquema simplificado alternativo para respuestas de festivos.
    """
    id: UUID
    fecha: date
    descripcion: str
    tipo: str

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CALENDARIOS LABORALES
# ==========================================

class CalendarioLaboralBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un calendario laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    anio: int = Field(..., ge=2000, le=2100, description="Año numérico correspondiente al calendario (SmallInteger)")
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre descriptivo del calendario (Ej: 'Calendario de Oficinas 2026')")

    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralCreate(CalendarioLaboralBase):
    """
    Esquema utilizado para recibir los datos desde el cliente al dar de alta un calendario.
    Permite acotar el calendario a un centro de trabajo específico si fuera necesario.
    """
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo si es un calendario específico")

class CalendarioLaboralUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un calendario laboral.
    """
    anio: Optional[int] = Field(None, ge=2000, le=2100, description="Año numérico")
    nombre: Optional[str] = Field(None, min_length=2, max_length=150, description="Nombre descriptivo del calendario")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo")

    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralSimpleResponse(CalendarioLaboralBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    created_at: datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID único UUID del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)

class CalendarioLaboralResponse(CalendarioLaboralSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)

class CalendarioConFestivosSimpleResponse(BaseModel):
    """
    Esquema compuesto que devuelve los datos del calendario junto con su lista de días festivos.
    """
    id: UUID4 = Field(..., description="Identificador único UUID del calendario")
    nombre: Optional[str] = Field(None, description="Nombre del calendario")
    anio: int = Field(..., description="Año del calendario")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo asociado si aplica")
    festivos: List[FestivoResponse2] = Field(..., description="Lista de festivos vinculados al calendario")

    model_config = ConfigDict(from_attributes=True)

class CalendarioConFestivosResponse(CalendarioConFestivosSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. RELACIÓN CRUZADA 
# ==========================================

class FestivoResponse(FestivoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    calendario: Optional[CalendarioLaboralSimpleResponse] = Field(None, description="Detalles del calendario laboral asociado")

    model_config = ConfigDict(from_attributes=True)