import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Optional
from uuid import UUID
from schemas.empresas import EmpresaSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - RELACIÓN ENTRE GESTORÍAS Y EMPRESAS
# ==========================================

class GestoriaEmpresaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una relación gestoría-empresa cliente
    basado en el modelo inmutable mapeado por sqlacodegen.
    """
    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la autorización")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha y hora de fin de la autorización")

    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaCreate(GestoriaEmpresaBase):
    """
    Esquema unificado para crear relaciones entre empresa gestora y cliente.
    """
    empresa_cliente_id: UUID = Field(..., description="ID único UUID de la empresa cliente")

    @model_validator(mode='after')
    def validar_rango_fechas_update(self) -> 'GestoriaEmpresaCreate':
        """
        Valida el rango solo si el usuario ha proporcionado ambas fechas en la petición.
        (Si solo se actualiza una, el servicio de backend deberá cruzarla con la fecha existente en BD).
        """
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización de la autorización no puede ser anterior a la fecha de inicio.")
        return self
    
    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaUpdate(BaseModel):
    """
    Esquema unificado para modificar relaciones entre empresa gestora y cliente.
    """
    fecha_inicio: Optional[datetime.date] = Field(None, description="Fecha de inicio de la autorización")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha y hora de fin de la autorización")
    activo: Optional[bool] = Field(None, description="Activa o desactiva la autorización")
    
    @model_validator(mode='after')
    def validar_rango_fechas_update(self) -> 'GestoriaEmpresaUpdate':
        """
        Valida el rango solo si el usuario ha proporcionado ambas fechas en la petición.
        (Si solo se actualiza una, el servicio de backend deberá cruzarla con la fecha existente en BD).
        """
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha de finalización de la autorización no puede ser anterior a la fecha de inicio.")
        return self
    
    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaSimpleResponse(GestoriaEmpresaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la relación gestoría-empresa cliente")
    empresa_gestora_id: UUID = Field(..., description="ID único UUID de la empresa gestora")
    empresa_cliente_id: UUID = Field(..., description="ID único UUID de la empresa cliente")
    usuario_creador_id: Optional[UUID] = Field(None, description="ID del usuario creador de la autorización, si sigue existiendo")
    permisos_delegados: List[str] = Field(default_factory=list, description="Permisos actualmente delegados por el cliente")
    permisos_maximos: List[str] = Field(default_factory=list, description="Límite superior de permisos fijado por el superadministrador")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaResponse(GestoriaEmpresaSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa_gestora: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    empresa_cliente: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    usuario_creador: Optional[UsuarioSimpleResponse] = Field(None, description="Detalles del usuario que ha creado la autorización")

    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaPermisosUpdate(BaseModel):
    """Lista explícita de permisos que el superadministrador delega en el vínculo."""
    permisos_delegados: List[str] = Field(..., max_length=200)

    model_config = ConfigDict(extra="forbid")
