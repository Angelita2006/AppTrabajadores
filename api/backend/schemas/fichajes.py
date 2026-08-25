from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, IPvAnyAddress, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import MetodoFichajeEnum, OrigenFichajeEnum, EstadoFichajeEnum

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - FICHAJES
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
    
    tipo_evento_id: UUID = Field(..., description="ID numérico del tipo de evento horario")
    metodo_fichaje: MetodoFichajeEnum = Field(..., description="Canal: app_movil, web, qr, etc.")
    
    origen: OrigenFichajeEnum = Field(default=OrigenFichajeEnum.TRABAJADOR, description="Origen del fichaje")
    estado: EstadoFichajeEnum = Field(default=EstadoFichajeEnum.VALIDO, description="Estado de validez")
    
    latitud: Optional[Decimal] = Field(None, ge=Decimal('-90'), le=Decimal('90'), description="Coordenada de latitud")
    longitud: Optional[Decimal] = Field(None, ge=Decimal('-180'), le=Decimal('180'), description="Coordenada de longitud")
    ip_address: Optional[IPvAnyAddress] = Field(None, description="IP resuelta por la red")
    
    motivo_pausa_id: Optional[int] = Field(None, description="ID del motivo de pausa si aplica")
    dispositivo_id: Optional[UUID] = Field(None, description="ID del dispositivo de fichaje")
    fecha_hora_dispositivo: Optional[datetime] = Field(None, description="Fecha y hora reportada por el dispositivo")
    observaciones: Optional[str] = Field(None, max_length=500, description="Observaciones adicionales")

    forzar_hora_extra: Optional[bool] = Field(False, description="Bandera para forzar fichaje en festivo como horas extra")

class FichajeResponse(FichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
    id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
    fecha_hora: datetime = Field(..., description="Instante oficial del fichaje con zona horaria (referencia legal)")
    origen: OrigenFichajeEnum = Field(..., description="Origen del registro")
    estado: EstadoFichajeEnum = Field(..., description="Estado de validez del fichaje")
    hash_integridad: str = Field(..., max_length=64, description="Firma SHA-256 de seguridad de la fila")
    created_at: datetime = Field(..., description="Fecha de inserción real e inmutable calculada por el servidor (now)")
    
    motivo_pausa_id: Optional[int] = Field(None, description="ID del motivo de pausa")
    fecha_hora_dispositivo: Optional[datetime] = Field(None, description="Fecha y hora reportada por el dispositivo")
    dispositivo_id: Optional[UUID] = Field(None, description="ID del dispositivo de fichaje")
    latitud: Optional[Decimal] = Field(None, description="Latitud")
    longitud: Optional[Decimal] = Field(None, description="Longitud")
    fichaje_sustituido_id: Optional[UUID] = Field(None, description="ID del fichaje anterior al que reemplaza este registro")
    observaciones: Optional[str] = Field(None, description="Observaciones adicionales")

    model_config = ConfigDict(from_attributes=True)