import datetime
import decimal
from typing import Optional
import uuid
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKeyConstraint, Numeric, PrimaryKeyConstraint, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from enums import TipoContratoEnum, TipoJornadaEnum
from centros_trabajo import CentrosTrabajo
from departamentos import Departamentos
from empresas import Empresas
from trabajadores import Trabajadores
