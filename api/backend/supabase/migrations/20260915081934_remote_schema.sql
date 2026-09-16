


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."accion_auditoria_enum" AS ENUM (
    'Consulta',
    'Exportación',
    'Descarga',
    'Modificación',
    'Acceso_denegado'
);


ALTER TYPE "public"."accion_auditoria_enum" OWNER TO "postgres";


CREATE TYPE "public"."accion_retencion_enum" AS ENUM (
    'Archivar',
    'Anonimizar',
    'Eliminar'
);


ALTER TYPE "public"."accion_retencion_enum" OWNER TO "postgres";


CREATE TYPE "public"."estado_correccion_enum" AS ENUM (
    'Pendiente',
    'Aprobada',
    'Rechazada'
);


ALTER TYPE "public"."estado_correccion_enum" OWNER TO "postgres";


CREATE TYPE "public"."estado_fichaje_enum" AS ENUM (
    'Válido',
    'Pendiente_revisión'
);


ALTER TYPE "public"."estado_fichaje_enum" OWNER TO "postgres";


CREATE TYPE "public"."metodo_fichaje_enum" AS ENUM (
    'App_móvil',
    'Terminal_rfid',
    'Terminal_pin',
    'Lector_qr',
    'Web',
    'Geolocalización',
    'Manual'
);


ALTER TYPE "public"."metodo_fichaje_enum" OWNER TO "postgres";


CREATE TYPE "public"."origen_fichaje_enum" AS ENUM (
    'Trabajador',
    'Corrección_rrhh',
    'Sistema'
);


ALTER TYPE "public"."origen_fichaje_enum" OWNER TO "postgres";


CREATE TYPE "public"."tipo_contrato_enum" AS ENUM (
    'Indefinido',
    'Temporal',
    'Formación',
    'Prácticas',
    'Fijo_discontinuo',
    'Otro'
);


ALTER TYPE "public"."tipo_contrato_enum" OWNER TO "postgres";


CREATE TYPE "public"."tipo_correccion_enum" AS ENUM (
    'Alta_manual',
    'Modificación',
    'Anulación'
);


ALTER TYPE "public"."tipo_correccion_enum" OWNER TO "postgres";


CREATE TYPE "public"."tipo_jornada_enum" AS ENUM (
    'Completa',
    'Parcial'
);


ALTER TYPE "public"."tipo_jornada_enum" OWNER TO "postgres";


CREATE TYPE "public"."tipo_usuario_enum" AS ENUM (
    'Admin_gestoría',
    'Admin_empresa',
    'Rrhh',
    'Representante_legal',
    'Trabajador',
    'Auditor_itss'
);


ALTER TYPE "public"."tipo_usuario_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bloquear_modificacion_borrado"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        RAISE EXCEPTION 'Operación no permitida: No está permitido modificar registros en la tabla %.', TG_TABLE_NAME;
    ELSIF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'Operación no permitida: No está permitido eliminar registros en la tabla %.', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bloquear_modificacion_borrado"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alembic_version" (
    "version_num" character varying(32) NOT NULL
);


ALTER TABLE "public"."alembic_version" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asignaciones_turno" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trabajador_id" "uuid" NOT NULL,
    "turno_id" "uuid" NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "asignaciones_turno_check" CHECK ((("fecha_fin" IS NULL) OR ("fecha_fin" >= "fecha_inicio")))
);


ALTER TABLE "public"."asignaciones_turno" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditoria_accesos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "accion" "public"."accion_auditoria_enum" NOT NULL,
    "fecha_hora" timestamp with time zone DEFAULT "now"() NOT NULL,
    "usuario_id" "uuid",
    "trabajador_id" "uuid",
    "detalle" "jsonb",
    "ip_address" "inet"
);


ALTER TABLE "public"."auditoria_accesos" OWNER TO "postgres";


COMMENT ON TABLE "public"."auditoria_accesos" IS 'Registra cada consulta, exportación o descarga de fichajes: quién, de qué trabajador y cuándo. Sirve de prueba de que el sistema permite el acceso exigido por ley a trabajador, representantes legales e ITSS, y de detección de accesos indebidos.';



CREATE TABLE IF NOT EXISTS "public"."ausencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "trabajador_id" "uuid" NOT NULL,
    "tipo_ausencia" "text" NOT NULL,
    "estado" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date" NOT NULL,
    "motivo" "text" NOT NULL,
    "justificante_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "validado_por_usuario_id" "uuid",
    "fecha_resolucion" timestamp with time zone,
    "observaciones_admin" "text",
    CONSTRAINT "ausencias_fechas_check" CHECK (("fecha_fin" >= "fecha_inicio"))
);


ALTER TABLE "public"."ausencias" OWNER TO "postgres";


COMMENT ON TABLE "public"."ausencias" IS 'Registro centralizado de ausencias, bajas y vacaciones. Requiere validación de RRHH.';



COMMENT ON COLUMN "public"."ausencias"."motivo" IS 'Explicación o causa legal de la ausencia.';



COMMENT ON COLUMN "public"."ausencias"."observaciones_admin" IS 'Notas añadidas por el validador al aprobar/rechazar.';



CREATE TABLE IF NOT EXISTS "public"."calendarios_laborales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "anio" smallint NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "centro_trabajo_id" "uuid",
    "activo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."calendarios_laborales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."centros_trabajo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "zona_horaria" character varying(50) DEFAULT 'Europe/Madrid'::character varying NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo_ccc" character varying(20),
    "direccion" "text",
    "latitud" double precision,
    "longitud" double precision
);


ALTER TABLE "public"."centros_trabajo" OWNER TO "postgres";


COMMENT ON COLUMN "public"."centros_trabajo"."codigo_ccc" IS 'Código de Cuenta de Cotización a la Seguridad Social del centro, si aplica.';



CREATE TABLE IF NOT EXISTS "public"."contratos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trabajador_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "centro_trabajo_id" "uuid" NOT NULL,
    "tipo_contrato" "public"."tipo_contrato_enum" NOT NULL,
    "tipo_jornada" "public"."tipo_jornada_enum" NOT NULL,
    "horas_semana" numeric(5,2) NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "departamento_id" "uuid",
    "puesto_trabajo" character varying(150),
    "categoria_profesional" character varying(150),
    "fecha_fin" "date",
    "calendario_laboral_id" "uuid",
    CONSTRAINT "contratos_check" CHECK ((("fecha_fin" IS NULL) OR ("fecha_fin" >= "fecha_inicio"))),
    CONSTRAINT "contratos_horas_semana_check" CHECK (("horas_semana" > (0)::numeric))
);


ALTER TABLE "public"."contratos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."correcciones_fichaje" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "trabajador_id" "uuid" NOT NULL,
    "tipo_correccion" "public"."tipo_correccion_enum" NOT NULL,
    "valor_nuevo" "jsonb" NOT NULL,
    "motivo" "text" NOT NULL,
    "solicitado_por_usuario_id" "uuid" NOT NULL,
    "estado" "public"."estado_correccion_enum" DEFAULT 'Pendiente'::"public"."estado_correccion_enum" NOT NULL,
    "fecha_solicitud" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fichaje_afectado_id" "uuid",
    "valor_anterior" "jsonb",
    "aprobado_por_usuario_id" "uuid",
    "fecha_resolucion" timestamp with time zone,
    "tipo_evento_id" "uuid" NOT NULL,
    "firma_solicitante" "text",
    "firma_resolutor" "text"
);


ALTER TABLE "public"."correcciones_fichaje" OWNER TO "postgres";


COMMENT ON TABLE "public"."correcciones_fichaje" IS 'Flujo auditable de altas manuales, modificaciones y anulaciones de fichajes. Esta tabla SÍ es mutable (estado pasa de pendiente a aprobada/rechazada), a diferencia de fichajes.';



