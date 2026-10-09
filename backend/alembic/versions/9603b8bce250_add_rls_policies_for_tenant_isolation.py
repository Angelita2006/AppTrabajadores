"""add_rls_policies_for_tenant_isolation

Revision ID: 9603b8bce250
Revises: 1349be7b5925
Create Date: 2026-10-09 13:40:14.277840

"""
from typing import Sequence, Union
from alembic import op

# Reemplaza con tus IDs de migración
revision: str = '9603b8bce250'
down_revision: Union[str, None] = '1349be7b5925'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# 1. Tablas directas obligatorias (empresa_id NOT NULL)
TABLAS_DIRECTAS_ESTRICTAS = [
    'fichajes',
    'trabajadores',
    'centros_trabajo',
    'departamentos',
    'dispositivos_fichaje',
    'correcciones_fichaje',
    'contratos',
    'ausencias',
    'licencias',
    'calendarios_laborales',
    'resumenes_jornada',
    'auditoria_accesos',
    'turnos' 
]

# 2. Tablas directas con catálogo global opcional (empresa_id NULL permitido)
TABLAS_DIRECTAS_CON_GLOBALES = [
    'motivos_pausa',
    'roles',
    'politicas_retencion'
]

def upgrade() -> None:
    # -------------------------------------------------------------
    # A. APLICAR RLS A TABLAS DIRECTAS ESTRICTAS
    # -------------------------------------------------------------
    for tabla in TABLAS_DIRECTAS_ESTRICTAS:
        op.execute(f"ALTER TABLE public.{tabla} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE public.{tabla} FORCE ROW LEVEL SECURITY;")

        op.execute(f"""
        CREATE POLICY rls_{tabla}_policy ON public.{tabla}
        FOR ALL
        USING (
            current_setting('app.is_superadmin', true) = 'true'
            OR
            (
                current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                AND empresa_id = ANY(
                    string_to_array(
                        replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                        ','
                    )::uuid[]
                )
            )
            OR
            (
                current_setting('app.current_empresa_id', true) IS NOT NULL
                AND empresa_id = current_setting('app.current_empresa_id', true)::uuid
            )
        );
        """)

    # -------------------------------------------------------------
    # B. APLICAR RLS A TABLAS DIRECTAS CON REGISTROS GLOBALES (empresa_id IS NULL)
    # -------------------------------------------------------------
    for tabla in TABLAS_DIRECTAS_CON_GLOBALES:
        op.execute(f"ALTER TABLE public.{tabla} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE public.{tabla} FORCE ROW LEVEL SECURITY;")

        op.execute(f"""
        CREATE POLICY rls_{tabla}_policy ON public.{tabla}
        FOR ALL
        USING (
            current_setting('app.is_superadmin', true) = 'true'
            OR
            empresa_id IS NULL -- Permitir ver el catálogo global del sistema
            OR
            (
                current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                AND empresa_id = ANY(
                    string_to_array(
                        replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                        ','
                    )::uuid[]
                )
            )
            OR
            (
                current_setting('app.current_empresa_id', true) IS NOT NULL
                AND empresa_id = current_setting('app.current_empresa_id', true)::uuid
            )
        );
        """)

    # -------------------------------------------------------------
    # C. APLICAR RLS A TABLAS INDIRECTAS (SIN COLUMNA empresa_id)
    # -------------------------------------------------------------
    
    # C.1. asignaciones_turno (se vincula mediante contrato_id)
    op.execute("ALTER TABLE public.asignaciones_turno ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.asignaciones_turno FORCE ROW LEVEL SECURITY;")
    op.execute("""
    CREATE POLICY rls_asignaciones_turno_policy ON public.asignaciones_turno
    FOR ALL
    USING (
        current_setting('app.is_superadmin', true) = 'true'
        OR
        EXISTS (
            SELECT 1 FROM public.contratos c
            WHERE c.id = asignaciones_turno.contrato_id
            AND (
                (
                    current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                    AND c.empresa_id = ANY(
                        string_to_array(
                            replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                            ','
                        )::uuid[]
                    )
                )
                OR
                (
                    current_setting('app.current_empresa_id', true) IS NOT NULL
                    AND c.empresa_id = current_setting('app.current_empresa_id', true)::uuid
                )
            )
        )
    );
    """)

    # C.2. festivos (se vincula mediante calendario_id)
    op.execute("ALTER TABLE public.festivos ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.festivos FORCE ROW LEVEL SECURITY;")
    op.execute("""
    CREATE POLICY rls_festivos_policy ON public.festivos
    FOR ALL
    USING (
        current_setting('app.is_superadmin', true) = 'true'
        OR
        EXISTS (
            SELECT 1 FROM public.calendarios_laborales cl
            WHERE cl.id = festivos.calendario_id
            AND (
                (
                    current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                    AND cl.empresa_id = ANY(
                        string_to_array(
                            replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                            ','
                        )::uuid[]
                    )
                )
                OR
                (
                    current_setting('app.current_empresa_id', true) IS NOT NULL
                    AND cl.empresa_id = current_setting('app.current_empresa_id', true)::uuid
                )
            )
        )
    );
    """)

    # C.3. contratos_calendarios (se vincula mediante contrato_id)
    op.execute("ALTER TABLE public.contratos_calendarios ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.contratos_calendarios FORCE ROW LEVEL SECURITY;")
    op.execute("""
    CREATE POLICY rls_contratos_calendarios_policy ON public.contratos_calendarios
    FOR ALL
    USING (
        current_setting('app.is_superadmin', true) = 'true'
        OR
        EXISTS (
            SELECT 1 FROM public.contratos c
            WHERE c.id = contratos_calendarios.contrato_id
            AND (
                (
                    current_setting('app.allowed_empresa_ids', true) IS NOT NULL
                    AND c.empresa_id = ANY(
                        string_to_array(
                            replace(replace(current_setting('app.allowed_empresa_ids', true), 'ARRAY[', ''), ']', ''),
                            ','
                        )::uuid[]
                    )
                )
                OR
                (
                    current_setting('app.current_empresa_id', true) IS NOT NULL
                    AND c.empresa_id = current_setting('app.current_empresa_id', true)::uuid
                )
            )
        )
    );
    """)

def downgrade() -> None:
    todas_las_tablas = TABLAS_DIRECTAS_ESTRICTAS + TABLAS_DIRECTAS_CON_GLOBALES + [
        'asignaciones_turno', 'festivos', 'contratos_calendarios'
    ]
    
    for tabla in todas_las_tablas:
        op.execute(f"DROP POLICY IF EXISTS rls_{tabla}_policy ON public.{tabla};")
        op.execute(f"ALTER TABLE public.{tabla} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE public.{tabla} DISABLE ROW LEVEL SECURITY;")