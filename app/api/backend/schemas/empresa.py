from pydantic import BaseModel, Field

# ==========================================
# ESQUEMAS BASE (VALIDACIÓN PYDANTIC)
# ==========================================

class EmpresaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de datos de una empresa.
    """
    nombre: str = Field(..., max_length=100, description="Razon social de la empresa")
    cif: str = Field(..., max_length=15, description="Codigo de identificacion fiscal unico")
    direccion: str = Field(..., max_length=255, description="Calle, numero y piso de la oficina")
    codigo_postal: str = Field(..., max_length=10, description="Codigo postal del municipio")
    poblacion: str = Field(..., max_length=100, description="Ciudad o municipio de la sede")
    provincia: str = Field(..., max_length=100, description="Provincia de la sede")


class EmpresaCreate(EmpresaBase):
    """
    Esquema utilizado para recibir los datos del formulario de creacion.
    No requiere el campo 'id' ya que SQLAlchemy lo autogenera de forma secuencial.
    """
    pass  # Hereda todos los campos obligatorios de EmpresaBase sin añadir nuevos


class EmpresaResponse(EmpresaBase):
    """
    Esquema utilizado para moldear las respuestas JSON que el servidor envia a la app.
    Incluye los identificadores y las propiedades autogeneradas.
    """
    id: int = Field(..., description="Identificador unico autogenerado por la base de datos")

    class Config:
        # Activa el modo ORM para que Pydantic pueda leer directamente los objetos de SQLAlchemy
        # (Permite mapear propiedades complejas de base de datos a formato JSON de forma automatica)
        from_attributes = True 
    
class EmpresaEdit(BaseModel):
    nombre: str    

# ejemplo: 
# {
#   "id": 1,
#   "nombre": "Fichapp Soluciones S.L.",
#   "cif": "B12345678",
#   "direccion": "Calle Mayor 15, Planta 2",
#   "codigo_postal": "28001",
#   "poblacion": "Madrid",
#   "provincia": "Madrid"
# }
