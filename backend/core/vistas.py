from sqlalchemy import Column, DateTime, Enum, Numeric, String, Table, Text, Uuid, MetaData
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy_views import CreateView
from core.enums import EstadoFichajeEnum, MetodoFichajeEnum, OrigenFichajeEnum, TipoEventoFichajeEnum

views_metadata = MetaData()

t_v_fichajes_vigentes = Table(
    'v_fichajes_vigentes', views_metadata,
    Column('id', Uuid),
    Column('empresa_id', Uuid),
    Column('trabajador_id', Uuid),
    Column('centro_trabajo_id', Uuid),
    Column('dispositivo_id', Uuid),
    Column('motivo_pausa_id', Uuid),
    Column('fichaje_sustituido_id', Uuid),

    Column('tipo_evento', Enum(TipoEventoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='tipo_evento_fichaje_enum', create_type=False)),
    Column('metodo_fichaje', Enum(MetodoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='metodo_fichaje_enum', create_type=False)),
    Column('origen', Enum(OrigenFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='origen_fichaje_enum', create_type=False)),
    Column('estado', Enum(EstadoFichajeEnum, values_callable=lambda cls: [member.value for member in cls], name='estado_fichaje_enum', create_type=False)),
    
    Column('latitud', Numeric(9, 6)),
    Column('longitud', Numeric(9, 6)),
    Column('ip_address', INET),
    
    Column('hash_integridad', String(64)),
    Column('firma_digital', Text),

    Column('observaciones', Text),

    Column('fecha_hora', DateTime(True)),
    Column('fecha_hora_dispositivo', DateTime(True)),

    Column('created_at', DateTime(True)),

    comment='Vista que consolida únicamente los fichajes con efecto legal vigente (excluye sustituidos y anulados aprobados).'
)

sql_v_fichajes_vigentes = """
SELECT 
    f.id, f.empresa_id, f.trabajador_id, f.centro_trabajo_id, f.dispositivo_id, f.motivo_pausa_id, f.fichaje_sustituido_id,
    f.tipo_evento, f.metodo_fichaje, f.origen, f.estado, f.latitud, f.longitud, f.ip_address, f.hash_integridad, f.firma_digital,
    f.observaciones, f.fecha_hora, f.fecha_hora_dispositivo, f.created_at
FROM public.fichajes f
WHERE NOT EXISTS (
    SELECT 1
    FROM public.fichajes f_sub
    WHERE f_sub.fichaje_sustituido_id = f.id
)
AND NOT EXISTS (
    SELECT 1
    FROM public.correcciones_fichaje c
    WHERE c.fichaje_afectado_id = f.id
      AND c.tipo_correccion = 'Anulación'
      AND c.estado = 'Aprobada'
);
"""

vista_fichajes_vigentes_def = CreateView(t_v_fichajes_vigentes, sql_v_fichajes_vigentes)