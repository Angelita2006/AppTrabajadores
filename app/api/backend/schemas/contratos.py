import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator
from typing import Optional
from uuid import UUID
from enums import TipoContratoEnum, TipoJornadaEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class ContratoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un contrato laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
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
    departamento_id: Optional[UUID] = Field(None, description="ID único UUID del departamento asignado")
    puesto_trabajo: Optional[str] = Field(None, max_length=150, description="Denominación del puesto laboral")
    categoria_profesional: Optional[str] = Field(None, max_length=150, description="Categoría según convenio profesional")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización del contrato si aplica")

    @model_validator(mode='after')
    def validar_fechas_coherentes(self) -> 'ContratoCreate':
        """
        Valida que la fecha de finalización sea igual o posterior a la fecha de inicio,
        emulando la restricción CheckConstraint de la base de datos.
        """
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
    
    # Propiedades complementarias opcionales
    departamento_id: Optional[UUID] = Field(None)
    puesto_trabajo: Optional[str] = Field(None)
    categoria_profesional: Optional[str] = Field(None)
    fecha_fin: Optional[datetime.date] = Field(None)

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
