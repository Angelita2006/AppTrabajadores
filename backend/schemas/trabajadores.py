import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from core.enums import EstadoTrabajadorEnum
from schemas.empresas import EmpresaSimpleResponse
from schemas.usuarios import UsuarioSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - TRABAJADORES
# ==========================================

class TrabajadorBase(BaseModel):
    """
    Propiedades base compartidas para el modelo de trabajador.
    """
    dni_nif_nie: str = Field(..., min_length=9, max_length=9, description="Número de identificación fiscal NIF o NIE")
    nombre: str = Field(..., max_length=50, description="Nombre de pila del empleado")
    apellidos: str = Field(..., max_length=100, description="Apellidos del empleado")
    numero_seguridad_social: Optional[str] = Field(None, max_length=20, description="Número de la Seguridad Social")
    fecha_nacimiento: Optional[datetime.date] = Field(None, description="Fecha de nacimiento")
    foto_url: Optional[str] = Field(None, description="Ruta relativa o URL de la foto de perfil del trabajador")

    activo: Optional[bool] = Field(True, description="Estado operativo del trabajador")
    estado: EstadoTrabajadorEnum = Field(..., description="Estado operativo actual del trabajador")
    
    fecha_alta_empresa: datetime.date = Field(..., description="Fecha de alta del trabajador en la empresa")
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja laboral en la empresa")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorCreate(TrabajadorBase):
    """
    Esquema utilizado para recibir los datos de registro o contratación desde el cliente.
    Contiene campos de contacto e identificación laboral opcionales.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa")
    usuario_id: Optional[UUID] = Field(None, description="Cuenta de usuario vinculada al trabajador para acceso propio")
    email: Optional[EmailStr] = Field(None, description="Correo de acceso; si ya existe una cuenta se vincula a ella")
    telefono: Optional[str] = Field(None, max_length=30, description="Teléfono de la cuenta de acceso")
    password: Optional[str] = Field(None, min_length=12, description="Contraseña inicial si el correo todavía no tiene una cuenta")

    @field_validator("password")
    @classmethod
    def validar_longitud_password_bcrypt(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede superar 72 bytes.")
        return value

    model_config = ConfigDict(from_attributes=True)

class TrabajadorUpdate(BaseModel):
    """
    Esquema para la actualización parcial o total de los datos de un trabajador.
    """
    dni_nif_nie: Optional[str] = Field(None, min_length=9, max_length=9, description="Número de identificación fiscal NIF o NIE")
    nombre: Optional[str] = Field(None, max_length=50, description="Nombre de pila del empleado")
    apellidos: Optional[str] = Field(None, max_length=100, description="Apellidos del empleado")
    numero_seguridad_social: Optional[str] = Field(None, max_length=20, description="Número de la Seguridad Social")
    fecha_nacimiento: Optional[datetime.date] = Field(None, description="Fecha de nacimiento")
    foto_url: Optional[str] = Field(None, description="Ruta relativa o URL de la foto de perfil del trabajador")

    activo: Optional[bool] = Field(True, description="Estado operativo del trabajador")
    estado: Optional[EstadoTrabajadorEnum] = Field(None, description="Estado operativo actual del trabajador")
    
    fecha_alta_empresa: Optional[datetime.date] = Field(None, description="Fecha de alta del trabajador en la empresa")
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja laboral en la empresa")
    usuario_id: Optional[UUID] = Field(None, description="Cuenta vinculada; NULL para desvincularla")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorAutogestionUpdate(BaseModel):
    """Campos personales que el trabajador puede actualizar sin editar su expediente laboral."""
    nombre: Optional[str] = Field(None, max_length=50)
    apellidos: Optional[str] = Field(None, max_length=100)
    fecha_nacimiento: Optional[datetime.date] = None
    foto_url: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

class TrabajadorSimpleResponse(TrabajadorBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil.
    Incluye los estados legales de retención y control de auditoría del sistema.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del trabajador")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa")
    usuario_id: Optional[UUID] = Field(None, description="Cuenta de usuario vinculada al trabajador")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)

class TrabajadorResponse(TrabajadorSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    usuario: Optional[UsuarioSimpleResponse] = Field(None, description="Datos de contacto de la cuenta vinculada")
    model_config = ConfigDict(from_attributes=True)
