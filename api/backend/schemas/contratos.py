import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from typing import Any, Optional
from uuid import UUID
from core.enums import TipoContratoEnum, TipoJornadaEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CONTRATOS
# ==========================================

class ContratoUpdate(BaseModel):
    """
    Esquema para la actualización parcial de un contrato laboral.
    """
    empresa_id: Optional[UUID] = Field(None, description="ID de la empresa")
    centro_trabajo_id: Optional[UUID] = Field(None, description="ID del centro de trabajo")
    tipo_contrato: Optional[TipoContratoEnum] = Field(None, description="Modalidad del contrato")
    tipo_jornada: Optional[TipoJornadaEnum] = Field(None, description="Tipo de jornada pactada")
    horas_semana: Optional[Decimal] = Field(None, gt=Decimal('0'), max_digits=5, decimal_places=2, description="Horas semanales")
    fecha_inicio: Optional[datetime.date] = Field(None, description="Fecha de inicio")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización")
    departamento_id: Optional[UUID] = Field(None, description="ID del departamento")
    puesto_trabajo: Optional[str] = Field(None, max_length=150, description="Puesto de trabajo")
    categoria_profesional: Optional[str] = Field(None, max_length=150, description="Categoría profesional")
    trabajador_id: Optional[UUID] = Field(None, description="ID del trabajador")
    calendario_laboral_id: Optional[UUID] = Field(None, description="ID único UUID del calendario laboral asignado")

    model_config = ConfigDict(from_attributes=True)

class ContratoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un contrato laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    calendario_laboral_id: Optional[UUID] = Field(None, description="ID único UUID del calendario laboral asignado")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador contratado")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa contratante (tenant)")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo asignado")
    tipo_contrato: TipoContratoEnum = Field(..., description="Modalidad del contrato (indefinido, temporal, etc.)")
    tipo_jornada: TipoJornadaEnum = Field(..., description="Tipo de jornada pactada (completa o parcial)")
    
    # Mapeado como Decimal para respetar la precisión Numeric(5, 2) de la base de datos
    horas_semana: Decimal = Field(..., gt=Decimal('0'), max_digits=5, decimal_places=2, description="Número de horas laborables semanales")
    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio del contrato en formato AAAA-MM-DD")

class ContratoCreate(ContratoBase):
    """
    Esquema utilizado para registrar un nuevo contrato en el sistema.
    Valida las restricciones lógicas y de negocio antes de la inserción.
    """
    calendario_laboral_id: Optional[UUID] = Field(None, description="ID único UUID del calendario laboral asignado")
    departamento_id: Optional[UUID] = Field(None, description="ID único UUID del departamento asignado")
    puesto_trabajo: Optional[str] = Field(None, max_length=150, description="Denominación del puesto laboral")
    categoria_profesional: Optional[str] = Field(None, max_length=150, description="Categoría según convenio profesional")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización del contrato si aplica")

    @field_validator('fecha_fin', mode='before')
    @classmethod
    def limpiar_fecha_vacancia(cls, v: Any) -> Optional[datetime.date]:
        """
        Intercepta el valor antes del parseo de Pydantic para cadenas vacías.
        """
        if v == "" or v is None:
            return None
        return v

    @model_validator(mode='after')
    def validar_fechas_coherentes(self) -> 'ContratoCreate':
        """
        Adapta dinámicamente la validez de la fecha de fin según la modalidad contractual,
        impidiendo bloqueos de inserción y asegurando la integridad de PostgreSQL.
        """
        if self.tipo_contrato == TipoContratoEnum.INDEFINIDO:
            self.fecha_fin = None
            return self

        if self.tipo_contrato == TipoContratoEnum.TEMPORAL and not self.fecha_fin:
            raise ValueError("Los contratos temporales requieren especificar obligatoriamente una fecha de finalización.")

        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización no puede ser anterior a la fecha de inicio del contrato.")
            
        return self

class ContratoResponse(ContratoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia el frontend móvil o web.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activo: bool = Field(..., description="Determina si el contrato se encuentra vigente")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    calendario_laboral_id: Optional[UUID] = Field(None, description="ID del calendario laboral asignado")
    departamento_id: Optional[UUID] = Field(None, description="ID del departamento")
    puesto_trabajo: Optional[str] = Field(None, description="Puesto de trabajo")
    categoria_profesional: Optional[str] = Field(None, description="Categoría profesional")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización")

    model_config = ConfigDict(from_attributes=True)