from sqlalchemy import Column, DateTime, Enum, ForeignKeyConstraint, Numeric, PrimaryKeyConstraint, SmallInteger, String, Table, Text, Uuid
from core.database import Base
from models.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum
from sqlalchemy.dialects.postgresql import INET

t_v_fichajes_vigentes = Table(
    'v_fichajes_vigentes', Base.metadata,
    Column('id', Uuid),
    Column('empresa_id', Uuid),
    Column('trabajador_id', Uuid),
    Column('centro_trabajo_id', Uuid),
    Column('tipo_evento_id', SmallInteger),
    Column('motivo_pausa_id', SmallInteger),
    Column('fecha_hora', DateTime(True)),
    Column('fecha_hora_dispositivo', DateTime(True)),
    Column('metodo_fichaje', Enum(MetodoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='metodo_fichaje_enum')),
    Column('dispositivo_id', Uuid),
    Column('latitud', Numeric(9, 6)),
    Column('longitud', Numeric(9, 6)),
    Column('ip_address', INET),
    Column('origen', Enum(OrigenFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='origen_fichaje_enum')),
    Column('estado', Enum(EstadoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_fichaje_enum')),
    Column('fichaje_sustituido_id', Uuid),
    Column('hash_integridad', String(64)),
    Column('observaciones', Text),
    Column('created_at', DateTime(True)),
    comment='Fichajes con efecto legal actual: excluye los anulados (vía correcciones_fichaje aprobadas) y los ya sustituidos por una fila más reciente. Es la vista que deben usar nómina, informes e inspección; nunca se borra ni edita la fila original.'
)

t_roles_permisos = Table(
    'roles_permisos', Base.metadata,
    Column('role_id', SmallInteger, primary_key=True),
    Column('permiso_id', SmallInteger, primary_key=True),
    ForeignKeyConstraint(['permiso_id'], ['permisos.id'], ondelete='CASCADE', name='roles_permisos_permiso_id_fkey'),
    ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE', name='roles_permisos_role_id_fkey'),
    PrimaryKeyConstraint('role_id', 'permiso_id', name='roles_permisos_pkey'),
    extend_existing=True
)