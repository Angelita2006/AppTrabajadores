import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKeyConstraint, PrimaryKeyConstraint, String, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from centros_trabajo import CentrosTrabajo
from empresas import Empresas
from enums import MetodoFichajeEnum
from fichajes import Fichajes
