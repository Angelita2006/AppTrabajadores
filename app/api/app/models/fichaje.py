from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship 
from core.database import Base

# Definición de la tabla Fichaje
class Fichaje(Base):
    __tablename__ = "fichajes"

    id = Column(Integer, primary_key=True, index=True)
    idTrabajador = Column(Integer, ForeignKey("trabajadores.id"), primary_key=True, index=True)
    idEmpresa = Column(Integer, ForeignKey("empresas.id"), primary_key=True, index=True)
    tipo = Column(String, index=True)
    fecha = Column(Integer, index=True)
    fecha_hora = Column(DateTime, index=True)

    trabajador = relationship("Trabajador", back_populates="fichajes")
    empresa = relationship("Empresa", back_populates="fichajes")

