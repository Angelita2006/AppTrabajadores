-- ============================================================================
-- SISTEMA DE REGISTRO DE JORNADA LABORAL MULTIEMPRESA
-- ============================================================================
-- Diseñado para una gestoría/asesoría que gestiona el fichaje de varias
-- empresas cliente desde una única plataforma (modelo SaaS multiempresa).
--
-- Marco legal de referencia:
--   - Art. 34.9 del Estatuto de los Trabajadores (introducido por el
--     Real Decreto-ley 8/2019): registro diario de jornada, conservación
--     4 años, acceso para trabajador/representantes legales/ITSS.
--   - Anticipa los requisitos del futuro Real Decreto de registro horario
--     digital (en tramitación a fecha de este diseño): inmutabilidad,
--     trazabilidad completa de cambios, acceso remoto para la ITSS,
--     prohibición de biometría como método de fichaje salvo excepción legal.
--
-- Motor objetivo: PostgreSQL 15 o superior (usa UNIQUE NULLS NOT DISTINCT).
-- Probado contra PostgreSQL 16.
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), digest() para hash de integridad

-- ============================================================================
-- 1. TIPOS ENUMERADOS
-- ============================================================================

CREATE TYPE tipo_usuario_enum AS ENUM (
    'admin_gestoria', 'admin_empresa', 'rrhh', 'representante_legal',
    'trabajador', 'auditor_itss'
);

CREATE TYPE metodo_fichaje_enum AS ENUM (
    'app_movil', 'terminal_rfid', 'terminal_pin', 'lector_qr',
    'web', 'geolocalizacion', 'manual'
);
-- Nota: no se incluye un método "biométrico". El borrador del nuevo Real
-- Decreto de registro horario digital prohíbe huella/reconocimiento facial
-- como método de fichaje salvo excepción legal expresa.

CREATE TYPE estado_fichaje_enum AS ENUM ('valido', 'pendiente_revision');
-- Estado fijado SOLO en el momento de la inserción (el fichaje es inmutable).
-- La anulación o sustitución posterior se gestiona en correcciones_fichaje,
-- nunca modificando esta fila.

CREATE TYPE origen_fichaje_enum AS ENUM ('trabajador', 'correccion_rrhh', 'sistema');

CREATE TYPE tipo_correccion_enum AS ENUM ('alta_manual', 'modificacion', 'anulacion');

CREATE TYPE estado_correccion_enum AS ENUM ('pendiente', 'aprobada', 'rechazada');

CREATE TYPE tipo_contrato_enum AS ENUM (
    'indefinido', 'temporal', 'formacion', 'practicas', 'fijo_discontinuo', 'otro'
);

CREATE TYPE tipo_jornada_enum AS ENUM ('completa', 'parcial');

CREATE TYPE accion_auditoria_enum AS ENUM (
    'consulta', 'exportacion', 'descarga', 'modificacion', 'acceso_denegado'
);

CREATE TYPE accion_retencion_enum AS ENUM ('archivar', 'anonimizar', 'eliminar');


