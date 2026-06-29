from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, IPvAnyAddress
from typing import Optional
from uuid import UUID
from models.enums import MetodoFichajeEnum, OrigenFichajeEnum, EstadoFichajeEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC)
# ==========================================

class FichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un fichaje
    basado en el modelo inmutable mapeado por sqlacodegen.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo")
    tipo_evento_id: int = Field(..., description="ID numérico del tipo de evento (SmallInteger)")
    metodo_fichaje: MetodoFichajeEnum = Field(..., description="Método utilizado para realizar el marcaje")


class FichajeCreate(BaseModel):
    """
    Esquema unificado para recibir marcajes desde clientes web o móviles.
    Garantiza la presencia de los campos no nulos exigidos por PostgreSQL.
    """
    empresa_id: UUID = Field(..., description="ID UUID del Tenant corporativo")
    trabajador_id: UUID = Field(..., description="ID UUID del expediente del empleado")
    centro_trabajo_id: UUID = Field(..., description="ID UUID del centro de trabajo asignado")
    
    # Recibe la palabra clave string ("ENTRADA", "SALIDA") y se procesa a int en la ruta
    tipo_evento_id: str = Field(..., description="Etiqueta textual del evento horario")
    metodo_fichaje: MetodoFichajeEnum = Field(..., description="Canal: app_movil, web, qr, etc.")
    
    # Campos por defecto mapeados según el diseño de tu base de datos
    origen: OrigenFichajeEnum = Field(default=OrigenFichajeEnum.TRABAJADOR)
    estado: EstadoFichajeEnum = Field(default=EstadoFichajeEnum.VALIDO)
    
    # Parámetros hardware y geolocalización opcionales
    latitud: Optional[Decimal] = Field(None, ge=Decimal('-90'), le=Decimal('90'))
    longitud: Optional[Decimal] = Field(None, ge=Decimal('-180'), le=Decimal('180'))
    ip_address: Optional[IPvAnyAddress] = Field(None, description="IP resuelta por la red")
    
    motivo_pausa_id: Optional[int] = Field(None)
    dispositivo_id: Optional[UUID] = Field(None)
    fecha_hora_dispositivo: Optional[datetime] = Field(None)
    observaciones: Optional[str] = Field(None)

class FichajeResponse(FichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    fecha_hora: datetime = Field(..., description="Instante oficial del fichaje con zona horaria (referencia legal)")
    origen: OrigenFichajeEnum = Field(..., description="Origen del registro (servidor por defecto: 'trabajador')")
    estado: EstadoFichajeEnum = Field(..., description="Estado de validez del fichaje (servidor por defecto: 'valido')")
    hash_integridad: str = Field(..., max_length=64, description="Firma SHA-256 de seguridad de la fila")
    created_at: datetime = Field(..., description="Fecha de inserción real e inmutable calculada por el servidor (now)")
    
    # Propiedades de relación opcionales de corrección o sustitución horaria
    motivo_pausa_id: Optional[int] = Field(None)
    fecha_hora_dispositivo: Optional[datetime] = Field(None)
    dispositivo_id: Optional[UUID] = Field(None)
    latitud: Optional[Decimal] = Field(None)
    longitud: Optional[Decimal] = Field(None)
    fichaje_sustituido_id: Optional[UUID] = Field(None, description="ID del fichaje anterior al que reemplaza este registro")
    observaciones: Optional[str] = Field(None)

    class Config:
        # Permite a Pydantic interactuar de forma nativa con los modelos tipados de SQLAlchemy 2.0
        from_attributes = True
