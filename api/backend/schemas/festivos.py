# from datetime import date
# from pydantic import BaseModel, Field, ConfigDict
# from typing import Optional
# from uuid import UUID
# from schemas.calendarios_laborales import CalendarioLaboralSimpleResponse

# # ==========================================
# # ESQUEMAS DE VALIDACIÓN (PYDANTIC) - FESTIVOS
# # ==========================================

# class FestivoBase(BaseModel):
#     """
#     Propiedades comunes compartidas para la validación de un día festivo
#     basado en el modelo relacional mapeado por sqlacodegen.
#     """
#     calendario_id: UUID = Field(..., description="ID único UUID del calendario laboral al que se asocia")
#     fecha: date = Field(..., description="Fecha del día festivo en formato AAAA-MM-DD")
#     tipo: str = Field("nacional", min_length=2, max_length=30, description="Ámbito del festivo (ej: 'nacional', 'autonomico', 'local')")

#     model_config = ConfigDict(from_attributes=True)

# class FestivoCreate(FestivoBase):
#     """
#     Esquema utilizado para recibir los datos desde el cliente al registrar un festivo en el cuadrante.
#     """
#     descripcion: Optional[str] = Field(None, max_length=255, description="Nombre o motivo del festivo (Ej: 'Año Nuevo')")

# class FestivoUpdate(BaseModel):
#     """
#     Esquema para la actualización de un día festivo.
#     """
#     calendario_id: Optional[UUID] = Field(None, description="ID único UUID del calendario laboral")
#     fecha: Optional[date] = Field(None, description="Fecha del día festivo")
#     tipo: Optional[str] = Field(None, min_length=2, max_length=30, description="Ámbito del festivo")
#     descripcion: Optional[str] = Field(None, max_length=255, description="Nombre o motivo del festivo")

#     model_config = ConfigDict(from_attributes=True)

# class FestivoSimpleResponse(FestivoBase):
#     """
#     Esquema utilizado para estructurar las respuestas JSON hacia la interfaz móvil o web.
#     """
#     id: UUID = Field(..., description="Identificador único UUID autogenerado (gen_random_uuid)")
#     descripcion: Optional[str] = Field(None, description="Nombre o motivo del festivo")

#     model_config = ConfigDict(from_attributes=True)

# class FestivoResponse(FestivoSimpleResponse):
#     """
#     Esquema completo que extiende al simple añadiendo las relaciones anidadas.
#     """
#     calendario: Optional[CalendarioLaboralSimpleResponse] = Field(None, description="Detalles del calendario laboral asociado")

#     model_config = ConfigDict(from_attributes=True)

# class FestivoResponse2(BaseModel):
#     """
#     Esquema simplificado alternativo para respuestas de festivos.
#     """
#     id: UUID
#     fecha: date
#     descripcion: str
#     tipo: str

#     model_config = ConfigDict(from_attributes=True)