-- ============================================================================
-- 2. FUNCIONES DE APOYO (updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. ESTRUCTURA EMPRESARIAL (raíz multiempresa)
-- ============================================================================
-- Importante: las empresas NUNCA se eliminan físicamente (de ahí el
-- ON DELETE RESTRICT en todas las tablas que cuelgan de ellas). Una baja de
-- cliente se gestiona con activa = false y fecha_baja, preservando el
-- historial de fichajes durante el periodo de conservación legal.

CREATE TABLE empresas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social        VARCHAR(255) NOT NULL,
    nombre_comercial    VARCHAR(255),
    cif                 VARCHAR(20) NOT NULL UNIQUE,
    codigo_cnae         VARCHAR(10),
    convenio_colectivo  VARCHAR(255),
    direccion_fiscal    TEXT,
    zona_horaria        VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
    configuracion       JSONB NOT NULL DEFAULT '{}'::jsonb,
    fecha_alta          DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja          DATE,
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE empresas IS 'Empresas cliente de la gestoría. Raíz de aislamiento multiempresa (tenant).';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON empresas
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE centros_trabajo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    nombre          VARCHAR(255) NOT NULL,
    codigo_ccc      VARCHAR(20),
    direccion       TEXT,
    zona_horaria    VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN centros_trabajo.codigo_ccc IS 'Código de Cuenta de Cotización a la Seguridad Social del centro, si aplica.';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON centros_trabajo
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE departamentos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    centro_trabajo_id   UUID REFERENCES centros_trabajo(id) ON DELETE SET NULL,
    nombre              VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON departamentos
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================================
-- 4. PERSONAL Y CONTRATOS
-- ============================================================================

CREATE TABLE trabajadores (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    nif_nie                 VARCHAR(15) NOT NULL,
    nombre                  VARCHAR(150) NOT NULL,
    apellidos               VARCHAR(150) NOT NULL,
    email                   VARCHAR(255),
    telefono                VARCHAR(30),
    numero_seguridad_social VARCHAR(20),
    fecha_nacimiento        DATE,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_alta_empresa      DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja_empresa      DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (empresa_id, nif_nie)
);
COMMENT ON TABLE trabajadores IS 'Trabajadores de cada empresa cliente. El derecho de supresión (art. 17 RGPD) no aplica mientras existan fichajes en periodo de conservación legal (excepción art. 17.3.b RGPD); en su lugar se usa activo/fecha_baja_empresa.';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON trabajadores
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE contratos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id           UUID NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
    empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    centro_trabajo_id       UUID NOT NULL REFERENCES centros_trabajo(id) ON DELETE RESTRICT,
    departamento_id         UUID REFERENCES departamentos(id) ON DELETE SET NULL,
    tipo_contrato           tipo_contrato_enum NOT NULL,
    tipo_jornada            tipo_jornada_enum NOT NULL,
    horas_semana            NUMERIC(5,2) NOT NULL CHECK (horas_semana > 0),
    puesto_trabajo          VARCHAR(150),
    categoria_profesional   VARCHAR(150),
    fecha_inicio            DATE NOT NULL,
    fecha_fin               DATE,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contratos
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================================
-- 5. CALENDARIO Y TURNOS (jornada teórica, para contrastar con lo fichado)
-- ============================================================================

CREATE TABLE calendarios_laborales (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    centro_trabajo_id   UUID REFERENCES centros_trabajo(id) ON DELETE SET NULL,
    anio                SMALLINT NOT NULL,
    nombre              VARCHAR(150) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE festivos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendario_id   UUID NOT NULL REFERENCES calendarios_laborales(id) ON DELETE CASCADE,
    fecha           DATE NOT NULL,
    descripcion     VARCHAR(255),
    tipo            VARCHAR(30) NOT NULL DEFAULT 'nacional',
    UNIQUE (calendario_id, fecha)
);

CREATE TABLE turnos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    nombre                  VARCHAR(150) NOT NULL,
    hora_inicio             TIME NOT NULL,
    hora_fin                TIME NOT NULL,
    duracion_pausa_minutos  SMALLINT NOT NULL DEFAULT 0,
    dias_semana             SMALLINT[] NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dias_semana_validos CHECK (dias_semana <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[])
);
COMMENT ON COLUMN turnos.dias_semana IS 'Días de la semana en que aplica el turno: 1=lunes ... 7=domingo.';

CREATE TABLE asignaciones_turno (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id   UUID NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
    turno_id        UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE,
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- ============================================================================
-- 6. SEGURIDAD: USUARIOS Y CONTROL DE ACCESO (RBAC)
-- ============================================================================
-- Distingue personal de la gestoría (empresa_id NULL, acceso multiempresa
-- vía usuarios_roles) de personal de cada empresa cliente (empresa_id fijo).

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID REFERENCES empresas(id) ON DELETE RESTRICT,
    trabajador_id   UUID REFERENCES trabajadores(id) ON DELETE RESTRICT,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    tipo_usuario    tipo_usuario_enum NOT NULL,
    mfa_habilitado  BOOLEAN NOT NULL DEFAULT FALSE,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trabajador_id)
);
COMMENT ON COLUMN usuarios.empresa_id IS 'NULL para usuarios de la gestoría con acceso potencial a varias empresas (ámbito real definido en usuarios_roles).';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

