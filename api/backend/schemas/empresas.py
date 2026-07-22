import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - EMPRESAS
# ==========================================

class EmpresaUpdate(BaseModel):
    """
    Esquema para la actualización de los datos de una empresa.
    """
    razon_social: Optional[str] = Field(None, min_length=2, max_length=255, description="Razón social o denominación legal")
    cif: Optional[str] = Field(None, min_length=5, max_length=20, description="Código de Identificación Fiscal único")
    zona_horaria: Optional[str] = Field(None, min_length=2, max_length=50, description="Zona horaria por defecto")
    configuracion: Optional[dict] = Field(None, description="Ajustes y parámetros específicos en formato JSON")
    activa: Optional[bool] = Field(None, description="Estado operativo de la empresa")
    nombre_comercial: Optional[str] = Field(None, max_length=255, description="Nombre de marca o comercial")
    codigo_cnae: Optional[str] = Field(None, max_length=10, description="Clasificación Nacional de Actividades Económicas")
    convenio_colectivo: Optional[str] = Field(None, max_length=255, description="Convenio de aplicación sectorial")
    direccion_fiscal: Optional[str] = Field(None, description="Domicilio social o fiscal de la empresa")
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja del cliente si aplica")

    model_config = ConfigDict(from_attributes=True)


class EmpresaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una empresa cliente
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    razon_social: str = Field(..., min_length=2, max_length=255, description="Razón social o denominación legal")
    cif: str = Field(..., min_length=5, max_length=20, description="Código de Identificación Fiscal único")
    zona_horaria: str = Field("Europe/Madrid", min_length=2, max_length=50, description="Zona horaria por defecto para los centros de trabajo")
    configuracion: dict = Field(default_factory=dict, description="Ajustes y parámetros específicos en formato JSON")


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
    nombre_comercial: Optional[str] = Field(None, description="Nombre comercial")
    codigo_cnae: Optional[str] = Field(None, description="Código CNAE")
    convenio_colectivo: Optional[str] = Field(None, description="Convenio colectivo aplicable")
    direccion_fiscal: Optional[str] = Field(None, description="Dirección fiscal")
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja del cliente si aplica")

    model_config = ConfigDict(from_attributes=True)