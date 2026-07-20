import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class AsignarTurnosRequest(BaseModel):
    turnos: List[UUID]

class TrabajadorCreate(BaseModel):
    """
    Esquema utilizado para recibir los datos de registro o contratación desde el cliente.
    Contiene campos de contacto e identificación laboral opcionales.
    """
    empresa_cif: str = Field(..., description="CIF de la empresa cliente (tenant)")
    nif_nie: str = Field(..., max_length=15, description="Número de identificación fiscal NIF o NIE")
    nombre: str = Field(..., max_length=150, description="Nombre de pila del empleado")
    apellidos: str = Field(..., max_length=150, description="Apellidos del empleado")
    email: Optional[EmailStr] = Field(None, max_length=255, description="Correo electrónico de contacto")

class TrabajadorResponse(BaseModel):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil.
    Incluye los estados legales de retención y control de auditoría del sistema.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    empresa_id: Optional[UUID] = Field(None, description="UUID de la empresa cliente (tenant)")
    empresa_cif: Optional[str] = Field(None, description="CIF de la empresa cliente (tenant)")    
    nif_nie: str = Field(..., max_length=15, description="Número de identificación fiscal NIF o NIE")
    nombre: str = Field(..., max_length=150, description="Nombre de pila del empleado")
    apellidos: str = Field(..., max_length=150, description="Apellidos del empleado")
    activo: bool = Field(..., description="Determina si el trabajador sigue dado de alta de forma operativa")
    fecha_alta_empresa: datetime.date = Field(..., description="Fecha formal de contratación (CURRENT_DATE)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    
    email: Optional[EmailStr] = Field(None)
    telefono: Optional[str] = Field(None)
    numero_seguridad_social: Optional[str] = Field(None)
    fecha_nacimiento: Optional[datetime.date] = Field(None)
    fecha_baja_empresa: Optional[datetime.date] = Field(None, description="Fecha de baja del empleado si aplica")    
    
    class Config:
        from_attributes = True
