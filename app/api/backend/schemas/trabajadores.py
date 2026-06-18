import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class TrabajadorBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un trabajador
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa cliente (tenant)")
    nif_nie: str = Field(..., max_length=15, description="Número de identificación fiscal NIF o NIE")
    nombre: str = Field(..., max_length=150, description="Nombre de pila del empleado")
    apellidos: str = Field(..., max_length=150, description="Apellidos del empleado")


class TrabajadorCreate(TrabajadorBase):
    """
    Esquema utilizado para recibir los datos de registro o contratación desde el cliente.
    Contiene campos de contacto e identificación laboral opcionales.
    """
    # EmailStr garantiza de forma nativa que el texto tenga una estructura de correo real
    email: Optional[EmailStr] = Field(None, max_length=255, description="Correo electrónico de contacto")
    telefono: Optional[str] = Field(None, max_length=30, description="Teléfono de contacto")
    numero_seguridad_social: Optional[str] = Field(None, max_length=20, description="Número de afiliación a la Seguridad Social")
    fecha_nacimiento: Optional[datetime.date] = Field(None, description="Fecha de nacimiento en formato AAAA-MM-DD")


class TrabajadorResponse(TrabajadorBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil.
    Incluye los estados legales de retención y control de auditoría del sistema.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activo: bool = Field(..., description="Determina si el trabajador sigue dado de alta de forma operativa")
    fecha_alta_empresa: datetime.date = Field(..., description="Fecha formal de contratación (CURRENT_DATE)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    
    # Propiedades complementarias opcionales expuestas en el JSON
    email: Optional[EmailStr] = Field(None)
    telefono: Optional[str] = Field(None)
    numero_seguridad_social: Optional[str] = Field(None)
    fecha_nacimiento: Optional[datetime.date] = Field(None)
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja del empleado si aplica")

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
