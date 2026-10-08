import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from typing import Any, Optional
from uuid import UUID
from core.enums import TipoContratoEnum, TipoJornadaEnum
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.departamentos import DepartamentoSimpleResponse
from schemas.empresas import EmpresaSimpleResponse
from schemas.trabajadores import TrabajadorSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - CONTRATOS
# ==========================================

class ContratoBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un contrato laboral
    basado en el modelo relacional mapeado por sqlacodegen.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del contrato")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa contratante (tenant)")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador contratado")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo asignado")
    departamento_id: UUID = Field(..., description="ID único UUID del departamento asignado")

    tipo_contrato: TipoContratoEnum = Field(..., description="Modalidad del contrato (indefinido, temporal, etc.)")
    tipo_jornada: TipoJornadaEnum = Field(..., description="Tipo de jornada pactada (completa o parcial)")
    horas_semana: Decimal = Field(..., max_digits=5, decimal_places=2, description="Número de horas laborables semanales")
    puesto_trabajo: Optional[str] = Field(None, max_length=50, description="Puesto de trabajo del contratado")
    categoria_profesional: Optional[str] = Field(None, max_length=50, description="Categoría profesional del contratado")

    pdf_url: Optional[str] = Field(None, description="Url o ruta del archivo en pdf del contrato")

    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio del contrato en formato AAAA-MM-DD")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de finalización del contrato si aplica")

    activo: Optional[bool] = Field(None, description="Indica si el contrato está activo o no")

    model_config = ConfigDict(from_attributes=True)

class ContratoCreate(ContratoBase):
    """
    Esquema utilizado para registrar un nuevo contrato en el sistema.
    Valida las restricciones lógicas y de negocio antes de la inserción.
    """
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

    model_config = ConfigDict(from_attributes=True)

class ContratoUpdate(BaseModel):
    """
    Esquema para la actualización parcial de un contrato.
    Todos los campos son opcionales para permitir actualizaciones 'patch'.
    """
    @field_validator('fecha_fin', 'departamento_id', mode='before')
    @classmethod
    def limpiar_vacios(cls, v: Any) -> Any:
        """Convierte cadenas vacías en None para evitar errores de parseo UUID/Date."""
        if v == "" or v is None:
            return None
        return v

    model_config = ConfigDict(from_attributes=True)

class ContratoSimpleResponse(ContratoBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia el frontend móvil o web.
    """
    model_config = ConfigDict(from_attributes=True)

class ContratoResponse(ContratoSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador asociado")
    departamento: Optional[DepartamentoSimpleResponse] = Field(None, description="Detalles del departamento asociado")

    model_config = ConfigDict(from_attributes=True)
