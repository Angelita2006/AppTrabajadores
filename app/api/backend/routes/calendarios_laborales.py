import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from centros_trabajo import CentrosTrabajo
from empresas import Empresas
from festivos import Festivos
