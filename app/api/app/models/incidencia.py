from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from core.database import Base

class Incidencia(Base):
    __tablename__ = "incidencias"

    id = Column(Integer, primary_key=True, index=True)
    idTrabajador = Column(Integer, ForeignKey("trabajadores.id"), index=True)
    idEmpresa = Column(Integer, ForeignKey("empresas.id"), index=True)
    tipo = Column(String, index=True, default="olvido_fichaje")
    fecha = Column(String, index=True)  # Guarda el día del problema en formato "AAAA-MM-DD"
    descripcion = Column(String, index=True)
    estado = Column(String, index=True, default="abierta") # Valores: "abierta", "resuelta"

    # Relaciones para poder consultar los datos del empleado o empresa desde la incidencia
    trabajador = relationship("Trabajador")
    empresa = relationship("Empresa")
