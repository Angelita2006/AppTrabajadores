from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class TrabajadorBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un trabajador.
    """
    nombre: str = Field(..., max_length=50, description="Nombre de pila del empleado")
    apellidos: str = Field(..., max_length=100, description="Apellidos del empleado")
    dni: str = Field(..., max_length=15, description="Documento Nacional de Identidad único")
    puesto: str = Field(..., max_length=100, description="Cargo o puesto laboral")
    direccion: str = Field(..., max_length=255, description="Domicilio del trabajador")
    codigo_postal: str = Field(..., max_length=10, description="Código postal de residencia")
    poblacion: str = Field(..., max_length=100, description="Localidad de residencia")
    provincia: str = Field(..., max_length=100, description="Provincia de residencia")
    cuenta_cotizacion: str = Field(..., max_length=30, description="Código de cuenta de cotización")
    # EmailStr valida automáticamente que el texto tenga un formato de correo real (ej@ej.com)
    email: EmailStr = Field(..., description="Correo electrónico único de acceso")


class TrabajadorCreate(TrabajadorBase):
    """
    Esquema utilizado para recibir los datos de registro de un nuevo empleado.
    Aquí sí se exige la contraseña obligatoriamente.
    """
    password: str = Field(..., min_length=6, description="Contraseña de acceso seguro")
    role: Optional[str] = Field("user", description="Rol del sistema: 'user' o 'admin'")
    estado: Optional[str] = Field("Activo", description="Estado inicial del trabajador")


class TrabajadorResponse(TrabajadorBase):
    """
    Esquema utilizado para enviar los perfiles a la app móvil.
    Excluye la contraseña para cumplir con los estándares de seguridad.
    """
    id: int = Field(..., description="Identificador único del trabajador")
    role: Optional[str] = Field(None, description="Rol asignado en el sistema")
    estado: Optional[str] = Field(None, description="Estado operativo actual")

    class Config:
        # Permite que Pydantic lea directamente las propiedades del objeto Trabajador de SQLAlchemy
        from_attributes = True


class LoginRequest(BaseModel):
    """
    Esquema simplificado utilizado exclusivamente para recibir las credenciales 
    durante la petición de inicio de sesión en la API.
    """
    email: EmailStr = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., description="Contraseña de acceso")

# ejemplo: 
# {
#   "id": 1,
#   "role": "user",
#   "estado": "Activo",
#   "nombre": "Carlos",
#   "apellidos": "Pérez Gómez",
#   "dni": "12345678X",
#   "puesto": "Desarrollador",
#   "direccion": "Calle Luna 24",
#   "codigo_postal": "28002",
#   "poblacion": "Madrid",
#   "provincia": "Madrid",
#   "cuenta_cotizacion": "011122233344",
#   "email": "carlos@app.test"
# }
