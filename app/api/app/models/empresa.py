from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship 
from core.database import Base
from models.trabajador import trabajador_empresa 

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    cif = Column(String, unique=True, index=True)
    direccion = Column(String, index=True)
    codigo_postal = Column(String, index=True)
    poblacion = Column(String, index=True)
    provincia = Column(String, index=True)

    fichajes = relationship("Fichaje", back_populates="empresa")
    horarios = relationship("Horario", back_populates="empresa")
    trabajadores = relationship("Trabajador", secondary=trabajador_empresa, back_populates="empresas")

    # @classmethod
    # def get_empresa(cls, id_empresa: int):
    #     return cls.query.filter_by(id=id_empresa).first()