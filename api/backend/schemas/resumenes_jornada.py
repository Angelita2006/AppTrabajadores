import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from schemas.empresas import EmpresaResponse
from schemas.trabajadores import TrabajadorSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - RESÚMENES DE JORNADA
# ==========================================

class ResumenJornadaBase(BaseModel):
    """
    Propiedades comunes compartidas para los agregados diarios de control horario,
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador asociado")
    fecha: datetime.date = Field(..., description="Fecha del día computado en formato AAAA-MM-DD")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaCreate(ResumenJornadaBase):
    """
    Esquema utilizado por procesos automáticos o tareas cron (jobs) del backend
    para registrar o actualizar el cálculo diario acumulado de un empleado.
    """
    minutos_trabajados: int = Field(0, ge=0, description="Total de minutos efectivos laborados en el día")
    minutos_pausa: int = Field(0, ge=0, description="Total de minutos acumulados en descansos o pausas")
    minutos_extra: int = Field(0, ge=0, description="Total de minutos computados como horas extraordinarias")
    tiene_incidencia: bool = Field(False, description="Indica si existe un descuadre, olvido o alerta en los marcajes")
    cerrado: bool = Field(False, description="Determina si el día ha sido consolidado y bloqueado para nóminas")
    hora_entrada: Optional[datetime.datetime] = Field(None, description="Primer marcaje de entrada registrado en el día")
    hora_salida: Optional[datetime.datetime] = Field(None, description="Último marcaje de salida registrado en el día")

class ResumenJornadaUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de un resumen de jornada.
    """
    minutos_trabajados: Optional[int] = Field(None, ge=0, description="Total de minutos efectivos laborados")
    minutos_pausa: Optional[int] = Field(None, ge=0, description="Total de minutos de pausa")
    minutos_extra: Optional[int] = Field(None, ge=0, description="Total de minutos extra")
    tiene_incidencia: Optional[bool] = Field(None, description="Estado de incidencia diaria")
    cerrado: Optional[bool] = Field(None, description="Estado de cierre diario")
    hora_entrada: Optional[datetime.datetime] = Field(None, description="Primer marcaje de entrada registrado")
    hora_salida: Optional[datetime.datetime] = Field(None, description="Último marcaje de salida registrado")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaSimpleResponse(ResumenJornadaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que alimentan los cuadros de mando,
    paneles de analítica y listados rápidos en la aplicación móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    minutos_trabajados: int = Field(..., description="Minutos totales trabajados")
    minutos_pausa: int = Field(..., description="Minutos totales de pausa")
    minutos_extra: int = Field(..., description="Minutos totales extra")
    tiene_incidencia: bool = Field(..., description="Estado de incidencia diaria")
    cerrado: bool = Field(..., description="Estado de cierre diario")
    actualizado_en: datetime.datetime = Field(..., description="Marca de tiempo del último recálculo automático efectuado (now)")
    
    hora_entrada: Optional[datetime.datetime] = Field(None, description="Primer marcaje de entrada registrado en el día")
    hora_salida: Optional[datetime.datetime] = Field(None, description="Último marcaje de salida registrado en el día")

    model_config = ConfigDict(from_attributes=True)

class ResumenJornadaResponse(ResumenJornadaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador asociado")

    model_config = ConfigDict(from_attributes=True)