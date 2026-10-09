import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - EMPRESAS
# ==========================================

class EmpresaBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de una empresa cliente
    basada en el modelo relacional mapeado por sqlacodegen.
    """
    nombre_comercial: str = Field(..., description="Nombre comercial de la empresa")
    razon_social: str = Field(..., max_length=50, description="Razón social o denominación legal")
    cif: str = Field(..., max_length=20, description="Código de Identificación Fiscal único")
    zona_horaria: str = Field("Europe/Madrid", max_length=50, description="Zona horaria por defecto para los centros de trabajo")
    activa: Optional[bool] = Field(None, description="Indica si la empresa está activa o no")
    configuracion: Optional[dict] = Field(None, description="Ajustes y parámetros específicos en formato JSON")
    es_gestoria: Optional[bool] = Field(None, description="Indica si la empresa es una gestoría o no")
    
    codigo_cnae: Optional[str] = Field(None, max_length=10, description="Código CNAE de la empresa")
    convenio_colectivo: Optional[str] = Field(None, max_length=50, description="Convenio colectivo aplicable a la empresa")
    direccion: Optional[str] = Field(None, max_length=50, description="Dirección fiscal de la empresa")
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja de la empresa si aplica")
    logo_url: Optional[str] = Field(None, description="URL del logo de la empresa")

    model_config = ConfigDict(from_attributes=True)

class EmpresaCreate(EmpresaBase):
    """
    Esquema utilizado para recibir los datos de registro de una empresa desde el cliente.
    Contiene campos opcionales del expediente fiscal que pueden omitirse temporalmente.
    """
    model_config = ConfigDict(from_attributes=True)

class EmpresaUpdate(BaseModel):
    """
    Esquema para la actualización de los datos de una empresa.
    """
    nombre_comercial: Optional[str] = Field(None, description="Nombre comercial de la empresa")
    razon_social: Optional[str] = Field(None, max_length=50, description="Razón social o denominación legal")
    cif: Optional[str] = Field(None, max_length=20, description="Código de Identificación Fiscal único")
    zona_horaria: Optional[str] = Field("Europe/Madrid", max_length=50, description="Zona horaria por defecto para los centros de trabajo")
    activa: Optional[bool] = Field(None, description="Indica si la empresa está activa o no")
    configuracion: Optional[dict] = Field(None, description="Ajustes y parámetros específicos en formato JSON")
    es_gestoria: Optional[bool] = Field(None, description="Indica si la empresa es una gestoría o no")
    
    codigo_cnae: Optional[str] = Field(None, max_length=10, description="Código CNAE de la empresa")
    convenio_colectivo: Optional[str] = Field(None, max_length=50, description="Convenio colectivo aplicable a la empresa")
    direccion: Optional[str] = Field(None, max_length=50, description="Dirección fiscal de la empresa")
    fecha_baja: Optional[datetime.date] = Field(None, description="Fecha de baja de la empresa si aplica")
    logo_url: Optional[str] = Field(None, description="URL del logo de la empresa")

    model_config = ConfigDict(from_attributes=True)

class EmpresaSimpleResponse(EmpresaBase):
    """
    Esquema utilizado para estructurar las respuestas JSON hacia las aplicaciones.
    Incluye los campos de control de auditoría, estados operativos e identificadores únicos.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) de la empresa")

    created_at: datetime.datetime = Field(..., description="Marca de tiempo de inserción real del registro (now)")
    updated_at: datetime.datetime = Field(..., description="Marca de tiempo de la última modificación efectuada (now)")

    model_config = ConfigDict(from_attributes=True)
