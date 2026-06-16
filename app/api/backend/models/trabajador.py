from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship 
from core.database import Base

# Definición de las tablas Trabajador y Empresa con relación manytomany(muchos a muchos)
trabajador_empresa = Table(
    "trabajador_empresa",
    Base.metadata,
    Column("trabajador_id", Integer, ForeignKey("trabajadores.id")),
    Column("empresa_id", Integer, ForeignKey("empresas.id"))
)

class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, index=True, nullable=True)
    estado = Column(String, index=True, nullable=True)
    nombre = Column(String, index=True)
    apellidos = Column(String, index=True)
    dni = Column(String, unique=True, index=True)
    puesto = Column(String, index=True)
    direccion = Column(String, index=True)
    codigo_postal = Column(String, index=True)
    poblacion = Column(String, index=True)
    provincia = Column(String, index=True)
    cuenta_cotizacion = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String, index=True)

    fichajes = relationship("Fichaje", back_populates="trabajador")
    horarios = relationship("Horario", back_populates="trabajador")
    empresas = relationship("Empresa", secondary=trabajador_empresa, back_populates="trabajadores")

    # @classmethod
    # def get_trabajador(cls, id_trabajador: int):
    #     return cls.query.filter_by(id=id_trabajador).first()

