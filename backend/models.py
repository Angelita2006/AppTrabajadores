from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship 
from backend.database import Base

# Definición de la tabla Fichaje
class Fichaje(Base):
    __tablename__ = "fichajes"

    id = Column(Integer, primary_key=True, index=True)
    idTrabajador = Column(String, primary_key=True, index=True)
    idEmpresa = Column(String, primary_key=True, index=True)
    tipo = Column(String, index=True)
    fecha_hora = Column(DateTime, index=True)

    trabajador = relationship("Trabajador", back_populates="fichajes")
    empresa = relationship("Empresa", back_populates="fichajes")

# Definición de las tablas Trabajador y Empresa con relación manytomany(muchos a muchos)
trabajador_empresa = Table(
    "trabajador_empresa",
    Base.metadata,
    Column("trabajador_id", Integer, ForeignKey("trabajadores.id")),
    Column("empresa_id", Integer, ForeignKey("empresas.id"))
)

class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    idTrabajador = Column(String, primary_key=True, index=True)
    idEmpresa = Column(String, primary_key=True, index=True)
    tipoJornada = Column(String, index=True)
    dias = Column(Integer, index=True)
    dias_semana = Column(String, index=True)
    hora_entrada = Column(DateTime, index=True)
    hora_salida = Column(DateTime, index=True)

    trabajador = relationship("Trabajador", back_populates="horarios")
    empresa = relationship("Empresa", back_populates="horarios")

class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    apellidos = Column(String, index=True)
    dni = Column(String, unique=True, index=True)
    direccion = Column(String, index=True)
    codigo_postal = Column(String, index=True)
    poblacion = Column(String, index=True)
    provincia = Column(String, index=True)
    cuenta_bancaria = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String, index=True)

    horarios = relationship("Horario", back_populates="trabajador")
    empresas = relationship("Empresa", secondary=trabajador_empresa, back_populates="trabajadores")

    @classmethod
    def get_trabajador(cls, id_trabajador: int):
        return cls.query.filter_by(id=id_trabajador).first()

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    cif = Column(String, unique=True, index=True)
    direccion = Column(String, index=True)
    codigo_postal = Column(String, index=True)
    poblacion = Column(String, index=True)
    provincia = Column(String, index=True)

    trabajadores = relationship("Trabajador", secondary=trabajador_empresa, back_populates="empresas")

    @classmethod
    def get_empresa(cls, id_empresa: int):
        return cls.query.filter_by(id=id_empresa).first()