CREATE TABLE permisos (
    id          SMALLSERIAL PRIMARY KEY,
    codigo      VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

CREATE TABLE roles_permisos (
    role_id     SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id  SMALLINT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permiso_id)
);

CREATE TABLE usuarios_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    role_id     SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    empresa_id  UUID REFERENCES empresas(id) ON DELETE RESTRICT,
    UNIQUE NULLS NOT DISTINCT (usuario_id, role_id, empresa_id)
);
COMMENT ON COLUMN usuarios_roles.empresa_id IS 'Ámbito del rol. NULL = aplica a todas las empresas que gestiona el usuario (típico de personal de gestoría).';

-- ============================================================================
-- 7. FICHAJE (núcleo del sistema)
-- ============================================================================

CREATE TABLE dispositivos_fichaje (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    centro_trabajo_id   UUID REFERENCES centros_trabajo(id) ON DELETE SET NULL,
    tipo_dispositivo    metodo_fichaje_enum NOT NULL,
    identificador       VARCHAR(100) NOT NULL,
    ubicacion           VARCHAR(255),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_alta          DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (empresa_id, identificador)
);
COMMENT ON TABLE dispositivos_fichaje IS 'Terminales/medios de fichaje permitidos. No incluye biometría como método (prohibida en el borrador del nuevo RD salvo excepción legal).';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON dispositivos_fichaje
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE tipos_evento_fichaje (
    id                      SMALLSERIAL PRIMARY KEY,
    codigo                  VARCHAR(30) NOT NULL UNIQUE,
    descripcion             VARCHAR(150) NOT NULL,
    computa_como_trabajo    BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE tipos_evento_fichaje IS 'Catálogo global: ENTRADA, SALIDA, INICIO_PAUSA, FIN_PAUSA, etc.';


CREATE TABLE motivos_pausa (
    id                      SMALLSERIAL PRIMARY KEY,
    empresa_id              UUID REFERENCES empresas(id) ON DELETE RESTRICT,
    nombre                  VARCHAR(100) NOT NULL,
    computa_como_trabajo    BOOLEAN NOT NULL DEFAULT FALSE,
    duracion_max_minutos    SMALLINT
);
COMMENT ON COLUMN motivos_pausa.empresa_id IS 'NULL = motivo del catálogo global (ej. comida, descanso legal); con valor = motivo propio de una empresa.';

CREATE TABLE fichajes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    trabajador_id           UUID NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
    centro_trabajo_id       UUID NOT NULL REFERENCES centros_trabajo(id) ON DELETE RESTRICT,
    tipo_evento_id          SMALLINT NOT NULL REFERENCES tipos_evento_fichaje(id) ON DELETE RESTRICT,
    motivo_pausa_id         SMALLINT REFERENCES motivos_pausa(id) ON DELETE RESTRICT,
    fecha_hora              TIMESTAMPTZ NOT NULL,
    fecha_hora_dispositivo  TIMESTAMPTZ,
    metodo_fichaje          metodo_fichaje_enum NOT NULL,
    dispositivo_id          UUID REFERENCES dispositivos_fichaje(id) ON DELETE SET NULL,
    latitud                 NUMERIC(9,6) CHECK (latitud BETWEEN -90 AND 90),
    longitud                NUMERIC(9,6) CHECK (longitud BETWEEN -180 AND 180),
    ip_address              INET,
    origen                  origen_fichaje_enum NOT NULL DEFAULT 'trabajador',
    estado                  estado_fichaje_enum NOT NULL DEFAULT 'valido',
    fichaje_sustituido_id   UUID REFERENCES fichajes(id) ON DELETE RESTRICT,
    hash_integridad         VARCHAR(64) NOT NULL,
    observaciones           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE fichajes IS 'Registro de jornada. Tabla INMUTABLE (append-only): ver triggers de bloqueo de UPDATE/DELETE más abajo. Cualquier corrección se gestiona en correcciones_fichaje, opcionalmente insertando una nueva fila que referencia fichaje_sustituido_id.';
COMMENT ON COLUMN fichajes.fecha_hora IS 'Instante oficial del fichaje (referencia legal).';
COMMENT ON COLUMN fichajes.fecha_hora_dispositivo IS 'Hora reportada por el dispositivo/app del trabajador; permite detectar desincronización o manipulación del reloj local.';
COMMENT ON COLUMN fichajes.hash_integridad IS 'SHA-256 calculado automáticamente sobre los campos clave del registro (ver trigger calcular_hash_fichaje), para evidenciar manipulación.';
COMMENT ON COLUMN fichajes.created_at IS 'Momento real de inserción en el sistema (no editable); es la prueba temporal frente a fecha_hora, que puede haberse fijado manualmente en una corrección.';

CREATE INDEX idx_fichajes_trabajador_fecha ON fichajes (trabajador_id, fecha_hora DESC);
CREATE INDEX idx_fichajes_empresa_fecha ON fichajes (empresa_id, fecha_hora DESC);
CREATE INDEX idx_fichajes_centro_fecha ON fichajes (centro_trabajo_id, fecha_hora DESC);
CREATE INDEX idx_fichajes_sustituido ON fichajes (fichaje_sustituido_id) WHERE fichaje_sustituido_id IS NOT NULL;

CREATE TABLE correcciones_fichaje (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id                  UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    fichaje_afectado_id         UUID REFERENCES fichajes(id) ON DELETE RESTRICT,
    trabajador_id               UUID NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
    tipo_correccion             tipo_correccion_enum NOT NULL,
    valor_anterior              JSONB,
    valor_nuevo                 JSONB NOT NULL,
    motivo                      TEXT NOT NULL,
    solicitado_por_usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    aprobado_por_usuario_id     UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    estado                      estado_correccion_enum NOT NULL DEFAULT 'pendiente',
    fecha_solicitud             TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion            TIMESTAMPTZ
);
COMMENT ON TABLE correcciones_fichaje IS 'Flujo auditable de altas manuales, modificaciones y anulaciones de fichajes. Esta tabla SÍ es mutable (estado pasa de pendiente a aprobada/rechazada), a diferencia de fichajes.';

CREATE INDEX idx_correcciones_fichaje_afectado ON correcciones_fichaje (fichaje_afectado_id);
CREATE INDEX idx_correcciones_empresa_estado ON correcciones_fichaje (empresa_id, estado);

-- ============================================================================
-- 8. AUDITORÍA Y RETENCIÓN
-- ============================================================================

CREATE TABLE auditoria_accesos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    trabajador_id   UUID REFERENCES trabajadores(id) ON DELETE SET NULL,
    accion          accion_auditoria_enum NOT NULL,
    detalle         JSONB,
    ip_address      INET,
    fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE auditoria_accesos IS 'Registra cada consulta, exportación o descarga de fichajes: quién, de qué trabajador y cuándo. Sirve de prueba de que el sistema permite el acceso exigido por ley a trabajador, representantes legales e ITSS, y de detección de accesos indebidos.';

CREATE INDEX idx_auditoria_empresa_fecha ON auditoria_accesos (empresa_id, fecha_hora DESC);
CREATE INDEX idx_auditoria_trabajador ON auditoria_accesos (trabajador_id) WHERE trabajador_id IS NOT NULL;

CREATE TABLE resumenes_jornada (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    trabajador_id       UUID NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
    fecha               DATE NOT NULL,
    hora_entrada        TIMESTAMPTZ,
    hora_salida         TIMESTAMPTZ,
    minutos_trabajados  INTEGER NOT NULL DEFAULT 0,
    minutos_pausa       INTEGER NOT NULL DEFAULT 0,
    minutos_extra       INTEGER NOT NULL DEFAULT 0,
    tiene_incidencia    BOOLEAN NOT NULL DEFAULT FALSE,
    cerrado             BOOLEAN NOT NULL DEFAULT FALSE,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trabajador_id, fecha)
);
COMMENT ON TABLE resumenes_jornada IS 'Tabla de agregados diarios, recalculada por la aplicación (o un job) a partir de v_fichajes_vigentes. No sustituye a fichajes como prueba legal; es una capa de consulta rápida para nómina y cuadros de mando.';

