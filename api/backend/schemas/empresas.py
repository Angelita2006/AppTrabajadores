import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class EmpresaUpdate(BaseModel):
    nueva_razon_social: str
    nuevo_convenio: str
    nuevo_cnae: str
    nueva_direccion: str

class EmpresaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una empresa cliente
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    razon_social: str = Field(..., max_length=255, description="Razón social o denominación legal")
    cif: str = Field(..., max_length=20, description="Código de Identificación Fiscal único")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria por defecto para los centros de trabajo")
    configuracion: dict = Field(default_factory=dict, description="Ajustes y parámetros específicos en formato JSONB")


class EmpresaCreate(EmpresaBase):
    """
    Esquema utilizado para recibir los datos de registro de una empresa desde el cliente.
    Contiene campos opcionales del expediente fiscal que pueden omitirse temporalmente.
    """
    nombre_comercial: Optional[str] = Field(None, max_length=255, description="Nombre de marca o comercial")
    codigo_cnae: Optional[str] = Field(None, max_length=10, description="Clasificación Nacional de Actividades Económicas")
    convenio_colectivo: Optional[str] = Field(None, max_length=255, description="Convenio de aplicación sectorial")
    direccion_fiscal: Optional[str] = Field(None, description="Domicilio social o fiscal de la empresa")


class EmpresaResponse(EmpresaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia las aplicaciones.
    Incluye los campos de control de auditoría, estados operativos e identificadores únicos.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    activa: bool = Field(..., description="Determina si el cliente se encuentra operativo")
    fecha_alta: datetime.date = Field(..., description="Fecha de alta formal en la gestoría (CURRENT_DATE)")
    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")
    
    # Propiedades complementarias opcionales que viajan en el JSON
    nombre_comercial: Optional[str] = Field(None)
    codigo_cnae: Optional[str] = Field(None)
    convenio_colectivo: Optional[str] = Field(None)
    direccion_fiscal: Optional[str] = Field(None)
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja del cliente si aplica")

    class Config:
        # Habilita el modo de conversión directa para modelos tipados de SQLAlchemy 2.0
        from_attributes = True
