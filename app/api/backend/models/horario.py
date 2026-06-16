from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship 
from core.database import Base

class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    idTrabajador = Column(Integer, ForeignKey("trabajadores.id"), primary_key=True, index=True)
    idEmpresa = Column(Integer, ForeignKey("empresas.id"), primary_key=True, index=True)
    tipoJornada = Column(String, index=True)
    dias = Column(Integer, index=True)
    diasSemana = Column("dias_semana", String, index=True)
    hora_entrada1 = Column("hora_entrada1", DateTime, index=True)
    hora_salida1 = Column("hora_salida1", DateTime, index=True)
    hora_entrada2 = Column("hora_entrada2", DateTime, index=True, nullable=True)
    hora_salida2 = Column("hora_salida2", DateTime, index=True, nullable=True)

    trabajador = relationship("Trabajador", back_populates="horarios")
    empresa = relationship("Empresa", back_populates="horarios")