CREATE INDEX idx_resumenes_empresa_fecha ON resumenes_jornada (empresa_id, fecha DESC);

CREATE TABLE politicas_retencion (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID REFERENCES empresas(id) ON DELETE RESTRICT,
    anios_conservacion      SMALLINT NOT NULL DEFAULT 4 CHECK (anios_conservacion >= 4),
    accion_tras_periodo     accion_retencion_enum NOT NULL DEFAULT 'archivar',
    UNIQUE NULLS NOT DISTINCT (empresa_id)
);
COMMENT ON TABLE politicas_retencion IS 'Política de conservación legal (mínimo 4 años, art. 34.9 ET). empresa_id NULL = política global por defecto aplicada a empresas sin configuración propia.';

INSERT INTO politicas_retencion (empresa_id, anios_conservacion, accion_tras_periodo)
VALUES (NULL, 4, 'archivar');

-- ============================================================================
-- 9. INMUTABILIDAD DE FICHAJES (defensa en profundidad a nivel de BD)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_bloquear_modificacion_fichaje() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los fichajes son inmutables (append-only). Para corregir o anular un registro, inserte una fila en correcciones_fichaje y, si procede, un nuevo fichaje que referencie fichaje_sustituido_id.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bloquear_update_fichaje BEFORE UPDATE ON fichajes
    FOR EACH ROW EXECUTE FUNCTION trg_bloquear_modificacion_fichaje();

