import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - RESÚMENES DE JORNADA
# ==========================================

class ResumenJornadaBase(BaseModel):
    """
    Propiedades comunes compartidas para los agregados diarios de control horario,
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    minutos_trabajados: int = Field(..., description="Minutos trabajados en la jornada")
    minutos_pausa: int = Field(..., description="Minutos de pausa en la jornada")
    minutos_extra: int = Field(..., description="Minutos extras trabajados en la jornada")
    tiene_inicidencias: Optional[bool] = Field(False, description="Indica si el resumen de jornada presenta incidencias o no")
    cerrado: Optional[bool] = Field(False, description="Indica si el resumen de jornada se encuentra cerrado o no")

    hora_entrada: datetime.datetime = Field(..., description="Hora de entrada del trabajador")
    hora_salida: datetime.datetime = Field(..., description="Hora de salida del trabajador")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaCreate(ResumenJornadaBase):
    """
    Esquema utilizado por procesos automáticos o tareas cron (jobs) del backend
    para registrar o actualizar el cálculo diario acumulado de un empleado.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador asociado")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un resumen de jornada.
    """
    minutos_trabajados: Optional[int] = Field(None, description="Minutos trabajados en la jornada")
    minutos_pausa: Optional[int] = Field(None, description="Minutos de pausa en la jornada")
    minutos_extra: Optional[int] = Field(None, description="Minutos extras trabajados en la jornada")
    tiene_inicidencias: Optional[bool] = Field(False, description="Indica si el resumen de jornada presenta incidencias o no")
    cerrado: Optional[bool] = Field(False, description="Indica si el resumen de jornada se encuentra cerrado o no")

    hora_entrada: Optional[datetime.datetime] = Field(None, description="Hora de entrada del trabajador")
    hora_salida: Optional[datetime.datetime] = Field(None, description="Hora de salida del trabajador")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaSimpleResponse(ResumenJornadaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que alimentan los cuadros de mando,
    paneles de analítica y listados rápidos en la aplicación móvil o web.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del resumen de jornada")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador asociado")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaResponse(ResumenJornadaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador asociado")

    model_config = ConfigDict(from_attributes=True)