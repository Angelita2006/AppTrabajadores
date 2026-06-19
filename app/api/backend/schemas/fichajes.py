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


class FichajeCreate(FichajeBase):
    """
    Esquema utilizado para recibir los datos de un fichaje enviados desde la app móvil.
    Contiene campos opcionales calculados de forma automática o manual según la situación.
    """
    # Coordenadas mapeadas como Decimal para coincidir con la precisión del modelo Numeric(9,6)
    latitud: Optional[Decimal] = Field(None, ge=Decimal('-90'), le=Decimal('90'), description="Coordenada de latitud")
    longitud: Optional[Decimal] = Field(None, ge=Decimal('-180'), le=Decimal('180'), description="Coordenada de longitud")
    
    # Campo IP mapeado temporalmente con un string o formato IP (se procesará a INT en el CRUD)
    ip_address: Optional[IPvAnyAddress] = Field(None, description="Dirección IP del dispositivo")
    
    motivo_pausa_id: Optional[int] = Field(None, description="ID del motivo de la pausa si aplica")
    dispositivo_id: Optional[UUID] = Field(None, description="ID UUID del dispositivo físico de fichaje")
    fecha_hora_dispositivo: Optional[datetime] = Field(None, description="Fecha y hora capturada por el hardware local")
    observaciones: Optional[str] = Field(None, description="Comentarios adicionales sobre el marcaje")


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
