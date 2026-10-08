import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
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
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la relación gestoría-empresa cliente")
    empresa_gestora_id: UUID = Field(..., description="ID único UUID de la empresa gestora")
    empresa_cliente_id: UUID = Field(..., description="ID único UUID de la empresa cliente")
    usuario_creador_id: UUID = Field(..., description="ID único UUID del usuario creador de la autorización")

    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de la autorización")
    fecha_fin: datetime.date = Field(..., description="Fecha y hora de fin de la autorización")

    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaCreate(GestoriaEmpresaBase):
    """
    Esquema unificado para recibir marcajes desde clientes web o móviles.
    Garantiza la presencia de los campos no nulos exigidos por PostgreSQL.
    """
    forzar_hora_extra: Optional[bool] = Field(False, description="Bandera para forzar fichaje en festivo como horas extra")

    model_config = ConfigDict(from_attributes=True)

class GestoriaEmpresaSimpleResponse(GestoriaEmpresaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
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