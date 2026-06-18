import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from sqlalchemy.dialects.postgresql import INET, JSONB
from empresas import Empresas
from enums import AccionAuditoriaEnum
from trabajadores import Trabajadores
from usuarios import Usuarios
