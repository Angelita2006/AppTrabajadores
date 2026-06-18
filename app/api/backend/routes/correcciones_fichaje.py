import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, Text, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from empresas import Empresas
from enums import EstadoCorreccionEnum, TipoCorreccionEnum
from fichajes import Fichajes
from trabajadores import Trabajadores
from usuarios import Usuarios