COMMENT ON COLUMN "public"."correcciones_fichaje"."firma_solicitante" IS 'Ruta de la firma digital de quien solicita la corrección.';



COMMENT ON COLUMN "public"."correcciones_fichaje"."firma_resolutor" IS 'Ruta de la firma digital de quien resuelve la corrección.';



CREATE TABLE IF NOT EXISTS "public"."departamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "centro_trabajo_id" "uuid",
    "activo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."departamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispositivos_fichaje" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "tipo_dispositivo" "public"."metodo_fichaje_enum" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "fecha_alta" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "centro_trabajo_id" "uuid"
);


ALTER TABLE "public"."dispositivos_fichaje" OWNER TO "postgres";


COMMENT ON TABLE "public"."dispositivos_fichaje" IS 'Terminales/medios de fichaje permitidos. No incluye biometría como método (prohibida en el borrador del nuevo RD salvo excepción legal).';



CREATE TABLE IF NOT EXISTS "public"."dispositivos_push" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "fcm_token" "text" NOT NULL,
    "plataforma" character varying(20),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dispositivos_push" OWNER TO "postgres";


COMMENT ON TABLE "public"."dispositivos_push" IS 'Almacena los tokens FCM para el envío de notificaciones push a la app móvil.';



CREATE TABLE IF NOT EXISTS "public"."empresas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razon_social" character varying(255) NOT NULL,
    "cif" character varying(20) NOT NULL,
    "zona_horaria" character varying(50) DEFAULT 'Europe/Madrid'::character varying NOT NULL,
    "configuracion" json DEFAULT '{}'::"jsonb" NOT NULL,
    "fecha_alta" "date" DEFAULT CURRENT_DATE NOT NULL,
    "activa" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nombre_comercial" character varying(255),
    "codigo_cnae" character varying(10),
    "convenio_colectivo" character varying(255),
    "direccion_fiscal" "text",
    "fecha_baja" "date",
    "logo_url" "text",
    "es_gestoria" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."empresas" OWNER TO "postgres";


COMMENT ON TABLE "public"."empresas" IS 'Empresas cliente de la gestoría. Raíz de aislamiento multiempresa (tenant).';



CREATE TABLE IF NOT EXISTS "public"."festivos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "calendario_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "tipo" character varying(30) DEFAULT 'nacional'::character varying NOT NULL,
    "descripcion" character varying(255),
    "activo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."festivos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fichajes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "trabajador_id" "uuid" NOT NULL,
    "centro_trabajo_id" "uuid" NOT NULL,
    "fecha_hora" timestamp with time zone NOT NULL,
    "metodo_fichaje" "public"."metodo_fichaje_enum" NOT NULL,
    "origen" "public"."origen_fichaje_enum" DEFAULT 'Trabajador'::"public"."origen_fichaje_enum" NOT NULL,
    "estado" "public"."estado_fichaje_enum" DEFAULT 'Válido'::"public"."estado_fichaje_enum" NOT NULL,
    "hash_integridad" character varying(64) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "motivo_pausa_id" smallint,
    "fecha_hora_dispositivo" timestamp with time zone,
    "dispositivo_id" "uuid",
    "latitud" numeric(9,6),
    "longitud" numeric(9,6),
    "ip_address" integer,
    "fichaje_sustituido_id" "uuid",
    "observaciones" "text",
    "tipo_evento_id" "uuid" NOT NULL,
    "firma_digital" "text",
    CONSTRAINT "fichajes_latitud_check" CHECK ((("latitud" >= ('-90'::integer)::numeric) AND ("latitud" <= (90)::numeric))),
    CONSTRAINT "fichajes_longitud_check" CHECK ((("longitud" >= ('-180'::integer)::numeric) AND ("longitud" <= (180)::numeric)))
);


ALTER TABLE "public"."fichajes" OWNER TO "postgres";


COMMENT ON TABLE "public"."fichajes" IS 'Registro de jornada. Tabla INMUTABLE (append-only): ver triggers de bloqueo de UPDATE/DELETE más abajo. Cualquier corrección se gestiona en correcciones_fichaje, opcionalmente insertando una nueva fila que referencia fichaje_sustituido_id.';



COMMENT ON COLUMN "public"."fichajes"."fecha_hora" IS 'Instante oficial del fichaje (referencia legal).';



COMMENT ON COLUMN "public"."fichajes"."hash_integridad" IS 'SHA-256 calculado automáticamente sobre los campos clave del registro (ver trigger calcular_hash_fichaje), para evidenciar manipulación.';



COMMENT ON COLUMN "public"."fichajes"."created_at" IS 'Momento real de inserción en el sistema (no editable); es la prueba temporal frente a fecha_hora, que puede haberse fijado manualmente en una corrección.';



COMMENT ON COLUMN "public"."fichajes"."fecha_hora_dispositivo" IS 'Hora reportada por el dispositivo/app del trabajador; permite detectar desincronización o manipulación del reloj local.';



COMMENT ON COLUMN "public"."fichajes"."firma_digital" IS 'Firma digitalizada en Base64 o URL del archivo.';



CREATE TABLE IF NOT EXISTS "public"."licencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(50) DEFAULT "upper"("substr"("replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text"), 1, 12)) NOT NULL,
    "usada" boolean DEFAULT false NOT NULL,
    "fecha_expiracion" "date",
    "empresa_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."licencias" OWNER TO "postgres";


COMMENT ON TABLE "public"."licencias" IS 'Códigos de licencia de activación para el registro de nuevas empresas.';



CREATE TABLE IF NOT EXISTS "public"."motivos_pausa" (
    "id" smallint NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "computa_como_trabajo" boolean DEFAULT false NOT NULL,
    "empresa_id" "uuid",
    "duracion_max_minutos" smallint
);


ALTER TABLE "public"."motivos_pausa" OWNER TO "postgres";


COMMENT ON COLUMN "public"."motivos_pausa"."empresa_id" IS 'NULL = motivo del catálogo global (ej. comida, descanso legal); con valor = motivo propio de una empresa.';



CREATE SEQUENCE IF NOT EXISTS "public"."motivos_pausa_id_seq"
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."motivos_pausa_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."motivos_pausa_id_seq" OWNED BY "public"."motivos_pausa"."id";



CREATE TABLE IF NOT EXISTS "public"."permisos" (
    "codigo" character varying(100) NOT NULL,
    "descripcion" character varying(255),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."permisos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."politicas_retencion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anios_conservacion" smallint DEFAULT 4 NOT NULL,
    "accion_tras_periodo" "public"."accion_retencion_enum" DEFAULT 'Archivar'::"public"."accion_retencion_enum" NOT NULL,
    "empresa_id" "uuid",
    CONSTRAINT "politicas_retencion_anios_conservacion_check" CHECK (("anios_conservacion" >= 4))
);


ALTER TABLE "public"."politicas_retencion" OWNER TO "postgres";


COMMENT ON TABLE "public"."politicas_retencion" IS 'Política de conservación legal (mínimo 4 años, art. 34.9 ET). empresa_id NULL = política global por defecto aplicada a empresas sin configuración propia.';



CREATE TABLE IF NOT EXISTS "public"."resumenes_jornada" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "trabajador_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "minutos_trabajados" integer DEFAULT 0 NOT NULL,
    "minutos_pausa" integer DEFAULT 0 NOT NULL,
    "minutos_extra" integer DEFAULT 0 NOT NULL,
    "tiene_incidencia" boolean DEFAULT false NOT NULL,
    "cerrado" boolean DEFAULT false NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hora_entrada" timestamp with time zone,
    "hora_salida" timestamp with time zone
);


ALTER TABLE "public"."resumenes_jornada" OWNER TO "postgres";


COMMENT ON TABLE "public"."resumenes_jornada" IS 'Tabla de agregados diarios, recalculada por la aplicación (o un job) a partir de v_fichajes_vigentes. No sustituye a fichajes como prueba legal; es una capa de consulta rápida para nómina y cuadros de mando.';



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "nombre" character varying(100) NOT NULL,
    "descripcion" character varying(255),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles_permisos" (
    "rol_id" "uuid" NOT NULL,
    "permiso_id" "uuid" NOT NULL
);


