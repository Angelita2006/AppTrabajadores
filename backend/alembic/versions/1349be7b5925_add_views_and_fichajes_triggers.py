"""add_views_and_fichajes_triggers

Revision ID: 1349be7b5925
Revises: f57ffa9d794e
Create Date: 2026-10-09 11:08:26.161985

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# Identificadores reales del árbol de Alembic
revision: str = '1349be7b5925'
down_revision: Union[str, Sequence[str], None] = 'f57ffa9d794e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extensión para funciones criptográficas nativas en PostgreSQL
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 2. VISTA: v_fichajes_vigentes (Optimizada con NOT EXISTS y trazabilidad de firma)
    op.execute("""
    CREATE OR REPLACE VIEW public.v_fichajes_vigentes AS
    SELECT 
        f.id, f.empresa_id, f.trabajador_id, f.centro_trabajo_id, f.dispositivo_id, 
        f.motivo_pausa_id, f.fichaje_sustituido_id, f.tipo_evento, f.metodo_fichaje, 
        f.origen, f.estado, f.latitud, f.longitud, f.ip_address, f.hash_integridad, f.firma_digital,
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
    """)

    # 3. TRIGGER FUNCTION: Generación automática de Hash en inserción
    op.execute("""
    CREATE OR REPLACE FUNCTION trg_calcular_hash_fichaje()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.hash_integridad := encode(
            digest(
                concat_ws('|', 
                    NEW.id::text, 
                    NEW.empresa_id::text, 
                    NEW.trabajador_id::text, 
                    NEW.tipo_evento::text, 
                    NEW.fecha_hora::text, 
                    NEW.metodo_fichaje::text, 
                    COALESCE(NEW.firma_digital, '')
                ), 
                'sha256'
            ), 
            'hex'
        );
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER trigger_fichajes_calcular_hash
    BEFORE INSERT ON public.fichajes
    FOR EACH ROW
    EXECUTE FUNCTION trg_calcular_hash_fichaje();
    """)

    # 4. TRIGGER FUNCTION: Bloqueo estricto de UPDATE y DELETE (Inmutabilidad)
    op.execute("""
    CREATE OR REPLACE FUNCTION trg_bloquear_modificacion_fichajes()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'La tabla fichajes es INMUTABLE. No se permiten operaciones de UPDATE ni DELETE por normativa legal de registro horario.';
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER trigger_fichajes_inmutable
    BEFORE UPDATE OR DELETE ON public.fichajes
    FOR EACH ROW
    EXECUTE FUNCTION trg_bloquear_modificacion_fichajes();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trigger_fichajes_inmutable ON public.fichajes;")
    op.execute("DROP FUNCTION IF EXISTS trg_bloquear_modificacion_fichajes();")
    
    op.execute("DROP TRIGGER IF EXISTS trigger_fichajes_calcular_hash ON public.fichajes;")
    op.execute("DROP FUNCTION IF EXISTS trg_calcular_hash_fichaje();")
    
    op.execute("DROP VIEW IF EXISTS public.v_fichajes_vigentes;")