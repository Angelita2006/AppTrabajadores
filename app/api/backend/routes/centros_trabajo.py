
import datetime
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, SmallInteger, String, Text, UniqueConstraint, Uuid, text
from core.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship 
from core.database import Base
from calendarios_laborales import CalendariosLaborales
from contratos import Contratos
from departamentos import Departamentos
from dispositivos_fichaje import DispositivosFichaje
from empresas import Empresas
from fichajes import Fichajes
