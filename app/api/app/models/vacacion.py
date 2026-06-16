from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from core.database import Base

class Vacacion(Base):
    __tablename__ = "vacaciones"

    id = Column(Integer, primary_key=True, index=True)
    idTrabajador = Column(Integer, ForeignKey("trabajadores.id"), index=True)
    idEmpresa = Column(Integer, ForeignKey("empresas.id"), index=True)
    fechaInicio = Column(String, index=True)  # Guarda la fecha en formato "AAAA-MM-DD"
    fechaFin = Column(String, index=True)     # Guarda la fecha en formato "AAAA-MM-DD"
    motivo = Column(String, index=True)
    estado = Column(String, index=True, default="pendiente") # Valores: "pendiente", "aprobada", "rechazada"

    # Relaciones para poder consultar los datos del empleado o empresa desde la vacación
    trabajador = relationship("Trabajador")
    empresa = relationship("Empresa")
