import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import EstadoTrabajadorEnum
from schemas.empresas import EmpresaSimpleResponse
from schemas.roles import RolResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - TRABAJADORES
# ==========================================

class TrabajadorBase(BaseModel):
    """
    Propiedades base compartidas para el modelo de trabajador.
    """
    id: Optional[UUID] = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del trabajador")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa")
    rol_id: Optional[UUID] = Field(None, description="UUID del rol asignado al trabajador en el sistema")

    dni_nif_nie: str = Field(..., min_length=9, max_length=9, description="Número de identificación fiscal NIF o NIE")
    nombre: str = Field(..., max_length=50, description="Nombre de pila del empleado")
    apellidos: str = Field(..., max_length=100, description="Apellidos del empleado")
    numero_seguridad_social: Optional[str] = Field(None, max_length=20, description="Número de la Seguridad Social")
    fecha_nacimiento: Optional[datetime.date] = Field(None, description="Fecha de nacimiento")
    foto_url: Optional[str] = Field(None, description="Ruta relativa o URL de la foto de perfil del trabajador")

    activo: Optional[bool] = Field(None, description="Estado operativo del trabajador")
    estado: EstadoTrabajadorEnum = Field(..., description="Estado operativo actual del trabajador")
    
    fecha_alta_empresa: datetime.date = Field(..., description="Fecha de alta del trabajador en la empresa")
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja laboral en la empresa")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorCreate(TrabajadorBase):
    """
    Esquema utilizado para recibir los datos de registro o contratación desde el cliente.
    Contiene campos de contacto e identificación laboral opcionales.
    """
    model_config = ConfigDict(from_attributes=True)

class TrabajadorUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de los datos de un trabajador.
    """
    model_config = ConfigDict(from_attributes=True)

class TrabajadorSimpleResponse(TrabajadorBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil.
    Incluye los estados legales de retención y control de auditoría del sistema.
    """
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorResponse(TrabajadorSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    rol: Optional[RolResponse] = Field(None, description="Detalles del rol asociado")

    model_config = ConfigDict(from_attributes=True)
