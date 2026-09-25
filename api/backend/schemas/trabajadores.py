import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from core.enums import EstadoTrabajadorEnum
from schemas.empresas import EmpresaResponse
from schemas.roles import RolResponse
# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - TRABAJADORES
# ==========================================

class TrabajadorBase(BaseModel):
    """
    Propiedades base compartidas para el modelo de trabajador.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    dni_nif_nie: str = Field(..., min_length=5, max_length=15, description="Número de identificación fiscal NIF o NIE")
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre de pila del empleado")
    apellidos: str = Field(..., min_length=2, max_length=150, description="Apellidos del empleado")
    estado: EstadoTrabajadorEnum = Field(EstadoTrabajadorEnum.ACTIVO, description="Estado operativo actual del trabajador")
    email: Optional[EmailStr] = Field(None, max_length=255, description="Correo electrónico de contacto")
    telefono: Optional[str] = Field(None, max_length=30, description="Teléfono de contacto")
    numero_seguridad_social: Optional[str] = Field(None, max_length=20, description="Número de la Seguridad Social")
    fecha_nacimiento: Optional[datetime.date] = Field(None, description="Fecha de nacimiento")
    rol_id: Optional[UUID] = Field(None, description="UUID del rol asignado al trabajador en el sistema")
    foto_url: Optional[str] = Field(None, description="Ruta relativa o URL de la foto de perfil del trabajador")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorCreate(TrabajadorBase):
    """
    Esquema utilizado para recibir los datos de registro o contratación desde el cliente.
    Contiene campos de contacto e identificación laboral opcionales.
    """
    pass

class TrabajadorUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de los datos de un trabajador.
    """
    empresa_id: Optional[UUID] = Field(None, description="UUID de la empresa cliente")
    dni_nif_nie: Optional[str] = Field(None, min_length=5, max_length=15, description="Número de identificación fiscal NIF o NIE")
    nombre: Optional[str] = Field(None, min_length=2, max_length=150, description="Nombre de pila del empleado")
    apellidos: Optional[str] = Field(None, min_length=2, max_length=150, description="Apellidos del empleado")
    estado: Optional[EstadoTrabajadorEnum] = Field(None, description="Estado operativo actual del trabajador")
    activo: Optional[bool] = Field(None, description="Estado operativo del trabajador")
    email: Optional[EmailStr] = Field(None, max_length=255, description="Correo electrónico de contacto")
    telefono: Optional[str] = Field(None, max_length=30, description="Teléfono de contacto")
    numero_seguridad_social: Optional[str] = Field(None, max_length=20, description="Número de la Seguridad Social")
    fecha_nacimiento: Optional[datetime.date] = Field(None, description="Fecha de nacimiento")
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja laboral en la empresa")
    rol_id: Optional[UUID] = Field(None, description="UUID del rol asignado al trabajador en el sistema")
    foto_url: Optional[str] = Field(None, description="Ruta relativa o URL de la foto de perfil del trabajador")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorSimpleResponse(TrabajadorBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil.
    Incluye los estados legales de retención y control de auditoría del sistema.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activo: bool = Field(..., description="Determina si el trabajador sigue dado de alta de forma operativa")
    fecha_alta_empresa: datetime.date = Field(..., description="Fecha formal de contratación (CURRENT_DATE)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja del empleado si aplica")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorResponse(TrabajadorSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaResponse] = Field(None, description="Detalles de la empresa asociada")
    rol: Optional[RolResponse] = Field(None, description="Detalles del rol asociado")

    model_config = ConfigDict(from_attributes=True)

class AsignarTurnosRequest(BaseModel):
    """
    Esquema para la asignación masiva de turnos a un trabajador.
    """
    turnos: List[UUID] = Field(..., description="Lista de identificadores de turnos a asignar")
    fecha_inicio: datetime.date = Field(..., description="Fecha de inicio de vigencia de los turnos")
    fecha_fin: Optional[datetime.date] = Field(None, description="Fecha de fin opcional")

    model_config = ConfigDict(from_attributes=True)

class ActualizarEstadoRequest(BaseModel):
    estado: EstadoTrabajadorEnum = Field(..., description="Nuevo estado operativo del trabajador")
    
    model_config = ConfigDict(from_attributes=True)