ALTER TABLE "public"."roles_permisos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipos_evento_fichaje" (
    "codigo" character varying(30) NOT NULL,
    "descripcion" character varying(150) NOT NULL,
    "computa_como_trabajo" boolean DEFAULT true NOT NULL,
    "empresa_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."tipos_evento_fichaje" OWNER TO "postgres";


COMMENT ON TABLE "public"."tipos_evento_fichaje" IS 'Catálogo global: ENTRADA, SALIDA, INICIO_PAUSA, FIN_PAUSA, etc.';



COMMENT ON COLUMN "public"."tipos_evento_fichaje"."empresa_id" IS 'Nulo si es un tipo de evento global del sistema.';



CREATE TABLE IF NOT EXISTS "public"."trabajadores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "dni_nif_nie" character varying(9) NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "apellidos" character varying(150) NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "fecha_alta_empresa" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" character varying(255),
    "telefono" character varying(30),
    "numero_seguridad_social" character varying(20),
    "fecha_nacimiento" "date",
    "fecha_baja_empresa" "date",
    "foto_url" "text",
    "rol_id" "uuid"
);


ALTER TABLE "public"."trabajadores" OWNER TO "postgres";


COMMENT ON TABLE "public"."trabajadores" IS 'Trabajadores de cada empresa cliente. El derecho de supresión (art. 17 RGPD) no aplica mientras existan fichajes en periodo de conservación legal (excepción art. 17.3.b RGPD); en su lugar se usa activo/fecha_baja_empresa.';



CREATE TABLE IF NOT EXISTS "public"."turnos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "hora_inicio" time without time zone NOT NULL,
    "hora_fin" time without time zone NOT NULL,
    "duracion_pausa_minutos" smallint DEFAULT 0 NOT NULL,
    "dias_semana" smallint[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    CONSTRAINT "dias_semana_validos" CHECK (("dias_semana" <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint]))
);


ALTER TABLE "public"."turnos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."turnos"."dias_semana" IS 'Días de la semana en que aplica el turno: 1=lunes ... 7=domingo.';



CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "tipo_usuario" "public"."tipo_usuario_enum" NOT NULL,
    "mfa_habilitado" boolean DEFAULT false NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "empresa_id" "uuid",
    "trabajador_id" "uuid",
    "ultimo_acceso" timestamp with time zone,
    "codigo_recuperacion" character varying(10),
    "codigo_expira_at" timestamp with time zone
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


COMMENT ON COLUMN "public"."usuarios"."empresa_id" IS 'NULL para usuarios de la gestoría, administradores de empresa globales o auditores ITSS.';



CREATE TABLE IF NOT EXISTS "public"."usuarios_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "rol_id" "uuid" NOT NULL
);


ALTER TABLE "public"."usuarios_roles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."usuarios_roles"."empresa_id" IS 'Ámbito estricto del rol: toda asignación requiere una empresa asociada.';



CREATE OR REPLACE VIEW "public"."v_fichajes_vigentes" AS
 SELECT "id",
    "empresa_id",
    "trabajador_id",
    "centro_trabajo_id",
    "fecha_hora",
    "metodo_fichaje",
    "origen",
    "estado",
    "hash_integridad",
    "created_at",
    "motivo_pausa_id",
    "fecha_hora_dispositivo",
    "dispositivo_id",
    "latitud",
    "longitud",
    "ip_address",
    "fichaje_sustituido_id",
    "observaciones",
    "tipo_evento_id",
    "firma_digital"
   FROM "public"."fichajes" "f"
  WHERE ((NOT ("id" IN ( SELECT "fichajes"."fichaje_sustituido_id"
           FROM "public"."fichajes"
          WHERE ("fichajes"."fichaje_sustituido_id" IS NOT NULL)))) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."correcciones_fichaje" "c"
          WHERE (("c"."fichaje_afectado_id" = "f"."id") AND ("c"."tipo_correccion" = 'Anulación'::"public"."tipo_correccion_enum") AND ("c"."estado" = 'Aprobada'::"public"."estado_correccion_enum"))))));


ALTER VIEW "public"."v_fichajes_vigentes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."motivos_pausa" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."motivos_pausa_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."alembic_version"
    ADD CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num");



ALTER TABLE ONLY "public"."asignaciones_turno"
    ADD CONSTRAINT "asignaciones_turno_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditoria_accesos"
    ADD CONSTRAINT "auditoria_accesos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ausencias"
    ADD CONSTRAINT "ausencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendarios_laborales"
    ADD CONSTRAINT "calendarios_laborales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."centros_trabajo"
    ADD CONSTRAINT "centros_trabajo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispositivos_fichaje"
    ADD CONSTRAINT "dispositivos_fichaje_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispositivos_push"
    ADD CONSTRAINT "dispositivos_push_fcm_token_key" UNIQUE ("fcm_token");



ALTER TABLE ONLY "public"."dispositivos_push"
    ADD CONSTRAINT "dispositivos_push_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_cif_key" UNIQUE ("cif");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."festivos"
    ADD CONSTRAINT "festivos_calendario_id_fecha_key" UNIQUE ("calendario_id", "fecha");



ALTER TABLE ONLY "public"."festivos"
    ADD CONSTRAINT "festivos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."licencias"
    ADD CONSTRAINT "licencias_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."licencias"
    ADD CONSTRAINT "licencias_empresa_id_key" UNIQUE ("empresa_id");



ALTER TABLE ONLY "public"."licencias"
    ADD CONSTRAINT "licencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."motivos_pausa"
    ADD CONSTRAINT "motivos_pausa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permisos"
    ADD CONSTRAINT "permisos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."permisos"
    ADD CONSTRAINT "permisos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."politicas_retencion"
    ADD CONSTRAINT "politicas_retencion_empresa_id_key" UNIQUE ("empresa_id");