CREATE TRIGGER bloquear_delete_fichaje BEFORE DELETE ON fichajes
    FOR EACH ROW EXECUTE FUNCTION trg_bloquear_modificacion_fichaje();

-- ============================================================================
-- 10. HASH DE INTEGRIDAD AUTOMÁTICO
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_calcular_hash_fichaje() RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.hash_integridad := encode(
        digest(
            concat_ws('|',
                NEW.empresa_id, NEW.trabajador_id, NEW.tipo_evento_id,
                NEW.fecha_hora, NEW.metodo_fichaje, NEW.dispositivo_id,
                NEW.created_at
            ),
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calcular_hash_fichaje BEFORE INSERT ON fichajes
    FOR EACH ROW EXECUTE FUNCTION trg_calcular_hash_fichaje();
-- Nota: este hash evidencia corrupción o ediciones fuera del flujo normal de
-- la aplicación. Para una garantía criptográfica más fuerte frente a accesos
-- directos a la BD, puede encadenarse con el hash de la fila anterior
-- (estilo blockchain) o firmarse externamente; se deja como mejora futura.

-- ============================================================================
-- 11. VISTA DE FICHAJES VIGENTES
-- ============================================================================

CREATE VIEW v_fichajes_vigentes AS
SELECT f.*
FROM fichajes f
WHERE f.id NOT IN (
    SELECT fichaje_sustituido_id FROM fichajes WHERE fichaje_sustituido_id IS NOT NULL
)
AND NOT EXISTS (
    SELECT 1 FROM correcciones_fichaje c
    WHERE c.fichaje_afectado_id = f.id
      AND c.tipo_correccion = 'anulacion'
      AND c.estado = 'aprobada'
);
COMMENT ON VIEW v_fichajes_vigentes IS 'Fichajes con efecto legal actual: excluye los anulados (vía correcciones_fichaje aprobadas) y los ya sustituidos por una fila más reciente. Es la vista que deben usar nómina, informes e inspección; nunca se borra ni edita la fila original.';

-- ============================================================================
-- 12. SEGURIDAD A NIVEL DE FILA (RLS) PARA AISLAMIENTO MULTIEMPRESA
-- ============================================================================
-- La aplicación debe fijar, por conexión/sesión, las variables:
--   SET app.current_empresa_id = '<uuid-de-la-empresa>';   -- usuarios de empresa
--   SET app.is_gestoria_admin = 'true';                    -- personal de gestoría con acceso multiempresa
-- Ambas funciones son STABLE y de solo lectura sobre la sesión.

CREATE OR REPLACE FUNCTION current_empresa_id() RETURNS UUID AS $$
    SELECT current_setting('app.current_empresa_id', true)::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_gestoria_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE(current_setting('app.is_gestoria_admin', true)::boolean, false);
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'centros_trabajo', 'departamentos', 'trabajadores', 'contratos',
        'calendarios_laborales', 'turnos', 'dispositivos_fichaje',
        'motivos_pausa', 'fichajes', 'correcciones_fichaje', 'usuarios',
        'usuarios_roles', 'auditoria_accesos', 'resumenes_jornada',
        'politicas_retencion'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (is_gestoria_admin() OR empresa_id = current_empresa_id())',
            t
        );
    END LOOP;
END $$;

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON empresas
    USING (is_gestoria_admin() OR id = current_empresa_id());

-- ============================================================================
-- 13. DATOS SEMILLA (catálogos globales)
-- ============================================================================

INSERT INTO tipos_evento_fichaje (codigo, descripcion, computa_como_trabajo) VALUES
    ('ENTRADA',        'Entrada a la jornada',            TRUE),
    ('SALIDA',         'Salida de la jornada',            TRUE),
    ('INICIO_PAUSA',   'Inicio de pausa o descanso',       FALSE),
    ('FIN_PAUSA',      'Fin de pausa o descanso',          TRUE),
    ('INICIO_VIAJE',   'Inicio de desplazamiento laboral', TRUE),
    ('FIN_VIAJE',      'Fin de desplazamiento laboral',    TRUE);

INSERT INTO motivos_pausa (empresa_id, nombre, computa_como_trabajo, duracion_max_minutos) VALUES
    (NULL, 'Comida',                FALSE, 60),
    (NULL, 'Descanso legal',        FALSE, 15),
    (NULL, 'Lactancia',             TRUE,  60),
    (NULL, 'Consulta médica',       FALSE, NULL);

INSERT INTO roles (nombre, descripcion) VALUES
    ('admin_gestoria',      'Administrador de la gestoría, acceso a todas las empresas gestionadas'),
    ('admin_empresa',       'Administrador de una empresa cliente'),
    ('rrhh',                'Gestión de personal, contratos y correcciones de fichaje'),
    ('representante_legal', 'Consulta de fichajes para representación legal de los trabajadores'),
    ('trabajador',          'Autoservicio: fichar y consultar su propio historial'),
    ('auditor_itss',        'Acceso de solo lectura para la Inspección de Trabajo');

INSERT INTO permisos (codigo, descripcion) VALUES
    ('fichajes.fichar',        'Registrar entradas, salidas y pausas propias'),
    ('fichajes.ver_propio',    'Consultar el propio historial de fichajes'),
    ('fichajes.ver_empresa',   'Consultar los fichajes de toda la empresa'),
    ('fichajes.corregir',      'Solicitar o aprobar correcciones de fichaje'),
    ('fichajes.exportar',      'Exportar fichajes (informes, ITSS, etc.)'),
    ('empresas.administrar',   'Administrar configuración de la empresa'),
    ('personal.administrar',   'Dar de alta/baja trabajadores y contratos');
