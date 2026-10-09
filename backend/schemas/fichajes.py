import datetime
import decimal
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from core.enums import MetodoFichajeEnum, OrigenFichajeEnum, EstadoFichajeEnum, TipoEventoFichajeEnum
from schemas.centros_trabajo import CentroTrabajoSimpleResponse
from schemas.dispositivos_fichaje import DispositivoFichajeSimpleResponse
from schemas.empresas import EmpresaSimpleResponse
from schemas.motivos_pausa import MotivoPausaSimpleResponse
from schemas.trabajadores import TrabajadorSimpleResponse

# ==========================================
# ESQUEMAS DE VALIDACIÓN (PYDANTIC) - FICHAJES
# ==========================================

class FichajeBase(BaseModel):
    """
    Propiedades comunes compartidas para la validación de un fichaje
    basado en el modelo inmutable mapeado por sqlacodegen.
    """
    tipo_evento: TipoEventoFichajeEnum = Field(..., description="Tipo fijo del evento de fichaje")
    metodo_fichaje: MetodoFichajeEnum = Field(..., description="Método utilizado para realizar el marcaje")

    fecha_hora: datetime.datetime = Field(..., description="Instante oficial del fichaje (referencia legal)")
    fecha_hora_dispositivo: datetime.datetime = Field(..., description="Fecha y hora declarada por el dispositivo al registrar el evento")

    origen: OrigenFichajeEnum = Field(..., description="Origen del fichaje")
    estado: EstadoFichajeEnum = Field(..., description="Estado del fichaje")

    latitud: decimal.Decimal = Field(..., description="Latitud geográfica del fichaje")
    longitud: decimal.Decimal = Field(..., description="Longitud geográfica del fichaje")
    ip_adress: str = Field(..., max_length=50, description="Dirección IP desde la que se realiza el fichaje")

    observaciones: Optional[str] = Field(..., description="Observaciones adicionales sobre el fichaje")
    firma_digital: str = Field(..., description="Firma digitalizada obligatoria del fichaje")

    model_config = ConfigDict(from_attributes=True)

class FichajeCreate(FichajeBase):
    """
    Esquema unificado para recibir marcajes desde clientes web o móviles.
    Garantiza la presencia de los campos no nulos exigidos por PostgreSQL.
    """
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo")
    dispositivo_id: UUID = Field(..., description="ID único UUID del dispositivo de fichaje")
    fichaje_sustituido_id: UUID = Field(..., description="ID único UUID del fichaje sustituido, si aplica")
    motivo_pausa_id: UUID = Field(..., description="ID único UUID del motivo de pausa, si aplica")

    forzar_hora_extra: Optional[bool] = Field(False, description="Bandera para forzar fichaje en festivo como horas extra")

    model_config = ConfigDict(from_attributes=True)

class FichajeSimpleResponse(FichajeBase):
    """
    Esquema utilizado para estructurar las respuestas JSON que el servidor envía de vuelta.
    Incluye las propiedades generadas por triggers y valores predeterminados de la base de datos.
    """
    id: UUID = Field(..., description="ID único UUID autogenerado (gen_random_uuid) del fichaje")
    empresa_id: UUID = Field(..., description="ID único UUID de la empresa")
    trabajador_id: UUID = Field(..., description="ID único UUID del trabajador")
    centro_trabajo_id: UUID = Field(..., description="ID único UUID del centro de trabajo")
    dispositivo_id: UUID = Field(..., description="ID único UUID del dispositivo de fichaje")
    fichaje_sustituido_id: UUID = Field(..., description="ID único UUID del fichaje sustituido, si aplica")
    motivo_pausa_id: UUID = Field(..., description="ID único UUID del motivo de pausa, si aplica")

    hash_integridad: str = Field(..., max_length=64, description="Firma SHA-256 de seguridad de la fila")
    created_at: datetime.datetime = Field(..., description="Fecha de inserción real e inmutable calculada por el servidor (now)")

    model_config = ConfigDict(from_attributes=True)

class FichajeResponse(FichajeSimpleResponse):
    """
    Esquema completo que extiende al simple añadiendo las relaciones anidadas.
    """
    empresa: Optional[EmpresaSimpleResponse] = Field(None, description="Detalles de la empresa asociada")
    trabajador: Optional[TrabajadorSimpleResponse] = Field(None, description="Detalles del trabajador asociado")
    centro_trabajo: Optional[CentroTrabajoSimpleResponse] = Field(None, description="Detalles del centro de trabajo asociado")
    dispositivo: Optional[DispositivoFichajeSimpleResponse] = Field(None, description="Detalles del dispositivo asociado")
    fichaje_sustituido: Optional[FichajeSimpleResponse] = Field(None, description="Detalles del fichaje sustituido")
    motivo_pausa: Optional[MotivoPausaSimpleResponse] = Field(None, description="Detalles del motivo de pausa asociado")

    model_config = ConfigDict(from_attributes=True)