ALTER TABLE ONLY "public"."politicas_retencion"
    ADD CONSTRAINT "politicas_retencion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resumenes_jornada"
    ADD CONSTRAINT "resumenes_jornada_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resumenes_jornada"
    ADD CONSTRAINT "resumenes_jornada_trabajador_id_fecha_key" UNIQUE ("trabajador_id", "fecha");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("rol_id", "permiso_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipos_evento_fichaje"
    ADD CONSTRAINT "tipos_evento_fichaje_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."tipos_evento_fichaje"
    ADD CONSTRAINT "tipos_evento_fichaje_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trabajadores"
    ADD CONSTRAINT "trabajadores_empresa_id_dni_nif_nie_key" UNIQUE ("empresa_id", "dni_nif_nie");



ALTER TABLE ONLY "public"."trabajadores"
    ADD CONSTRAINT "trabajadores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."turnos"
    ADD CONSTRAINT "turnos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios_roles"
    ADD CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios_roles"
    ADD CONSTRAINT "usuarios_roles_usuario_id_rol_id_empresa_id_key" UNIQUE ("usuario_id", "rol_id", "empresa_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_trabajador_id_key" UNIQUE ("trabajador_id");



CREATE INDEX "idx_auditoria_empresa_fecha" ON "public"."auditoria_accesos" USING "btree" ("empresa_id", "fecha_hora");



CREATE INDEX "idx_auditoria_trabajador" ON "public"."auditoria_accesos" USING "btree" ("trabajador_id") WHERE ("trabajador_id" IS NOT NULL);



CREATE INDEX "idx_correcciones_empresa_estado" ON "public"."correcciones_fichaje" USING "btree" ("empresa_id", "estado");



CREATE INDEX "idx_correcciones_fichaje_afectado" ON "public"."correcciones_fichaje" USING "btree" ("fichaje_afectado_id");



CREATE INDEX "idx_fichajes_centro_fecha" ON "public"."fichajes" USING "btree" ("centro_trabajo_id", "fecha_hora");



CREATE INDEX "idx_fichajes_empresa_fecha" ON "public"."fichajes" USING "btree" ("empresa_id", "fecha_hora");



CREATE INDEX "idx_fichajes_sustituido" ON "public"."fichajes" USING "btree" ("fichaje_sustituido_id") WHERE ("fichaje_sustituido_id" IS NOT NULL);



CREATE INDEX "idx_fichajes_trabajador_fecha" ON "public"."fichajes" USING "btree" ("trabajador_id", "fecha_hora");



CREATE INDEX "idx_resumenes_empresa_fecha" ON "public"."resumenes_jornada" USING "btree" ("empresa_id", "fecha");



CREATE UNIQUE INDEX "trabajadores_email_activo_key" ON "public"."trabajadores" USING "btree" ("email") WHERE (("activo" IS TRUE) AND ("email" IS NOT NULL));



CREATE UNIQUE INDEX "usuarios_email_activo_key" ON "public"."usuarios" USING "btree" ("email") WHERE ("activo" IS TRUE);



CREATE OR REPLACE TRIGGER "trg_proteger_auditoria_accesos" BEFORE DELETE OR UPDATE ON "public"."auditoria_accesos" FOR EACH ROW EXECUTE FUNCTION "public"."bloquear_modificacion_borrado"();



CREATE OR REPLACE TRIGGER "trg_proteger_fichajes" BEFORE DELETE OR UPDATE ON "public"."fichajes" FOR EACH ROW EXECUTE FUNCTION "public"."bloquear_modificacion_borrado"();



ALTER TABLE ONLY "public"."asignaciones_turno"
    ADD CONSTRAINT "asignaciones_turno_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."asignaciones_turno"
    ADD CONSTRAINT "asignaciones_turno_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditoria_accesos"
    ADD CONSTRAINT "auditoria_accesos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."auditoria_accesos"
    ADD CONSTRAINT "auditoria_accesos_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."auditoria_accesos"
    ADD CONSTRAINT "auditoria_accesos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ausencias"
    ADD CONSTRAINT "ausencias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ausencias"
    ADD CONSTRAINT "ausencias_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ausencias"
    ADD CONSTRAINT "ausencias_validado_por_usuario_id_fkey" FOREIGN KEY ("validado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."calendarios_laborales"
    ADD CONSTRAINT "calendarios_laborales_centro_trabajo_id_fkey" FOREIGN KEY ("centro_trabajo_id") REFERENCES "public"."centros_trabajo"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendarios_laborales"
    ADD CONSTRAINT "calendarios_laborales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."centros_trabajo"
    ADD CONSTRAINT "centros_trabajo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_calendario_laboral_id_fkey" FOREIGN KEY ("calendario_laboral_id") REFERENCES "public"."calendarios_laborales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_centro_trabajo_id_fkey" FOREIGN KEY ("centro_trabajo_id") REFERENCES "public"."centros_trabajo"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_aprobado_por_usuario_id_fkey" FOREIGN KEY ("aprobado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_fichaje_afectado_id_fkey" FOREIGN KEY ("fichaje_afectado_id") REFERENCES "public"."fichajes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_solicitado_por_usuario_id_fkey" FOREIGN KEY ("solicitado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_tipo_evento_id_fkey" FOREIGN KEY ("tipo_evento_id") REFERENCES "public"."tipos_evento_fichaje"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correcciones_fichaje"
    ADD CONSTRAINT "correcciones_fichaje_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_centro_trabajo_id_fkey" FOREIGN KEY ("centro_trabajo_id") REFERENCES "public"."centros_trabajo"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dispositivos_fichaje"
    ADD CONSTRAINT "dispositivos_fichaje_centro_trabajo_id_fkey" FOREIGN KEY ("centro_trabajo_id") REFERENCES "public"."centros_trabajo"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dispositivos_fichaje"
    ADD CONSTRAINT "dispositivos_fichaje_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dispositivos_push"
    ADD CONSTRAINT "dispositivos_push_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."festivos"
    ADD CONSTRAINT "festivos_calendario_id_fkey" FOREIGN KEY ("calendario_id") REFERENCES "public"."calendarios_laborales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_centro_trabajo_id_fkey" FOREIGN KEY ("centro_trabajo_id") REFERENCES "public"."centros_trabajo"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos_fichaje"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_fichaje_sustituido_id_fkey" FOREIGN KEY ("fichaje_sustituido_id") REFERENCES "public"."fichajes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_motivo_pausa_id_fkey" FOREIGN KEY ("motivo_pausa_id") REFERENCES "public"."motivos_pausa"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_tipo_evento_id_fkey" FOREIGN KEY ("tipo_evento_id") REFERENCES "public"."tipos_evento_fichaje"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fichajes"
    ADD CONSTRAINT "fichajes_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."licencias"
    ADD CONSTRAINT "licencias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."motivos_pausa"
    ADD CONSTRAINT "motivos_pausa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."politicas_retencion"
    ADD CONSTRAINT "politicas_retencion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resumenes_jornada"
    ADD CONSTRAINT "resumenes_jornada_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resumenes_jornada"
    ADD CONSTRAINT "resumenes_jornada_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tipos_evento_fichaje"
    ADD CONSTRAINT "tipos_evento_fichaje_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id");



ALTER TABLE ONLY "public"."trabajadores"
    ADD CONSTRAINT "trabajadores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."trabajadores"
    ADD CONSTRAINT "trabajadores_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."turnos"
    ADD CONSTRAINT "turnos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."usuarios_roles"
    ADD CONSTRAINT "usuarios_roles_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."usuarios_roles"
    ADD CONSTRAINT "usuarios_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_roles"
    ADD CONSTRAINT "usuarios_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("id") ON DELETE RESTRICT;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;




































































































































































































drop extension if exists "pg_net";

revoke delete on table "public"."alembic_version" from "anon";

revoke insert on table "public"."alembic_version" from "anon";

revoke references on table "public"."alembic_version" from "anon";

revoke select on table "public"."alembic_version" from "anon";

revoke trigger on table "public"."alembic_version" from "anon";

revoke truncate on table "public"."alembic_version" from "anon";

revoke update on table "public"."alembic_version" from "anon";

revoke delete on table "public"."alembic_version" from "authenticated";

revoke insert on table "public"."alembic_version" from "authenticated";

revoke references on table "public"."alembic_version" from "authenticated";

revoke select on table "public"."alembic_version" from "authenticated";

revoke trigger on table "public"."alembic_version" from "authenticated";

revoke truncate on table "public"."alembic_version" from "authenticated";

revoke update on table "public"."alembic_version" from "authenticated";

revoke delete on table "public"."alembic_version" from "service_role";

revoke insert on table "public"."alembic_version" from "service_role";

revoke references on table "public"."alembic_version" from "service_role";

revoke select on table "public"."alembic_version" from "service_role";

revoke trigger on table "public"."alembic_version" from "service_role";

revoke truncate on table "public"."alembic_version" from "service_role";

revoke update on table "public"."alembic_version" from "service_role";

revoke delete on table "public"."asignaciones_turno" from "anon";

revoke insert on table "public"."asignaciones_turno" from "anon";

revoke references on table "public"."asignaciones_turno" from "anon";

revoke select on table "public"."asignaciones_turno" from "anon";

revoke trigger on table "public"."asignaciones_turno" from "anon";

revoke truncate on table "public"."asignaciones_turno" from "anon";

revoke update on table "public"."asignaciones_turno" from "anon";

revoke delete on table "public"."asignaciones_turno" from "authenticated";

revoke insert on table "public"."asignaciones_turno" from "authenticated";

revoke references on table "public"."asignaciones_turno" from "authenticated";

revoke select on table "public"."asignaciones_turno" from "authenticated";

revoke trigger on table "public"."asignaciones_turno" from "authenticated";

revoke truncate on table "public"."asignaciones_turno" from "authenticated";

revoke update on table "public"."asignaciones_turno" from "authenticated";

revoke delete on table "public"."asignaciones_turno" from "service_role";

revoke insert on table "public"."asignaciones_turno" from "service_role";

revoke references on table "public"."asignaciones_turno" from "service_role";

revoke select on table "public"."asignaciones_turno" from "service_role";

revoke trigger on table "public"."asignaciones_turno" from "service_role";

revoke truncate on table "public"."asignaciones_turno" from "service_role";

revoke update on table "public"."asignaciones_turno" from "service_role";

revoke delete on table "public"."auditoria_accesos" from "anon";

revoke insert on table "public"."auditoria_accesos" from "anon";

revoke references on table "public"."auditoria_accesos" from "anon";

revoke select on table "public"."auditoria_accesos" from "anon";

revoke trigger on table "public"."auditoria_accesos" from "anon";

revoke truncate on table "public"."auditoria_accesos" from "anon";

revoke update on table "public"."auditoria_accesos" from "anon";

revoke delete on table "public"."auditoria_accesos" from "authenticated";

revoke insert on table "public"."auditoria_accesos" from "authenticated";

revoke references on table "public"."auditoria_accesos" from "authenticated";

revoke select on table "public"."auditoria_accesos" from "authenticated";

revoke trigger on table "public"."auditoria_accesos" from "authenticated";

revoke truncate on table "public"."auditoria_accesos" from "authenticated";

revoke update on table "public"."auditoria_accesos" from "authenticated";

revoke delete on table "public"."auditoria_accesos" from "service_role";

revoke insert on table "public"."auditoria_accesos" from "service_role";

revoke references on table "public"."auditoria_accesos" from "service_role";

revoke select on table "public"."auditoria_accesos" from "service_role";

revoke trigger on table "public"."auditoria_accesos" from "service_role";

revoke truncate on table "public"."auditoria_accesos" from "service_role";

revoke update on table "public"."auditoria_accesos" from "service_role";

revoke delete on table "public"."ausencias" from "anon";

revoke insert on table "public"."ausencias" from "anon";

revoke references on table "public"."ausencias" from "anon";

revoke select on table "public"."ausencias" from "anon";

revoke trigger on table "public"."ausencias" from "anon";

revoke truncate on table "public"."ausencias" from "anon";

revoke update on table "public"."ausencias" from "anon";

revoke delete on table "public"."ausencias" from "authenticated";

revoke insert on table "public"."ausencias" from "authenticated";

revoke references on table "public"."ausencias" from "authenticated";

revoke select on table "public"."ausencias" from "authenticated";

revoke trigger on table "public"."ausencias" from "authenticated";

revoke truncate on table "public"."ausencias" from "authenticated";

revoke update on table "public"."ausencias" from "authenticated";

revoke delete on table "public"."ausencias" from "service_role";

revoke insert on table "public"."ausencias" from "service_role";

revoke references on table "public"."ausencias" from "service_role";

revoke select on table "public"."ausencias" from "service_role";

revoke trigger on table "public"."ausencias" from "service_role";

revoke truncate on table "public"."ausencias" from "service_role";

revoke update on table "public"."ausencias" from "service_role";

revoke delete on table "public"."calendarios_laborales" from "anon";

revoke insert on table "public"."calendarios_laborales" from "anon";

revoke references on table "public"."calendarios_laborales" from "anon";

revoke select on table "public"."calendarios_laborales" from "anon";

revoke trigger on table "public"."calendarios_laborales" from "anon";

revoke truncate on table "public"."calendarios_laborales" from "anon";

revoke update on table "public"."calendarios_laborales" from "anon";

revoke delete on table "public"."calendarios_laborales" from "authenticated";

revoke insert on table "public"."calendarios_laborales" from "authenticated";

revoke references on table "public"."calendarios_laborales" from "authenticated";

revoke select on table "public"."calendarios_laborales" from "authenticated";

revoke trigger on table "public"."calendarios_laborales" from "authenticated";

revoke truncate on table "public"."calendarios_laborales" from "authenticated";

revoke update on table "public"."calendarios_laborales" from "authenticated";

revoke delete on table "public"."calendarios_laborales" from "service_role";

revoke insert on table "public"."calendarios_laborales" from "service_role";

revoke references on table "public"."calendarios_laborales" from "service_role";

revoke select on table "public"."calendarios_laborales" from "service_role";

revoke trigger on table "public"."calendarios_laborales" from "service_role";

revoke truncate on table "public"."calendarios_laborales" from "service_role";

revoke update on table "public"."calendarios_laborales" from "service_role";

revoke delete on table "public"."centros_trabajo" from "anon";

revoke insert on table "public"."centros_trabajo" from "anon";

revoke references on table "public"."centros_trabajo" from "anon";

revoke select on table "public"."centros_trabajo" from "anon";

revoke trigger on table "public"."centros_trabajo" from "anon";

revoke truncate on table "public"."centros_trabajo" from "anon";

revoke update on table "public"."centros_trabajo" from "anon";

revoke delete on table "public"."centros_trabajo" from "authenticated";

revoke insert on table "public"."centros_trabajo" from "authenticated";

revoke references on table "public"."centros_trabajo" from "authenticated";

revoke select on table "public"."centros_trabajo" from "authenticated";

revoke trigger on table "public"."centros_trabajo" from "authenticated";

revoke truncate on table "public"."centros_trabajo" from "authenticated";

revoke update on table "public"."centros_trabajo" from "authenticated";

revoke delete on table "public"."centros_trabajo" from "service_role";

revoke insert on table "public"."centros_trabajo" from "service_role";

revoke references on table "public"."centros_trabajo" from "service_role";

revoke select on table "public"."centros_trabajo" from "service_role";

revoke trigger on table "public"."centros_trabajo" from "service_role";

revoke truncate on table "public"."centros_trabajo" from "service_role";

revoke update on table "public"."centros_trabajo" from "service_role";

revoke delete on table "public"."contratos" from "anon";

revoke insert on table "public"."contratos" from "anon";

revoke references on table "public"."contratos" from "anon";

revoke select on table "public"."contratos" from "anon";

revoke trigger on table "public"."contratos" from "anon";

revoke truncate on table "public"."contratos" from "anon";

revoke update on table "public"."contratos" from "anon";

revoke delete on table "public"."contratos" from "authenticated";

revoke insert on table "public"."contratos" from "authenticated";

revoke references on table "public"."contratos" from "authenticated";

revoke select on table "public"."contratos" from "authenticated";

revoke trigger on table "public"."contratos" from "authenticated";

revoke truncate on table "public"."contratos" from "authenticated";

revoke update on table "public"."contratos" from "authenticated";

revoke delete on table "public"."contratos" from "service_role";

revoke insert on table "public"."contratos" from "service_role";

revoke references on table "public"."contratos" from "service_role";

revoke select on table "public"."contratos" from "service_role";

revoke trigger on table "public"."contratos" from "service_role";

revoke truncate on table "public"."contratos" from "service_role";

revoke update on table "public"."contratos" from "service_role";

revoke delete on table "public"."correcciones_fichaje" from "anon";

revoke insert on table "public"."correcciones_fichaje" from "anon";

revoke references on table "public"."correcciones_fichaje" from "anon";

revoke select on table "public"."correcciones_fichaje" from "anon";

revoke trigger on table "public"."correcciones_fichaje" from "anon";

revoke truncate on table "public"."correcciones_fichaje" from "anon";

revoke update on table "public"."correcciones_fichaje" from "anon";

revoke delete on table "public"."correcciones_fichaje" from "authenticated";

revoke insert on table "public"."correcciones_fichaje" from "authenticated";

revoke references on table "public"."correcciones_fichaje" from "authenticated";

revoke select on table "public"."correcciones_fichaje" from "authenticated";

revoke trigger on table "public"."correcciones_fichaje" from "authenticated";

revoke truncate on table "public"."correcciones_fichaje" from "authenticated";

revoke update on table "public"."correcciones_fichaje" from "authenticated";

revoke delete on table "public"."correcciones_fichaje" from "service_role";

revoke insert on table "public"."correcciones_fichaje" from "service_role";

revoke references on table "public"."correcciones_fichaje" from "service_role";

revoke select on table "public"."correcciones_fichaje" from "service_role";

revoke trigger on table "public"."correcciones_fichaje" from "service_role";

revoke truncate on table "public"."correcciones_fichaje" from "service_role";

revoke update on table "public"."correcciones_fichaje" from "service_role";

revoke delete on table "public"."departamentos" from "anon";

revoke insert on table "public"."departamentos" from "anon";

revoke references on table "public"."departamentos" from "anon";

revoke select on table "public"."departamentos" from "anon";

revoke trigger on table "public"."departamentos" from "anon";

revoke truncate on table "public"."departamentos" from "anon";

revoke update on table "public"."departamentos" from "anon";

revoke delete on table "public"."departamentos" from "authenticated";

revoke insert on table "public"."departamentos" from "authenticated";

revoke references on table "public"."departamentos" from "authenticated";

revoke select on table "public"."departamentos" from "authenticated";

revoke trigger on table "public"."departamentos" from "authenticated";

revoke truncate on table "public"."departamentos" from "authenticated";

revoke update on table "public"."departamentos" from "authenticated";

revoke delete on table "public"."departamentos" from "service_role";

revoke insert on table "public"."departamentos" from "service_role";

revoke references on table "public"."departamentos" from "service_role";

revoke select on table "public"."departamentos" from "service_role";

revoke trigger on table "public"."departamentos" from "service_role";

revoke truncate on table "public"."departamentos" from "service_role";

revoke update on table "public"."departamentos" from "service_role";

revoke delete on table "public"."dispositivos_fichaje" from "anon";

revoke insert on table "public"."dispositivos_fichaje" from "anon";

revoke references on table "public"."dispositivos_fichaje" from "anon";

revoke select on table "public"."dispositivos_fichaje" from "anon";

revoke trigger on table "public"."dispositivos_fichaje" from "anon";

revoke truncate on table "public"."dispositivos_fichaje" from "anon";

revoke update on table "public"."dispositivos_fichaje" from "anon";

revoke delete on table "public"."dispositivos_fichaje" from "authenticated";

revoke insert on table "public"."dispositivos_fichaje" from "authenticated";

revoke references on table "public"."dispositivos_fichaje" from "authenticated";

revoke select on table "public"."dispositivos_fichaje" from "authenticated";

revoke trigger on table "public"."dispositivos_fichaje" from "authenticated";

revoke truncate on table "public"."dispositivos_fichaje" from "authenticated";

revoke update on table "public"."dispositivos_fichaje" from "authenticated";

revoke delete on table "public"."dispositivos_fichaje" from "service_role";

revoke insert on table "public"."dispositivos_fichaje" from "service_role";

revoke references on table "public"."dispositivos_fichaje" from "service_role";

revoke select on table "public"."dispositivos_fichaje" from "service_role";

revoke trigger on table "public"."dispositivos_fichaje" from "service_role";

revoke truncate on table "public"."dispositivos_fichaje" from "service_role";

revoke update on table "public"."dispositivos_fichaje" from "service_role";

revoke delete on table "public"."dispositivos_push" from "anon";

revoke insert on table "public"."dispositivos_push" from "anon";

revoke references on table "public"."dispositivos_push" from "anon";

revoke select on table "public"."dispositivos_push" from "anon";

revoke trigger on table "public"."dispositivos_push" from "anon";

revoke truncate on table "public"."dispositivos_push" from "anon";

revoke update on table "public"."dispositivos_push" from "anon";

revoke delete on table "public"."dispositivos_push" from "authenticated";

revoke insert on table "public"."dispositivos_push" from "authenticated";

revoke references on table "public"."dispositivos_push" from "authenticated";

revoke select on table "public"."dispositivos_push" from "authenticated";

revoke trigger on table "public"."dispositivos_push" from "authenticated";

revoke truncate on table "public"."dispositivos_push" from "authenticated";

revoke update on table "public"."dispositivos_push" from "authenticated";

revoke delete on table "public"."dispositivos_push" from "service_role";

revoke insert on table "public"."dispositivos_push" from "service_role";

revoke references on table "public"."dispositivos_push" from "service_role";

revoke select on table "public"."dispositivos_push" from "service_role";

revoke trigger on table "public"."dispositivos_push" from "service_role";

revoke truncate on table "public"."dispositivos_push" from "service_role";

revoke update on table "public"."dispositivos_push" from "service_role";

revoke delete on table "public"."empresas" from "anon";

revoke insert on table "public"."empresas" from "anon";

revoke references on table "public"."empresas" from "anon";

revoke select on table "public"."empresas" from "anon";

revoke trigger on table "public"."empresas" from "anon";

revoke truncate on table "public"."empresas" from "anon";

revoke update on table "public"."empresas" from "anon";

revoke delete on table "public"."empresas" from "authenticated";

revoke insert on table "public"."empresas" from "authenticated";

revoke references on table "public"."empresas" from "authenticated";

revoke select on table "public"."empresas" from "authenticated";

revoke trigger on table "public"."empresas" from "authenticated";

revoke truncate on table "public"."empresas" from "authenticated";

revoke update on table "public"."empresas" from "authenticated";

revoke delete on table "public"."empresas" from "service_role";

revoke insert on table "public"."empresas" from "service_role";

revoke references on table "public"."empresas" from "service_role";

revoke select on table "public"."empresas" from "service_role";

revoke trigger on table "public"."empresas" from "service_role";

revoke truncate on table "public"."empresas" from "service_role";

revoke update on table "public"."empresas" from "service_role";

revoke delete on table "public"."festivos" from "anon";

revoke insert on table "public"."festivos" from "anon";

revoke references on table "public"."festivos" from "anon";

revoke select on table "public"."festivos" from "anon";

revoke trigger on table "public"."festivos" from "anon";

revoke truncate on table "public"."festivos" from "anon";

revoke update on table "public"."festivos" from "anon";

revoke delete on table "public"."festivos" from "authenticated";

revoke insert on table "public"."festivos" from "authenticated";

revoke references on table "public"."festivos" from "authenticated";

revoke select on table "public"."festivos" from "authenticated";

revoke trigger on table "public"."festivos" from "authenticated";

revoke truncate on table "public"."festivos" from "authenticated";

revoke update on table "public"."festivos" from "authenticated";

revoke delete on table "public"."festivos" from "service_role";

revoke insert on table "public"."festivos" from "service_role";

revoke references on table "public"."festivos" from "service_role";

revoke select on table "public"."festivos" from "service_role";

revoke trigger on table "public"."festivos" from "service_role";

revoke truncate on table "public"."festivos" from "service_role";

revoke update on table "public"."festivos" from "service_role";

revoke delete on table "public"."fichajes" from "anon";

revoke insert on table "public"."fichajes" from "anon";

revoke references on table "public"."fichajes" from "anon";

revoke select on table "public"."fichajes" from "anon";

revoke trigger on table "public"."fichajes" from "anon";

revoke truncate on table "public"."fichajes" from "anon";

revoke update on table "public"."fichajes" from "anon";

revoke delete on table "public"."fichajes" from "authenticated";

revoke insert on table "public"."fichajes" from "authenticated";

revoke references on table "public"."fichajes" from "authenticated";

revoke select on table "public"."fichajes" from "authenticated";

revoke trigger on table "public"."fichajes" from "authenticated";

revoke truncate on table "public"."fichajes" from "authenticated";

revoke update on table "public"."fichajes" from "authenticated";

revoke delete on table "public"."fichajes" from "service_role";

revoke insert on table "public"."fichajes" from "service_role";

revoke references on table "public"."fichajes" from "service_role";

revoke select on table "public"."fichajes" from "service_role";

revoke trigger on table "public"."fichajes" from "service_role";

revoke truncate on table "public"."fichajes" from "service_role";

revoke update on table "public"."fichajes" from "service_role";

revoke delete on table "public"."licencias" from "anon";

revoke insert on table "public"."licencias" from "anon";

revoke references on table "public"."licencias" from "anon";

revoke select on table "public"."licencias" from "anon";

revoke trigger on table "public"."licencias" from "anon";

revoke truncate on table "public"."licencias" from "anon";

revoke update on table "public"."licencias" from "anon";

revoke delete on table "public"."licencias" from "authenticated";

revoke insert on table "public"."licencias" from "authenticated";

revoke references on table "public"."licencias" from "authenticated";

revoke select on table "public"."licencias" from "authenticated";

revoke trigger on table "public"."licencias" from "authenticated";

revoke truncate on table "public"."licencias" from "authenticated";

revoke update on table "public"."licencias" from "authenticated";

revoke delete on table "public"."licencias" from "service_role";

revoke insert on table "public"."licencias" from "service_role";

revoke references on table "public"."licencias" from "service_role";

revoke select on table "public"."licencias" from "service_role";

revoke trigger on table "public"."licencias" from "service_role";

revoke truncate on table "public"."licencias" from "service_role";

revoke update on table "public"."licencias" from "service_role";

revoke delete on table "public"."motivos_pausa" from "anon";

revoke insert on table "public"."motivos_pausa" from "anon";

revoke references on table "public"."motivos_pausa" from "anon";

revoke select on table "public"."motivos_pausa" from "anon";

revoke trigger on table "public"."motivos_pausa" from "anon";

revoke truncate on table "public"."motivos_pausa" from "anon";

revoke update on table "public"."motivos_pausa" from "anon";

revoke delete on table "public"."motivos_pausa" from "authenticated";

revoke insert on table "public"."motivos_pausa" from "authenticated";

revoke references on table "public"."motivos_pausa" from "authenticated";

revoke select on table "public"."motivos_pausa" from "authenticated";

revoke trigger on table "public"."motivos_pausa" from "authenticated";

revoke truncate on table "public"."motivos_pausa" from "authenticated";

revoke update on table "public"."motivos_pausa" from "authenticated";

revoke delete on table "public"."motivos_pausa" from "service_role";

revoke insert on table "public"."motivos_pausa" from "service_role";

revoke references on table "public"."motivos_pausa" from "service_role";

revoke select on table "public"."motivos_pausa" from "service_role";

revoke trigger on table "public"."motivos_pausa" from "service_role";

revoke truncate on table "public"."motivos_pausa" from "service_role";

revoke update on table "public"."motivos_pausa" from "service_role";

revoke delete on table "public"."permisos" from "anon";

revoke insert on table "public"."permisos" from "anon";

revoke references on table "public"."permisos" from "anon";

revoke select on table "public"."permisos" from "anon";

revoke trigger on table "public"."permisos" from "anon";

revoke truncate on table "public"."permisos" from "anon";

revoke update on table "public"."permisos" from "anon";

revoke delete on table "public"."permisos" from "authenticated";

revoke insert on table "public"."permisos" from "authenticated";

revoke references on table "public"."permisos" from "authenticated";

revoke select on table "public"."permisos" from "authenticated";

revoke trigger on table "public"."permisos" from "authenticated";

revoke truncate on table "public"."permisos" from "authenticated";

revoke update on table "public"."permisos" from "authenticated";

revoke delete on table "public"."permisos" from "service_role";

revoke insert on table "public"."permisos" from "service_role";

revoke references on table "public"."permisos" from "service_role";

revoke select on table "public"."permisos" from "service_role";

revoke trigger on table "public"."permisos" from "service_role";

revoke truncate on table "public"."permisos" from "service_role";

revoke update on table "public"."permisos" from "service_role";

revoke delete on table "public"."politicas_retencion" from "anon";

revoke insert on table "public"."politicas_retencion" from "anon";

revoke references on table "public"."politicas_retencion" from "anon";

revoke select on table "public"."politicas_retencion" from "anon";

revoke trigger on table "public"."politicas_retencion" from "anon";

revoke truncate on table "public"."politicas_retencion" from "anon";

revoke update on table "public"."politicas_retencion" from "anon";

revoke delete on table "public"."politicas_retencion" from "authenticated";

revoke insert on table "public"."politicas_retencion" from "authenticated";

revoke references on table "public"."politicas_retencion" from "authenticated";

revoke select on table "public"."politicas_retencion" from "authenticated";

revoke trigger on table "public"."politicas_retencion" from "authenticated";

revoke truncate on table "public"."politicas_retencion" from "authenticated";

revoke update on table "public"."politicas_retencion" from "authenticated";

revoke delete on table "public"."politicas_retencion" from "service_role";

revoke insert on table "public"."politicas_retencion" from "service_role";

revoke references on table "public"."politicas_retencion" from "service_role";

revoke select on table "public"."politicas_retencion" from "service_role";

revoke trigger on table "public"."politicas_retencion" from "service_role";

revoke truncate on table "public"."politicas_retencion" from "service_role";

revoke update on table "public"."politicas_retencion" from "service_role";

revoke delete on table "public"."resumenes_jornada" from "anon";

revoke insert on table "public"."resumenes_jornada" from "anon";

revoke references on table "public"."resumenes_jornada" from "anon";

revoke select on table "public"."resumenes_jornada" from "anon";

revoke trigger on table "public"."resumenes_jornada" from "anon";

revoke truncate on table "public"."resumenes_jornada" from "anon";

revoke update on table "public"."resumenes_jornada" from "anon";

revoke delete on table "public"."resumenes_jornada" from "authenticated";

revoke insert on table "public"."resumenes_jornada" from "authenticated";

revoke references on table "public"."resumenes_jornada" from "authenticated";

revoke select on table "public"."resumenes_jornada" from "authenticated";

revoke trigger on table "public"."resumenes_jornada" from "authenticated";

revoke truncate on table "public"."resumenes_jornada" from "authenticated";

revoke update on table "public"."resumenes_jornada" from "authenticated";

revoke delete on table "public"."resumenes_jornada" from "service_role";

revoke insert on table "public"."resumenes_jornada" from "service_role";

revoke references on table "public"."resumenes_jornada" from "service_role";

revoke select on table "public"."resumenes_jornada" from "service_role";

revoke trigger on table "public"."resumenes_jornada" from "service_role";

revoke truncate on table "public"."resumenes_jornada" from "service_role";

revoke update on table "public"."resumenes_jornada" from "service_role";

revoke delete on table "public"."roles" from "anon";

revoke insert on table "public"."roles" from "anon";

revoke references on table "public"."roles" from "anon";

revoke select on table "public"."roles" from "anon";

revoke trigger on table "public"."roles" from "anon";

revoke truncate on table "public"."roles" from "anon";

revoke update on table "public"."roles" from "anon";

revoke delete on table "public"."roles" from "authenticated";

revoke insert on table "public"."roles" from "authenticated";

revoke references on table "public"."roles" from "authenticated";

revoke select on table "public"."roles" from "authenticated";

revoke trigger on table "public"."roles" from "authenticated";

revoke truncate on table "public"."roles" from "authenticated";

revoke update on table "public"."roles" from "authenticated";

revoke delete on table "public"."roles" from "service_role";

revoke insert on table "public"."roles" from "service_role";

revoke references on table "public"."roles" from "service_role";

revoke select on table "public"."roles" from "service_role";

revoke trigger on table "public"."roles" from "service_role";

revoke truncate on table "public"."roles" from "service_role";

revoke update on table "public"."roles" from "service_role";

revoke delete on table "public"."roles_permisos" from "anon";

revoke insert on table "public"."roles_permisos" from "anon";

revoke references on table "public"."roles_permisos" from "anon";

revoke select on table "public"."roles_permisos" from "anon";

revoke trigger on table "public"."roles_permisos" from "anon";

revoke truncate on table "public"."roles_permisos" from "anon";

revoke update on table "public"."roles_permisos" from "anon";

revoke delete on table "public"."roles_permisos" from "authenticated";

revoke insert on table "public"."roles_permisos" from "authenticated";

revoke references on table "public"."roles_permisos" from "authenticated";

revoke select on table "public"."roles_permisos" from "authenticated";

revoke trigger on table "public"."roles_permisos" from "authenticated";

revoke truncate on table "public"."roles_permisos" from "authenticated";

revoke update on table "public"."roles_permisos" from "authenticated";

revoke delete on table "public"."roles_permisos" from "service_role";

revoke insert on table "public"."roles_permisos" from "service_role";

revoke references on table "public"."roles_permisos" from "service_role";

revoke select on table "public"."roles_permisos" from "service_role";

revoke trigger on table "public"."roles_permisos" from "service_role";

revoke truncate on table "public"."roles_permisos" from "service_role";

revoke update on table "public"."roles_permisos" from "service_role";

revoke delete on table "public"."tipos_evento_fichaje" from "anon";

revoke insert on table "public"."tipos_evento_fichaje" from "anon";

revoke references on table "public"."tipos_evento_fichaje" from "anon";

revoke select on table "public"."tipos_evento_fichaje" from "anon";

revoke trigger on table "public"."tipos_evento_fichaje" from "anon";

revoke truncate on table "public"."tipos_evento_fichaje" from "anon";

revoke update on table "public"."tipos_evento_fichaje" from "anon";

revoke delete on table "public"."tipos_evento_fichaje" from "authenticated";

revoke insert on table "public"."tipos_evento_fichaje" from "authenticated";

revoke references on table "public"."tipos_evento_fichaje" from "authenticated";

revoke select on table "public"."tipos_evento_fichaje" from "authenticated";

revoke trigger on table "public"."tipos_evento_fichaje" from "authenticated";

revoke truncate on table "public"."tipos_evento_fichaje" from "authenticated";

revoke update on table "public"."tipos_evento_fichaje" from "authenticated";

revoke delete on table "public"."tipos_evento_fichaje" from "service_role";

revoke insert on table "public"."tipos_evento_fichaje" from "service_role";

revoke references on table "public"."tipos_evento_fichaje" from "service_role";

revoke select on table "public"."tipos_evento_fichaje" from "service_role";

revoke trigger on table "public"."tipos_evento_fichaje" from "service_role";

revoke truncate on table "public"."tipos_evento_fichaje" from "service_role";

revoke update on table "public"."tipos_evento_fichaje" from "service_role";

revoke delete on table "public"."trabajadores" from "anon";

revoke insert on table "public"."trabajadores" from "anon";

revoke references on table "public"."trabajadores" from "anon";

revoke select on table "public"."trabajadores" from "anon";

revoke trigger on table "public"."trabajadores" from "anon";

revoke truncate on table "public"."trabajadores" from "anon";

revoke update on table "public"."trabajadores" from "anon";

revoke delete on table "public"."trabajadores" from "authenticated";

revoke insert on table "public"."trabajadores" from "authenticated";

revoke references on table "public"."trabajadores" from "authenticated";

revoke select on table "public"."trabajadores" from "authenticated";

revoke trigger on table "public"."trabajadores" from "authenticated";

revoke truncate on table "public"."trabajadores" from "authenticated";

revoke update on table "public"."trabajadores" from "authenticated";

revoke delete on table "public"."trabajadores" from "service_role";

revoke insert on table "public"."trabajadores" from "service_role";

revoke references on table "public"."trabajadores" from "service_role";

revoke select on table "public"."trabajadores" from "service_role";

revoke trigger on table "public"."trabajadores" from "service_role";

revoke truncate on table "public"."trabajadores" from "service_role";

revoke update on table "public"."trabajadores" from "service_role";

revoke delete on table "public"."turnos" from "anon";

revoke insert on table "public"."turnos" from "anon";

revoke references on table "public"."turnos" from "anon";

revoke select on table "public"."turnos" from "anon";

revoke trigger on table "public"."turnos" from "anon";

revoke truncate on table "public"."turnos" from "anon";

revoke update on table "public"."turnos" from "anon";

revoke delete on table "public"."turnos" from "authenticated";

revoke insert on table "public"."turnos" from "authenticated";

revoke references on table "public"."turnos" from "authenticated";

revoke select on table "public"."turnos" from "authenticated";

revoke trigger on table "public"."turnos" from "authenticated";

revoke truncate on table "public"."turnos" from "authenticated";

revoke update on table "public"."turnos" from "authenticated";

revoke delete on table "public"."turnos" from "service_role";

revoke insert on table "public"."turnos" from "service_role";

revoke references on table "public"."turnos" from "service_role";

revoke select on table "public"."turnos" from "service_role";

revoke trigger on table "public"."turnos" from "service_role";

revoke truncate on table "public"."turnos" from "service_role";

revoke update on table "public"."turnos" from "service_role";

revoke delete on table "public"."usuarios" from "anon";

revoke insert on table "public"."usuarios" from "anon";

revoke references on table "public"."usuarios" from "anon";

revoke select on table "public"."usuarios" from "anon";

revoke trigger on table "public"."usuarios" from "anon";

revoke truncate on table "public"."usuarios" from "anon";

revoke update on table "public"."usuarios" from "anon";

revoke delete on table "public"."usuarios" from "authenticated";

revoke insert on table "public"."usuarios" from "authenticated";

revoke references on table "public"."usuarios" from "authenticated";

revoke select on table "public"."usuarios" from "authenticated";

revoke trigger on table "public"."usuarios" from "authenticated";

revoke truncate on table "public"."usuarios" from "authenticated";

revoke update on table "public"."usuarios" from "authenticated";

revoke delete on table "public"."usuarios" from "service_role";

revoke insert on table "public"."usuarios" from "service_role";

revoke references on table "public"."usuarios" from "service_role";

revoke select on table "public"."usuarios" from "service_role";

revoke trigger on table "public"."usuarios" from "service_role";

revoke truncate on table "public"."usuarios" from "service_role";

revoke update on table "public"."usuarios" from "service_role";

revoke delete on table "public"."usuarios_roles" from "anon";

revoke insert on table "public"."usuarios_roles" from "anon";

revoke references on table "public"."usuarios_roles" from "anon";

revoke select on table "public"."usuarios_roles" from "anon";

revoke trigger on table "public"."usuarios_roles" from "anon";

revoke truncate on table "public"."usuarios_roles" from "anon";

revoke update on table "public"."usuarios_roles" from "anon";

revoke delete on table "public"."usuarios_roles" from "authenticated";

revoke insert on table "public"."usuarios_roles" from "authenticated";

revoke references on table "public"."usuarios_roles" from "authenticated";

revoke select on table "public"."usuarios_roles" from "authenticated";

revoke trigger on table "public"."usuarios_roles" from "authenticated";

revoke truncate on table "public"."usuarios_roles" from "authenticated";

revoke update on table "public"."usuarios_roles" from "authenticated";

revoke delete on table "public"."usuarios_roles" from "service_role";

revoke insert on table "public"."usuarios_roles" from "service_role";

revoke references on table "public"."usuarios_roles" from "service_role";

revoke select on table "public"."usuarios_roles" from "service_role";

revoke trigger on table "public"."usuarios_roles" from "service_role";

revoke truncate on table "public"."usuarios_roles" from "service_role";

revoke update on table "public"."usuarios_roles" from "service_role";


