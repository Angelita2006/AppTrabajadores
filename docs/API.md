# API de Fichapp

Documento generado automáticamente desde el contrato OpenAPI de FastAPI.
No edites este archivo manualmente; ejecuta `python docs/generate_api_docs.py`.

- Versión: `1.0.0`
- Endpoints: `131`
- Esquemas: `90`

## Índice de endpoints

- [GET `/api`](#get-api) - Comprobar disponibilidad de la API (Sin categoría)
- [POST `/api/asignaciones-turno`](#post-api-asignaciones-turno) - Asignar turno a trabajador (Asignaciones de Turno)
- [POST `/api/asignaciones-turno/masiva`](#post-api-asignaciones-turno-masiva) - Asignación masiva de turnos (Asignaciones de Turno)
- [GET `/api/asignaciones-turno/trabajador/{id_trabajador}`](#get-api-asignaciones-turno-trabajador-id_trabajador) - Obtener asignaciones por trabajador (Asignaciones de Turno)
- [DELETE `/api/asignaciones-turno/trabajador/{trabajador_id}/eliminar-todas`](#delete-api-asignaciones-turno-trabajador-trabajador_id-eliminar-todas) - Eliminar todas las asignaciones de un trabajador (Asignaciones de Turno)
- [DELETE `/api/asignaciones-turno/{id_asignacion}`](#delete-api-asignaciones-turno-id_asignacion) - Eliminar asignación de turno (Asignaciones de Turno)
- [PATCH `/api/asignaciones-turno/{id_asignacion}/created-at`](#patch-api-asignaciones-turno-id_asignacion-created-at) - Actualizar fecha de creación de asignación (Asignaciones de Turno)
- [PUT `/api/asignaciones-turno/{id_asignacion}/editar`](#put-api-asignaciones-turno-id_asignacion-editar) - Editar asignación de turno (Asignaciones de Turno)
- [PUT `/api/asignaciones-turno/{id_asignacion}/finalizar`](#put-api-asignaciones-turno-id_asignacion-finalizar) - Finalizar vigencia de turno (Asignaciones de Turno)
- [POST `/api/auditoria-accesos`](#post-api-auditoria-accesos) - Registrar acceso de auditoría (Auditoría de Accesos)
- [GET `/api/auditoria-accesos/empresa/{id_empresa}`](#get-api-auditoria-accesos-empresa-id_empresa) - Obtener auditoría por empresa (Auditoría de Accesos)
- [GET `/api/auditoria-accesos/trabajador/{id_trabajador}`](#get-api-auditoria-accesos-trabajador-id_trabajador) - Obtener auditoría por trabajador (Auditoría de Accesos)
- [POST `/api/ausencias`](#post-api-ausencias) - Solicitar ausencia (Control de Ausencias y Bajas)
- [GET `/api/ausencias/empresa/{id_empresa}`](#get-api-ausencias-empresa-id_empresa) - Obtener ausencias por empresa (Control de Ausencias y Bajas)
- [GET `/api/ausencias/trabajador/{id_trabajador}`](#get-api-ausencias-trabajador-id_trabajador) - Obtener ausencias por trabajador (Control de Ausencias y Bajas)
- [PUT `/api/ausencias/{id_ausencia}/estado`](#put-api-ausencias-id_ausencia-estado) - Actualizar estado de ausencia (Control de Ausencias y Bajas)
- [PUT `/api/ausencias/{id_ausencia}/resolver`](#put-api-ausencias-id_ausencia-resolver) - Resolver solicitud de ausencia (Control de Ausencias y Bajas)
- [POST `/api/auth/confirmar-password`](#post-api-auth-confirmar-password) - Confirmar nueva contraseña (Autenticación)
- [POST `/api/auth/recuperar-password`](#post-api-auth-recuperar-password) - Solicitar recuperación de contraseña (Autenticación)
- [POST `/api/calendarios-laborales`](#post-api-calendarios-laborales) - Crear calendario laboral (Calendarios Laborales)
- [GET `/api/calendarios-laborales/centro/{id_centro}`](#get-api-calendarios-laborales-centro-id_centro) - Obtener calendarios por centro de trabajo (Calendarios Laborales)
- [GET `/api/calendarios-laborales/empresa/{id_empresa}`](#get-api-calendarios-laborales-empresa-id_empresa) - Obtener calendarios por empresa (Calendarios Laborales)
- [GET `/api/calendarios-laborales/empresa/{id_empresa}/con-festivos`](#get-api-calendarios-laborales-empresa-id_empresa-con-festivos) - Obtener calendarios y festivos por empresa (Calendarios Laborales)
- [POST `/api/calendarios-laborales/{calendario_id}/importar-pdf`](#post-api-calendarios-laborales-calendario_id-importar-pdf) - Importar festivos de calendario desde PDF (Calendarios Laborales)
- [GET `/api/calendarios-laborales/{id_calendario}`](#get-api-calendarios-laborales-id_calendario) - Obtener calendario laboral por ID (Calendarios Laborales)
- [PUT `/api/calendarios-laborales/{id_calendario}`](#put-api-calendarios-laborales-id_calendario) - Actualizar calendario laboral (Calendarios Laborales)
- [PUT `/api/calendarios-laborales/{id_calendario}/desactivar`](#put-api-calendarios-laborales-id_calendario-desactivar) - Dar de baja lógica calendario laboral (Calendarios Laborales)
- [POST `/api/centros-trabajo`](#post-api-centros-trabajo) - Crear centro de trabajo (Centros de Trabajo)
- [GET `/api/centros-trabajo/empresa/{id_empresa}`](#get-api-centros-trabajo-empresa-id_empresa) - Obtener centros de trabajo por empresa (Centros de Trabajo)
- [GET `/api/centros-trabajo/{id_centro}`](#get-api-centros-trabajo-id_centro) - Obtener centro de trabajo por ID (Centros de Trabajo)
- [PUT `/api/centros-trabajo/{id_centro}/desactivar`](#put-api-centros-trabajo-id_centro-desactivar) - Dar de baja lógica centro de trabajo (Centros de Trabajo)
- [PUT `/api/centros-trabajo/{id_centro}/editar`](#put-api-centros-trabajo-id_centro-editar) - Editar centro de trabajo (Centros de Trabajo)
- [PUT `/api/centros-trabajo/{id_centro}/estado`](#put-api-centros-trabajo-id_centro-estado) - Cambiar estado de centro de trabajo (Centros de Trabajo)
- [POST `/api/contratos`](#post-api-contratos) - Crear contrato laboral (Contratos)
- [DELETE `/api/contratos/empresa/{empresa_id}/trabajador/{trabajador_id}`](#delete-api-contratos-empresa-empresa_id-trabajador-trabajador_id) - Eliminar todos los contratos de un trabajador (Contratos)
- [GET `/api/contratos/empresa/{id_empresa}`](#get-api-contratos-empresa-id_empresa) - Obtener contratos por empresa (Contratos)
- [GET `/api/contratos/trabajador/{id_trabajador}`](#get-api-contratos-trabajador-id_trabajador) - Obtener contratos por trabajador (Contratos)
- [GET `/api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo`](#get-api-contratos-trabajador-id_trabajador-empresa-id_empresa-activo) - Obtener contrato activo de un trabajador (Contratos)
- [PUT `/api/contratos/{id_contrato}`](#put-api-contratos-id_contrato) - Actualizar contrato (Contratos)
- [PUT `/api/contratos/{id_contrato}/dar-baja`](#put-api-contratos-id_contrato-dar-baja) - Rescindir contrato (Contratos)
- [POST `/api/correcciones`](#post-api-correcciones) - Solicitar corrección (Correcciones de Fichaje)
- [GET `/api/correcciones/empresa/{id_empresa}`](#get-api-correcciones-empresa-id_empresa) - Obtener correcciones por empresa (Correcciones de Fichaje)
- [GET `/api/correcciones/trabajador/{id_trabajador}`](#get-api-correcciones-trabajador-id_trabajador) - Obtener correcciones por trabajador (Correcciones de Fichaje)
- [DELETE `/api/correcciones/{id_correccion}`](#delete-api-correcciones-id_correccion) - Eliminar solicitud de corrección (Correcciones de Fichaje)
- [PUT `/api/correcciones/{id_correccion}/resolver`](#put-api-correcciones-id_correccion-resolver) - Resolver incidencia de corrección (Correcciones de Fichaje)
- [POST `/api/departamentos`](#post-api-departamentos) - Crear departamento (Departamentos)
- [GET `/api/departamentos/empresa/{id_empresa}`](#get-api-departamentos-empresa-id_empresa) - Obtener departamentos por empresa (Departamentos)
- [GET `/api/departamentos/{id_departamento}`](#get-api-departamentos-id_departamento) - Obtener departamento por ID (Departamentos)
- [PUT `/api/departamentos/{id_departamento}`](#put-api-departamentos-id_departamento) - Editar departamento (Departamentos)
- [PUT `/api/departamentos/{id_departamento}/desactivar`](#put-api-departamentos-id_departamento-desactivar) - Dar de baja lógica departamento (Departamentos)
- [POST `/api/dispositivos`](#post-api-dispositivos) - Registrar dispositivo de fichaje (Dispositivos de Fichaje)
- [POST `/api/dispositivos-push/`](#post-api-dispositivos-push) - Registrar o actualizar dispositivo push (Dispositivos Push)
- [GET `/api/dispositivos-push/usuario/{usuario_id}`](#get-api-dispositivos-push-usuario-usuario_id) - Obtener dispositivos push por usuario (Dispositivos Push)
- [DELETE `/api/dispositivos-push/{id_dispositivo}`](#delete-api-dispositivos-push-id_dispositivo) - Eliminar dispositivo push (Dispositivos Push)
- [GET `/api/dispositivos/centro/{id_centro}`](#get-api-dispositivos-centro-id_centro) - Obtener dispositivos por centro de trabajo (Dispositivos de Fichaje)
- [GET `/api/dispositivos/empresa/{id_empresa}`](#get-api-dispositivos-empresa-id_empresa) - Obtener dispositivos por empresa (Dispositivos de Fichaje)
- [GET `/api/dispositivos/{id_dispositivo}`](#get-api-dispositivos-id_dispositivo) - Obtener dispositivo por ID (Dispositivos de Fichaje)
- [PUT `/api/dispositivos/{id_dispositivo}`](#put-api-dispositivos-id_dispositivo) - Actualizar dispositivo (Dispositivos de Fichaje)
- [PUT `/api/dispositivos/{id_dispositivo}/desactivar`](#put-api-dispositivos-id_dispositivo-desactivar) - Dar de baja lógica dispositivo (Dispositivos de Fichaje)
- [PUT `/api/dispositivos/{id_dispositivo}/estado`](#put-api-dispositivos-id_dispositivo-estado) - Cambiar estado de dispositivo (Dispositivos de Fichaje)
- [GET `/api/empresas`](#get-api-empresas) - Obtener lista de empresas (Empresas)
- [POST `/api/empresas`](#post-api-empresas) - Crear empresa (Empresas)
- [GET `/api/empresas/cif/{cif_empresa}`](#get-api-empresas-cif-cif_empresa) - Obtener empresa por CIF (Empresas)
- [POST `/api/empresas/registro-completo`](#post-api-empresas-registro-completo) - Registro atómico de organización, trabajador y usuario admin (Empresas)
- [GET `/api/empresas/{id_empresa}`](#get-api-empresas-id_empresa) - Obtener empresa por ID (Empresas)
- [PUT `/api/empresas/{id_empresa}`](#put-api-empresas-id_empresa) - Actualizar datos de empresa (Empresas)
- [PUT `/api/empresas/{id_empresa}/logo`](#put-api-empresas-id_empresa-logo) - Actualizar logo de empresa (Empresas)
- [PUT `/api/empresas/{id_empresa}/razon-social`](#put-api-empresas-id_empresa-razon-social) - Cambiar razón social de empresa (Empresas)
- [GET `/api/empresas/{id_empresa}/trabajadores`](#get-api-empresas-id_empresa-trabajadores) - Obtener trabajadores de empresa (Empresas)
- [POST `/api/festivos`](#post-api-festivos) - Crear día festivo (Festivos)
- [GET `/api/festivos/calendario/{id_calendario}`](#get-api-festivos-calendario-id_calendario) - Obtener festivos de calendario (Festivos)
- [PUT `/api/festivos/{id_festivo}/desactivar`](#put-api-festivos-id_festivo-desactivar) - Dar de baja lógica día festivo (Festivos)
- [PUT `/api/festivos/{id_festivo}/editar`](#put-api-festivos-id_festivo-editar) - Editar día festivo (Festivos)
- [POST `/api/fichajes`](#post-api-fichajes) - Registrar fichaje (Fichajes)
- [GET `/api/fichajes/empresa/{empresa_id}`](#get-api-fichajes-empresa-empresa_id) - Listar fichajes de empresa por fecha (Fichajes)
- [GET `/api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}`](#get-api-fichajes-trabajador-id_trabajador-empresa-id_empresa) - Obtener fichajes de trabajador por empresa (Fichajes)
- [GET `/api/fichajes/trabajador/{id_trabajador}/hoy`](#get-api-fichajes-trabajador-id_trabajador-hoy) - Obtener fichajes de hoy (Fichajes)
- [GET `/api/fichajes/trabajador/{id_trabajador}/semana`](#get-api-fichajes-trabajador-id_trabajador-semana) - Obtener fichajes de la semana actual (Fichajes)
- [GET `/api/fichajes/trabajador/{id_trabajador}/turno`](#get-api-fichajes-trabajador-id_trabajador-turno) - Obtener fichajes del turno actual (Fichajes)
- [GET `/api/fichajes/trabajador/{trabajador_id}/ultimo`](#get-api-fichajes-trabajador-trabajador_id-ultimo) - Obtener último fichaje del trabajador (Fichajes)
- [DELETE `/api/fichajes/{id_fichaje}`](#delete-api-fichajes-id_fichaje) - Eliminar fichaje (Fichajes)
- [GET `/api/fichajes/{id_fichaje}`](#get-api-fichajes-id_fichaje) - Obtener fichaje por ID (Fichajes)
- [PATCH `/api/fichajes/{id_fichaje}/validar`](#patch-api-fichajes-id_fichaje-validar) - Validar fichaje (Fichajes)
- [POST `/api/motivos-pausa`](#post-api-motivos-pausa) - Crear motivo de pausa (Motivos de Pausa)
- [GET `/api/motivos-pausa/empresa/{id_empresa}`](#get-api-motivos-pausa-empresa-id_empresa) - Obtener motivos de pausa disponibles por empresa (Motivos de Pausa)
- [GET `/api/motivos-pausa/{id_motivo}`](#get-api-motivos-pausa-id_motivo) - Obtener motivo de pausa por ID (Motivos de Pausa)
- [GET `/api/permisos`](#get-api-permisos) - Obtener todos los permisos (Permisos del Sistema)
- [POST `/api/permisos`](#post-api-permisos) - Crear permiso de seguridad (Permisos del Sistema)
- [POST `/api/politicas-retencion`](#post-api-politicas-retencion) - Crear política de retención (Políticas de Retención)
- [GET `/api/politicas-retencion/empresa/{id_empresa}`](#get-api-politicas-retencion-empresa-id_empresa) - Obtener política aplicable a empresa (Políticas de Retención)
- [GET `/api/politicas-retencion/global`](#get-api-politicas-retencion-global) - Obtener política global por defecto (Políticas de Retención)
- [PUT `/api/politicas-retencion/{id_politica}`](#put-api-politicas-retencion-id_politica) - Actualizar años de retención (Políticas de Retención)
- [POST `/api/resumenes-jornada`](#post-api-resumenes-jornada) - Crear o actualizar resumen de jornada (Resúmenes de Jornada)
- [GET `/api/resumenes-jornada/empresa/{id_empresa}/fecha/{fecha_dia}`](#get-api-resumenes-jornada-empresa-id_empresa-fecha-fecha_dia) - Obtener cuadro de mandos diario de empresa (Resúmenes de Jornada)
- [GET `/api/resumenes-jornada/trabajador/{id_trabajador}`](#get-api-resumenes-jornada-trabajador-id_trabajador) - Obtener resúmenes por trabajador (Resúmenes de Jornada)
- [PUT `/api/resumenes-jornada/{id_resumen}/cerrar`](#put-api-resumenes-jornada-id_resumen-cerrar) - Consolidar y cerrar jornada (Resúmenes de Jornada)
- [GET `/api/roles`](#get-api-roles) - Obtener todos los roles (Roles del Sistema)
- [POST `/api/roles`](#post-api-roles) - Crear rol de seguridad (Roles del Sistema)
- [GET `/api/roles/{id_rol}`](#get-api-roles-id_rol) - Obtener rol por ID (Roles del Sistema)
- [POST `/api/tipos-evento-fichaje`](#post-api-tipos-evento-fichaje) - Crear tipo de evento de fichaje (Tipos de Evento de Fichaje)
- [GET `/api/tipos-evento-fichaje/codigo/{codigo_clave}`](#get-api-tipos-evento-fichaje-codigo-codigo_clave) - Obtener tipo de evento por código (Tipos de Evento de Fichaje)
- [GET `/api/tipos-evento-fichaje/empresa/{empresa_id}`](#get-api-tipos-evento-fichaje-empresa-empresa_id) - Obtener tipos de evento por empresa (Tipos de Evento de Fichaje)
- [GET `/api/tipos-evento-fichaje/{id_tipo_evento}`](#get-api-tipos-evento-fichaje-id_tipo_evento) - Obtener tipo de evento por ID (Tipos de Evento de Fichaje)
- [PUT `/api/tipos-evento-fichaje/{id_tipo_evento}`](#put-api-tipos-evento-fichaje-id_tipo_evento) - Actualizar tipo de evento de fichaje (Tipos de Evento de Fichaje)
- [PUT `/api/tipos-evento-fichaje/{id_tipo_evento}/desactivar`](#put-api-tipos-evento-fichaje-id_tipo_evento-desactivar) - Dar de baja lógica tipo de evento de fichaje (Tipos de Evento de Fichaje)
- [POST `/api/trabajadores`](#post-api-trabajadores) - Registrar trabajador (Trabajadores)
- [GET `/api/trabajadores/empresa/{id_empresa}`](#get-api-trabajadores-empresa-id_empresa) - Obtener trabajadores por empresa (Trabajadores)
- [POST `/api/trabajadores/login`](#post-api-trabajadores-login) - Login de trabajador (Trabajadores)
- [POST `/api/trabajadores/turnos/{id_trabajador}`](#post-api-trabajadores-turnos-id_trabajador) - Asignar turnos a trabajador (Trabajadores)
- [DELETE `/api/trabajadores/{id_trabajador}`](#delete-api-trabajadores-id_trabajador) - Eliminar trabajador (Trabajadores)
- [GET `/api/trabajadores/{id_trabajador}`](#get-api-trabajadores-id_trabajador) - Obtener trabajador por ID (Trabajadores)
- [PATCH `/api/trabajadores/{id_trabajador}`](#patch-api-trabajadores-id_trabajador) - Actualizar trabajador (Trabajadores)
- [POST `/api/trabajadores/{id_trabajador}/baja-total`](#post-api-trabajadores-id_trabajador-baja-total) - Baja total y coordinada de un trabajador (Trabajadores)
- [GET `/api/trabajadores/{id_trabajador}/empresa`](#get-api-trabajadores-id_trabajador-empresa) - Obtener empresa del trabajador (Trabajadores)
- [PUT `/api/trabajadores/{id_trabajador}/foto`](#put-api-trabajadores-id_trabajador-foto) - Actualizar foto de trabajador (Trabajadores)
- [POST `/api/turnos`](#post-api-turnos) - Crear turno laboral (Turnos Laborales)
- [GET `/api/turnos/empresa/{id_empresa}`](#get-api-turnos-empresa-id_empresa) - Obtener turnos por empresa (Turnos Laborales)
- [GET `/api/turnos/{id_turno}`](#get-api-turnos-id_turno) - Obtener turno por ID (Turnos Laborales)
- [PUT `/api/turnos/{id_turno}/desactivar`](#put-api-turnos-id_turno-desactivar) - Dar de baja lógica turno laboral (Turnos Laborales)
- [PUT `/api/turnos/{id_turno}/editar`](#put-api-turnos-id_turno-editar) - Editar turno laboral (Turnos Laborales)
- [POST `/api/usuarios-roles`](#post-api-usuarios-roles) - Asignar rol a un usuario (Roles de Usuarios)
- [GET `/api/usuarios-roles/usuario/{id_usuario}`](#get-api-usuarios-roles-usuario-id_usuario) - Obtener roles de un usuario (Roles de Usuarios)
- [DELETE `/api/usuarios-roles/{id_asignacion}`](#delete-api-usuarios-roles-id_asignacion) - Revocar rol a un usuario (Roles de Usuarios)
- [PUT `/api/usuarios-roles/{id_asignacion}`](#put-api-usuarios-roles-id_asignacion) - Actualizar asignación de rol (Roles de Usuarios)
- [POST `/api/usuarios/login`](#post-api-usuarios-login) - Inicio de sesión en la plataforma (Usuarios y Autenticación)
- [POST `/api/usuarios/login-form`](#post-api-usuarios-login-form) - Inicio de sesión compatible con Swagger UI (Usuarios y Autenticación)
- [POST `/api/usuarios/registro`](#post-api-usuarios-registro) - Registro inicial de usuario (Usuarios y Autenticación)
- [GET `/api/usuarios/trabajador/{id_trabajador}`](#get-api-usuarios-trabajador-id_trabajador) - Obtener usuario por ID de trabajador (Usuarios y Autenticación)
- [GET `/api/usuarios/{id_usuario}`](#get-api-usuarios-id_usuario) - Obtener usuario por ID (Usuarios y Autenticación)
- [PUT `/api/usuarios/{id_usuario}/estado`](#put-api-usuarios-id_usuario-estado) - Modificar estado de cuenta de usuario (Usuarios y Autenticación)
- [PUT `/api/usuarios/{id_usuario}/password`](#put-api-usuarios-id_usuario-password) - Actualizar contraseña de usuario (Usuarios y Autenticación)

## Detalle

### <a id="get-api"></a>GET `/api`

**Comprobar disponibilidad de la API**

Devuelve un mensaje sencillo para verificar que el servicio está disponible.

Respuestas:

- `200`: Successful Response

### <a id="post-api-asignaciones-turno"></a>POST `/api/asignaciones-turno`

**Asignar turno a trabajador**

**POST /api/asignaciones-turno**

Vincula a un trabajador con un turno teórico fijando su fecha de inicio de vigencia.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="post-api-asignaciones-turno-masiva"></a>POST `/api/asignaciones-turno/masiva`

**Asignación masiva de turnos**

**POST /api/asignaciones-turno/masiva**

Vincula a un trabajador con múltiples turnos de forma atómica.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-asignaciones-turno-trabajador-id_trabajador"></a>GET `/api/asignaciones-turno/trabajador/{id_trabajador}`

**Obtener asignaciones por trabajador**

**GET /api/asignaciones-turno/trabajador/{id_trabajador}**

Recupera el cuadrante histórico y actual de turnos planificados para un operario específico.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-asignaciones-turno-trabajador-trabajador_id-eliminar-todas"></a>DELETE `/api/asignaciones-turno/trabajador/{trabajador_id}/eliminar-todas`

**Eliminar todas las asignaciones de un trabajador**

**DELETE /api/asignaciones-turno/trabajador/{trabajador_id}/eliminar-todas**

Elimina todas las asignaciones de turno vinculadas a un trabajador específico.

Parámetros:

- `trabajador_id` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-asignaciones-turno-id_asignacion"></a>DELETE `/api/asignaciones-turno/{id_asignacion}`

**Eliminar asignación de turno**

**DELETE /api/asignaciones-turno/{id_asignacion}**

Elimina físicamente una asignación del plan.

Parámetros:

- `id_asignacion` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="patch-api-asignaciones-turno-id_asignacion-created-at"></a>PATCH `/api/asignaciones-turno/{id_asignacion}/created-at`

**Actualizar fecha de creación de asignación**

**PATCH /api/asignaciones-turno/{id_asignacion}/created-at**

Da a la asignación de turno un fecha de creación.

Parámetros:

- `id_asignacion` (path, string, obligatorio)
- `fecha_creacion` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-asignaciones-turno-id_asignacion-editar"></a>PUT `/api/asignaciones-turno/{id_asignacion}/editar`

**Editar asignación de turno**

**PUT /api/asignaciones-turno/{id_asignacion}/editar?fecha_fin=AAAA-MM-DD**

Edita los datos sobre un turno asignado para permitir rotaciones horarias.

Parámetros:

- `id_asignacion` (path, string, obligatorio)
- `fecha_fin` (query, string, obligatorio)
- `fecha_inicio` (query, objeto, opcional)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-asignaciones-turno-id_asignacion-finalizar"></a>PUT `/api/asignaciones-turno/{id_asignacion}/finalizar`

**Finalizar vigencia de turno**

**PUT /api/asignaciones-turno/{id_asignacion}/finalizar?fecha_fin=AAAA-MM-DD**

Establece la fecha de corte o vencimiento de un turno asignado para permitir rotaciones horarias.

Parámetros:

- `id_asignacion` (path, string, obligatorio)
- `fecha_fin` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-auditoria-accesos"></a>POST `/api/auditoria-accesos`

**Registrar acceso de auditoría**

**POST /api/auditoria-accesos**

Registra de forma inmutable una acción de consulta, descarga o exportación de datos horarios.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-auditoria-accesos-empresa-id_empresa"></a>GET `/api/auditoria-accesos/empresa/{id_empresa}`

**Obtener auditoría por empresa**

**GET /api/auditoria-accesos/empresa/{id_empresa}**

Recupera el historial de consultas de forma aislada para un cliente específico (tenant).

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-auditoria-accesos-trabajador-id_trabajador"></a>GET `/api/auditoria-accesos/trabajador/{id_trabajador}`

**Obtener auditoría por trabajador**

**GET /api/auditoria-accesos/trabajador/{id_trabajador}**

Filtra qué usuarios o inspectores han revisado el expediente de un operario concreto.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-ausencias"></a>POST `/api/ausencias`

**Solicitar ausencia**

**POST /api/ausencias**

Registra una nueva solicitud de ausencia (vacaciones, baja, etc.) en estado 'pendiente' por defecto.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-ausencias-empresa-id_empresa"></a>GET `/api/ausencias/empresa/{id_empresa}`

**Obtener ausencias por empresa**

**GET /api/ausencias/empresa/{id_empresa}**

Filtra las solicitudes dentro de una empresa cliente para el panel de recursos humanos.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-ausencias-trabajador-id_trabajador"></a>GET `/api/ausencias/trabajador/{id_trabajador}`

**Obtener ausencias por trabajador**

**GET /api/ausencias/trabajador/{id_trabajador}**

Permite al operario consultar el estado de sus bajas o vacaciones desde la app móvil.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-ausencias-id_ausencia-estado"></a>PUT `/api/ausencias/{id_ausencia}/estado`

**Actualizar estado de ausencia**

**PUT /api/ausencias/{id_ausencia}/estado?nuevo_estado=aprobado**

Modifica el estado de una solicitud de ausencia (aprobar o rechazar).

Parámetros:

- `id_ausencia` (path, string, obligatorio)
- `nuevo_estado` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-ausencias-id_ausencia-resolver"></a>PUT `/api/ausencias/{id_ausencia}/resolver`

**Resolver solicitud de ausencia**

**PUT /api/ausencias/{id_ausencia}/resolver?nuevo_estado=aprobada&resolutor_usuario_id=UUID**

Tramita la resolución (aprobación/rechazo) de un periodo de ausencia por parte de administración.

Parámetros:

- `id_ausencia` (path, string, obligatorio)
- `nuevo_estado` (query, objeto, obligatorio)
- `resolutor_usuario_id` (query, string, obligatorio)
- `observaciones` (query, objeto, opcional)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-auth-confirmar-password"></a>POST `/api/auth/confirmar-password`

**Confirmar nueva contraseña**

**POST /api/auth/confirmar-password**

Valida el código de recuperación persistido en la BD y actualiza la contraseña.

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-auth-recuperar-password"></a>POST `/api/auth/recuperar-password`

**Solicitar recuperación de contraseña**

**POST /api/auth/recuperar-password**

Valida el correo en PostgreSQL, genera un código aleatorio de 6 dígitos y lo guarda en la BD.

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-calendarios-laborales"></a>POST `/api/calendarios-laborales`

**Crear calendario laboral**

**POST /api/calendarios-laborales**

Registra un nuevo calendario laboral anual asociándolo a una empresa o centro de trabajo.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-calendarios-laborales-centro-id_centro"></a>GET `/api/calendarios-laborales/centro/{id_centro}`

**Obtener calendarios por centro de trabajo**

**GET /api/calendarios-laborales/centro/{id_centro}**

Recupera los calendarios asociados específicamente a una sede física concreta.

Parámetros:

- `id_centro` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-calendarios-laborales-empresa-id_empresa"></a>GET `/api/calendarios-laborales/empresa/{id_empresa}`

**Obtener calendarios por empresa**

**GET /api/calendarios-laborales/empresa/{id_empresa}**

Recupera los calendarios dados de alta de forma aislada por una organización (tenant).

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-calendarios-laborales-empresa-id_empresa-con-festivos"></a>GET `/api/calendarios-laborales/empresa/{id_empresa}/con-festivos`

**Obtener calendarios y festivos por empresa**

**GET /api/calendarios-laborales/empresa/{id_empresa}/con-festivos**

Recupera todos los calendarios de una empresa integrando sus respectivos días festivos.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-calendarios-laborales-calendario_id-importar-pdf"></a>POST `/api/calendarios-laborales/{calendario_id}/importar-pdf`

**Importar festivos de calendario desde PDF**

Extrae días festivos de un PDF y los incorpora al calendario laboral indicado.

Parámetros:

- `calendario_id` (path, string, obligatorio)

Cuerpo: `multipart/form-data`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-calendarios-laborales-id_calendario"></a>GET `/api/calendarios-laborales/{id_calendario}`

**Obtener calendario laboral por ID**

**GET /api/calendarios-laborales/{id_calendario}**

Busca un calendario laboral específico mediante su identificador único UUID incluyendo sus festivos.

Parámetros:

- `id_calendario` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-calendarios-laborales-id_calendario"></a>PUT `/api/calendarios-laborales/{id_calendario}`

**Actualizar calendario laboral**

**PUT /api/calendarios-laborales/{id_calendario}**

Actualiza el año, nombre y/o centro de trabajo de un calendario existente.

Parámetros:

- `id_calendario` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-calendarios-laborales-id_calendario-desactivar"></a>PUT `/api/calendarios-laborales/{id_calendario}/desactivar`

**Dar de baja lógica calendario laboral**

**PUT /api/calendarios-laborales/{id_calendario}/desactivar**

Da de baja un calendario validando previamente que no existan 
contratos de trabajo activos vinculados a él.

Parámetros:

- `id_calendario` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-centros-trabajo"></a>POST `/api/centros-trabajo`

**Crear centro de trabajo**

**POST /api/centros-trabajo**

Registra una nueva sede física vinculada a una empresa cliente (tenant) validando los datos con Pydantic.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-centros-trabajo-empresa-id_empresa"></a>GET `/api/centros-trabajo/empresa/{id_empresa}`

**Obtener centros de trabajo por empresa**

**GET /api/centros-trabajo/empresa/{id_empresa}**

Recupera de forma aislada las sedes físicas dadas de alta por una organización concreta (tenant).

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-centros-trabajo-id_centro"></a>GET `/api/centros-trabajo/{id_centro}`

**Obtener centro de trabajo por ID**

**GET /api/centros-trabajo/{id_centro}**

Busca la información de una sede mediante su identificador único UUID.

Parámetros:

- `id_centro` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-centros-trabajo-id_centro-desactivar"></a>PUT `/api/centros-trabajo/{id_centro}/desactivar`

**Dar de baja lógica centro de trabajo**

**PUT /api/centros-trabajo/{id_centro}/desactivar**

Da de baja un centro de trabajo previa validación de contratos activos.

Parámetros:

- `id_centro` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-centros-trabajo-id_centro-editar"></a>PUT `/api/centros-trabajo/{id_centro}/editar`

**Editar centro de trabajo**

**PUT /api/centros-trabajo/{id_centro}/editar**

Permite editar los datos del centro de trabajo y recalcula las coordenadas si es necesario.

Parámetros:

- `id_centro` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-centros-trabajo-id_centro-estado"></a>PUT `/api/centros-trabajo/{id_centro}/estado`

**Cambiar estado de centro de trabajo**

**PUT /api/centros-trabajo/{id_centro}/estado?activo=false**

Permite activar o desactivar (dar de baja lógica) una sede sin destruir los registros históricos.

Parámetros:

- `id_centro` (path, string, obligatorio)
- `activo` (query, boolean, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-contratos"></a>POST `/api/contratos`

**Crear contrato laboral**

**POST /api/contratos**

Registra un nuevo contrato laboral en el sistema validando la coherencia estructural de las entidades.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="delete-api-contratos-empresa-empresa_id-trabajador-trabajador_id"></a>DELETE `/api/contratos/empresa/{empresa_id}/trabajador/{trabajador_id}`

**Eliminar todos los contratos de un trabajador**

**DELETE /api/contratos/empresa/{empresa_id}/trabajador/{trabajador_id}**

Elimina TODOS los registros de contratos asociados a un trabajador dentro de una empresa específica.

Parámetros:

- `empresa_id` (path, string, obligatorio)
- `trabajador_id` (path, string, obligatorio)

Respuestas:

- `204`: Successful Response
- `422`: Validation Error

### <a id="get-api-contratos-empresa-id_empresa"></a>GET `/api/contratos/empresa/{id_empresa}`

**Obtener contratos por empresa**

**GET /api/contratos/empresa/{id_empresa}**

Filtra los contratos de forma aislada para el panel de administración de una empresa cliente (tenant).

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-contratos-trabajador-id_trabajador"></a>GET `/api/contratos/trabajador/{id_trabajador}`

**Obtener contratos por trabajador**

**GET /api/contratos/trabajador/{id_trabajador}**

Recupera la secuencia histórica de contratos asociados al expediente de un empleado.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-contratos-trabajador-id_trabajador-empresa-id_empresa-activo"></a>GET `/api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo`

**Obtener contrato activo de un trabajador**

**GET /api/contratos/trabajador/{id_trabajador}/empresa/{id_empresa}/activo**

Busca el contrato vigente real de un trabajador.

Parámetros:

- `id_trabajador` (path, string, obligatorio)
- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-contratos-id_contrato"></a>PUT `/api/contratos/{id_contrato}`

**Actualizar contrato**

**PUT /api/contratos/{id_contrato}**

Actualiza los datos de un contrato existente mediante un modelo de parcheo (Patch).

Parámetros:

- `id_contrato` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-contratos-id_contrato-dar-baja"></a>PUT `/api/contratos/{id_contrato}/dar-baja`

**Rescindir contrato**

**PUT /api/contratos/{id_contrato}/dar-baja**

Establece la fecha de cese (fecha_fin) y desactiva el contrato laboral.

Parámetros:

- `id_contrato` (path, string, obligatorio)
- `fecha_fin` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-correcciones"></a>POST `/api/correcciones`

**Solicitar corrección**

**POST /api/correcciones**

Crea una nueva solicitud de rectificación horaria en estado 'pendiente' por defecto.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-correcciones-empresa-id_empresa"></a>GET `/api/correcciones/empresa/{id_empresa}`

**Obtener correcciones por empresa**

**GET /api/correcciones/empresa/{id_empresa}**

Filtra las peticiones dentro de un mismo tenant (útil para el panel de RRHH de la empresa).

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-correcciones-trabajador-id_trabajador"></a>GET `/api/correcciones/trabajador/{id_trabajador}`

**Obtener correcciones por trabajador**

**GET /api/correcciones/trabajador/{id_trabajador}**

Permite al empleado seguir el estado de sus peticiones enviadas desde la app móvil.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-correcciones-id_correccion"></a>DELETE `/api/correcciones/{id_correccion}`

**Eliminar solicitud de corrección**

**DELETE /api/correcciones/{id_correccion}**

Elimina físicamente un registro de solicitud de corrección por su ID.
Retorna un estado 204 No Content si la operación es exitosa.

Parámetros:

- `id_correccion` (path, string, obligatorio)

Respuestas:

- `204`: Successful Response
- `422`: Validation Error

### <a id="put-api-correcciones-id_correccion-resolver"></a>PUT `/api/correcciones/{id_correccion}/resolver`

**Resolver incidencia de corrección**

**PUT /api/correcciones/{id_correccion}/resolver**

Permite aprobar o rechazar una solicitud de corrección pendiente, aplicando los cambios necesarios en los fichajes.

Parámetros:

- `id_correccion` (path, string, obligatorio)
- `nuevo_estado` (query, objeto, obligatorio)
- `resolutor_usuario_id` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-departamentos"></a>POST `/api/departamentos`

**Crear departamento**

**POST /api/departamentos**

Registra un nuevo departamento dentro de una empresa cliente.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-departamentos-empresa-id_empresa"></a>GET `/api/departamentos/empresa/{id_empresa}`

**Obtener departamentos por empresa**

**GET /api/departamentos/empresa/{id_empresa}**

Recupera los departamentos de una organización específica.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-departamentos-id_departamento"></a>GET `/api/departamentos/{id_departamento}`

**Obtener departamento por ID**

**GET /api/departamentos/{id_departamento}**

Busca la información de un departamento mediante su ID.

Parámetros:

- `id_departamento` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-departamentos-id_departamento"></a>PUT `/api/departamentos/{id_departamento}`

**Editar departamento**

**PUT /api/departamentos/{id_departamento}**

Actualiza los campos permitidos de un departamento.

Parámetros:

- `id_departamento` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-departamentos-id_departamento-desactivar"></a>PUT `/api/departamentos/{id_departamento}/desactivar`

**Dar de baja lógica departamento**

**PUT /api/departamentos/{id_departamento}/desactivar**

Da de baja un departamento previa validación de contratos activos.

Parámetros:

- `id_departamento` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-dispositivos"></a>POST `/api/dispositivos`

**Registrar dispositivo de fichaje**

**POST /api/dispositivos**

Registra y autoriza un nuevo terminal de fichaje dentro de una empresa y centro de trabajo.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="post-api-dispositivos-push"></a>POST `/api/dispositivos-push/`

**Registrar o actualizar dispositivo push**

**POST /api/dispositivos-push/**

Registra un nuevo token FCM o lo actualiza si el token o el usuario ya disponen de registro,
garantizando que se mantenga asociado el canal de notificaciones activo.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-dispositivos-push-usuario-usuario_id"></a>GET `/api/dispositivos-push/usuario/{usuario_id}`

**Obtener dispositivos push por usuario**

**GET /api/dispositivos-push/usuario/{usuario_id}**

Recupera todos los dispositivos push asociados a un usuario específico aplicando controles multi-tenant.

Parámetros:

- `usuario_id` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-dispositivos-push-id_dispositivo"></a>DELETE `/api/dispositivos-push/{id_dispositivo}`

**Eliminar dispositivo push**

**DELETE /api/dispositivos-push/{id_dispositivo}**

Elimina un token push del sistema (por ejemplo, al cerrar sesión en la app móvil).

Parámetros:

- `id_dispositivo` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-dispositivos-centro-id_centro"></a>GET `/api/dispositivos/centro/{id_centro}`

**Obtener dispositivos por centro de trabajo**

**GET /api/dispositivos/centro/{id_centro}**

Recupera de forma aislada el parque de terminales dado de alta por un centro de trabajo.

Parámetros:

- `id_centro` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-dispositivos-empresa-id_empresa"></a>GET `/api/dispositivos/empresa/{id_empresa}`

**Obtener dispositivos por empresa**

**GET /api/dispositivos/empresa/{id_empresa}**

Recupera de forma aislada el parque de terminales dado de alta por una empresa concreta (tenant).

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-dispositivos-id_dispositivo"></a>GET `/api/dispositivos/{id_dispositivo}`

**Obtener dispositivo por ID**

**GET /api/dispositivos/{id_dispositivo}**

Busca los detalles técnicos de un terminal específico utilizando su ID único UUID.

Parámetros:

- `id_dispositivo` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-dispositivos-id_dispositivo"></a>PUT `/api/dispositivos/{id_dispositivo}`

**Actualizar dispositivo**

**PUT /api/dispositivos/{id_dispositivo}**

Actualiza la información de un terminal de fichaje existente.

Parámetros:

- `id_dispositivo` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-dispositivos-id_dispositivo-desactivar"></a>PUT `/api/dispositivos/{id_dispositivo}/desactivar`

**Dar de baja lógica dispositivo**

**PUT /api/dispositivos/{id_dispositivo}/desactivar**

Realiza una baja lógica (desactivación) para proteger la integridad 
de los fichajes históricos asociados al terminal.

Parámetros:

- `id_dispositivo` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-dispositivos-id_dispositivo-estado"></a>PUT `/api/dispositivos/{id_dispositivo}/estado`

**Cambiar estado de dispositivo**

**PUT /api/dispositivos/{id_dispositivo}/estado**

Permite activar o desactivar (dar de baja lógica) un terminal de fichaje.

Parámetros:

- `id_dispositivo` (path, string, obligatorio)
- `activo` (query, boolean, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-empresas"></a>GET `/api/empresas`

**Obtener lista de empresas**

**GET /api/empresas**

Devuelve el catálogo de organizaciones aplicando aislamiento multi-tenant.

Respuestas:

- `200`: Successful Response

### <a id="post-api-empresas"></a>POST `/api/empresas`

**Crear empresa**

**POST /api/empresas**

Registra una nueva empresa en el sistema (restringido a administradores de gestoría).

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-empresas-cif-cif_empresa"></a>GET `/api/empresas/cif/{cif_empresa}`

**Obtener empresa por CIF**

**GET /api/empresas/cif/{cif_empresa}**

Busca y devuelve los datos de una empresa filtrando directamente por su código CIF.

Parámetros:

- `cif_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-empresas-registro-completo"></a>POST `/api/empresas/registro-completo`

**Registro atómico de organización, trabajador y usuario admin**

**POST /api/empresas/registro-completo**

Realiza una transacción atómica para dar de alta una nueva empresa, 
su primer trabajador (administrador) y la cuenta de usuario vinculada. 
Si algo falla, se revierte toda la operación (Rollback).

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-empresas-id_empresa"></a>GET `/api/empresas/{id_empresa}`

**Obtener empresa por ID**

**GET /api/empresas/{id_empresa}**

Obtiene los detalles completos de una empresa a partir de su ID único universal.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-empresas-id_empresa"></a>PUT `/api/empresas/{id_empresa}`

**Actualizar datos de empresa**

**PUT /api/empresas/{id_empresa}**

Actualiza los datos generales de una empresa en el sistema.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-empresas-id_empresa-logo"></a>PUT `/api/empresas/{id_empresa}/logo`

**Actualizar logo de empresa**

**PUT /api/empresas/{id_empresa}/logo**

Sube y actualiza el logotipo oficial de una empresa.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Cuerpo: `multipart/form-data`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-empresas-id_empresa-razon-social"></a>PUT `/api/empresas/{id_empresa}/razon-social`

**Cambiar razón social de empresa**

**PUT /api/empresas/{id_empresa}/razon-social**

Modifica la razón social de una empresa existente.

Parámetros:

- `id_empresa` (path, string, obligatorio)
- `nueva_razon_social` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-empresas-id_empresa-trabajadores"></a>GET `/api/empresas/{id_empresa}/trabajadores`

**Obtener trabajadores de empresa**

**GET /api/empresas/{id_empresa}/trabajadores**

Devuelve la lista de trabajadores vinculados a una empresa específica.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-festivos"></a>POST `/api/festivos`

**Crear día festivo**

Registra un día festivo dentro de un calendario laboral.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-festivos-calendario-id_calendario"></a>GET `/api/festivos/calendario/{id_calendario}`

**Obtener festivos de calendario**

Devuelve los días festivos activos asociados a un calendario laboral.

Parámetros:

- `id_calendario` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-festivos-id_festivo-desactivar"></a>PUT `/api/festivos/{id_festivo}/desactivar`

**Dar de baja lógica día festivo**

Desactiva un día festivo sin eliminarlo físicamente.

Parámetros:

- `id_festivo` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-festivos-id_festivo-editar"></a>PUT `/api/festivos/{id_festivo}/editar`

**Editar día festivo**

Actualiza la fecha, ámbito o descripción de un día festivo.

Parámetros:

- `id_festivo` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-fichajes"></a>POST `/api/fichajes`

**Registrar fichaje**

**POST /api/fichajes**
 
Registra un nuevo fichaje para un trabajador, validando su ubicación GPS, festivos,
integridad de los datos mediante hash SHA-256 y opcionalmente procesando una firma digital.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-empresa-empresa_id"></a>GET `/api/fichajes/empresa/{empresa_id}`

**Listar fichajes de empresa por fecha**

**GET /api/fichajes/empresa/{empresa_id}**
 
Lista detallada de todos los fichajes de una empresa para una fecha específica,
adaptada y formateada para el consumo directo del frontend. Protegida por roles administrativos.

Parámetros:

- `empresa_id` (path, string, obligatorio)
- `fecha` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-trabajador-id_trabajador-empresa-id_empresa"></a>GET `/api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}`

**Obtener fichajes de trabajador por empresa**

**GET /api/fichajes/trabajador/{id_trabajador}/empresa/{id_empresa}**
 
Devuelve la lista completa de fichajes asociados a un trabajador específico dentro de una empresa.

Parámetros:

- `id_trabajador` (path, string, obligatorio)
- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-trabajador-id_trabajador-hoy"></a>GET `/api/fichajes/trabajador/{id_trabajador}/hoy`

**Obtener fichajes de hoy**

**GET /api/fichajes/trabajador/{id_trabajador}/hoy**
 
Retorna la lista de fichajes realizados por el trabajador en el día actual (fecha de hoy).

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-trabajador-id_trabajador-semana"></a>GET `/api/fichajes/trabajador/{id_trabajador}/semana`

**Obtener fichajes de la semana actual**

**GET /api/fichajes/trabajador/{id_trabajador}/semana**
 
Obtiene todos los fichajes registrados de un trabajador durante la semana en curso (de lunes a domingo).

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-trabajador-id_trabajador-turno"></a>GET `/api/fichajes/trabajador/{id_trabajador}/turno`

**Obtener fichajes del turno actual**

Sin descripción adicional.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-trabajador-trabajador_id-ultimo"></a>GET `/api/fichajes/trabajador/{trabajador_id}/ultimo`

**Obtener último fichaje del trabajador**

**GET /api/fichajes/trabajador/{trabajador_id}/ultimo**
 
Devuelve estrictamente el último evento de fichaje registrado por el trabajador (ordenado de forma descendente).

Parámetros:

- `trabajador_id` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-fichajes-id_fichaje"></a>DELETE `/api/fichajes/{id_fichaje}`

**Eliminar fichaje**

**DELETE /api/fichajes/{id_fichaje}**
 
Elimina un registro de fichaje existente. Requiere privilegios administrativos
de gestoría o empresa.

Parámetros:

- `id_fichaje` (path, string, obligatorio)

Respuestas:

- `204`: Successful Response
- `422`: Validation Error

### <a id="get-api-fichajes-id_fichaje"></a>GET `/api/fichajes/{id_fichaje}`

**Obtener fichaje por ID**

**GET /api/fichajes/{id_fichaje}**
 
Obtiene los detalles completos de un fichaje a partir de su ID único universal.

Parámetros:

- `id_fichaje` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="patch-api-fichajes-id_fichaje-validar"></a>PATCH `/api/fichajes/{id_fichaje}/validar`

**Validar fichaje**

**PATCH /api/fichajes/{id_fichaje}/validar**
 
Cambia el estado de un fichaje a Válido y recalcula su hash de seguridad.
Exclusivo para administradores de empresa o gestoría.

Parámetros:

- `id_fichaje` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-motivos-pausa"></a>POST `/api/motivos-pausa`

**Crear motivo de pausa**

**POST /api/motivos-pausa**

Registra una nueva tipología de descanso, ya sea global o específica de un tenant.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-motivos-pausa-empresa-id_empresa"></a>GET `/api/motivos-pausa/empresa/{id_empresa}`

**Obtener motivos de pausa disponibles por empresa**

**GET /api/motivos-pausa/empresa/{id_empresa}**

Recupera los motivos de descanso utilizables por una empresa: los comunes globales (NULL) 
y los personalizados propios de esta organización.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-motivos-pausa-id_motivo"></a>GET `/api/motivos-pausa/{id_motivo}`

**Obtener motivo de pausa por ID**

**GET /api/motivos-pausa/{id_motivo}**

Busca un motivo de pausa específico mediante su identificador numérico (SmallInteger).

Parámetros:

- `id_motivo` (path, integer, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-permisos"></a>GET `/api/permisos`

**Obtener todos los permisos**

**GET /api/permisos**

Obtiene la lista completa de permisos del sistema disponibles.

Respuestas:

- `200`: Successful Response

### <a id="post-api-permisos"></a>POST `/api/permisos`

**Crear permiso de seguridad**

**POST /api/permisos**

Registra un nuevo permiso de seguridad en el sistema validando privilegios administrativos.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="post-api-politicas-retencion"></a>POST `/api/politicas-retencion`

**Crear política de retención**

**POST /api/politicas-retencion**

Establece una nueva directiva de retención validando permisos de administrador y tenant.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-politicas-retencion-empresa-id_empresa"></a>GET `/api/politicas-retencion/empresa/{id_empresa}`

**Obtener política aplicable a empresa**

**GET /api/politicas-retencion/empresa/{id_empresa}**

Busca la directiva de una empresa validando que el usuario tenga acceso a dicho tenant.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-politicas-retencion-global"></a>GET `/api/politicas-retencion/global`

**Obtener política global por defecto**

**GET /api/politicas-retencion/global**

Recupera la directiva general del sistema bajo autenticación activa.

Respuestas:

- `200`: Successful Response

### <a id="put-api-politicas-retencion-id_politica"></a>PUT `/api/politicas-retencion/{id_politica}`

**Actualizar años de retención**

**PUT /api/politicas-retencion/{id_politica}?nuevos_anios=5**

Modifica la cantidad de años vigilando el cumplimiento legal y la autorización del tenant.

Parámetros:

- `id_politica` (path, string, obligatorio)
- `nuevos_anios` (query, integer, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-resumenes-jornada"></a>POST `/api/resumenes-jornada`

**Crear o actualizar resumen de jornada**

**POST /api/resumenes-jornada**

Registra o actualiza el cálculo acumulado diario de un operario validando permisos de tenant.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-resumenes-jornada-empresa-id_empresa-fecha-fecha_dia"></a>GET `/api/resumenes-jornada/empresa/{id_empresa}/fecha/{fecha_dia}`

**Obtener cuadro de mandos diario de empresa**

**GET /api/resumenes-jornada/empresa/{id_empresa}/fecha/AAAA-MM-DD**

Filtra los acumulados de la plantilla diaria validando el acceso a la empresa.

Parámetros:

- `id_empresa` (path, string, obligatorio)
- `fecha_dia` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-resumenes-jornada-trabajador-id_trabajador"></a>GET `/api/resumenes-jornada/trabajador/{id_trabajador}`

**Obtener resúmenes por trabajador**

**GET /api/resumenes-jornada/trabajador/{id_trabajador}**

Recupera el calendario o histórico validando que pertenezca a la empresa del usuario o a su propio perfil.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-resumenes-jornada-id_resumen-cerrar"></a>PUT `/api/resumenes-jornada/{id_resumen}/cerrar`

**Consolidar y cerrar jornada**

**PUT /api/resumenes-jornada/{id_resumen}/cerrar**

Consolida de manera definitiva una fila diaria validando permisos de empresa o administración.

Parámetros:

- `id_resumen` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-roles"></a>GET `/api/roles`

**Obtener todos los roles**

**GET /api/roles**

Obtiene la lista completa de roles del sistema disponibles.

Respuestas:

- `200`: Successful Response

### <a id="post-api-roles"></a>POST `/api/roles`

**Crear rol de seguridad**

**POST /api/roles**

Registra un nuevo rol de seguridad en el sistema validando privilegios administrativos.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-roles-id_rol"></a>GET `/api/roles/{id_rol}`

**Obtener rol por ID**

**GET /api/roles/{id_rol}**

Obtiene un rol específico del sistema por su identificador único.

Parámetros:

- `id_rol` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-tipos-evento-fichaje"></a>POST `/api/tipos-evento-fichaje`

**Crear tipo de evento de fichaje**

**POST /api/tipos-evento-fichaje**

Registra una nueva categoría de marcaje horario en el catálogo validando privilegios administrativos.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-tipos-evento-fichaje-codigo-codigo_clave"></a>GET `/api/tipos-evento-fichaje/codigo/{codigo_clave}`

**Obtener tipo de evento por código**

**GET /api/tipos-evento-fichaje/codigo/{codigo_clave}**

Obtiene una categoría de marcaje horario del catálogo por su código textual normalizado.

Parámetros:

- `codigo_clave` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-tipos-evento-fichaje-empresa-empresa_id"></a>GET `/api/tipos-evento-fichaje/empresa/{empresa_id}`

**Obtener tipos de evento por empresa**

**GET /api/tipos-evento-fichaje/empresa/{empresa_id}**

Obtiene las categorías de marcaje horario configuradas para una empresa específica validando permisos.

Parámetros:

- `empresa_id` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-tipos-evento-fichaje-id_tipo_evento"></a>GET `/api/tipos-evento-fichaje/{id_tipo_evento}`

**Obtener tipo de evento por ID**

**GET /api/tipos-evento-fichaje/{id_tipo_evento}**

Obtiene una categoría de marcaje horario del catálogo por su identificador único.

Parámetros:

- `id_tipo_evento` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-tipos-evento-fichaje-id_tipo_evento"></a>PUT `/api/tipos-evento-fichaje/{id_tipo_evento}`

**Actualizar tipo de evento de fichaje**

**PUT /api/tipos-evento-fichaje/{id_tipo_evento}**

Actualiza una categoría de marcaje horario existente en el catálogo.

Parámetros:

- `id_tipo_evento` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-tipos-evento-fichaje-id_tipo_evento-desactivar"></a>PUT `/api/tipos-evento-fichaje/{id_tipo_evento}/desactivar`

**Dar de baja lógica tipo de evento de fichaje**

**PUT /api/tipos-evento-fichaje/{id_tipo_evento}/desactivar**

Da de baja una categoría de marcaje horario del catálogo validando restricciones de integridad referencial.

Parámetros:

- `id_tipo_evento` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-trabajadores"></a>POST `/api/trabajadores`

**Registrar trabajador**

**POST /api/trabajadores**

Registra un nuevo empleado guardando su rol opcional y validando aislamientos.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-trabajadores-empresa-id_empresa"></a>GET `/api/trabajadores/empresa/{id_empresa}`

**Obtener trabajadores por empresa**

**GET /api/trabajadores/empresa/{id_empresa}**

Recupera la lista de trabajadores de una empresa específica validando permisos de tenant.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-trabajadores-login"></a>POST `/api/trabajadores/login`

**Login de trabajador**

**POST /api/trabajadores/login**

Valida las credenciales utilizando verificación segura de hash contra la tabla central de usuarios.

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-trabajadores-turnos-id_trabajador"></a>POST `/api/trabajadores/turnos/{id_trabajador}`

**Asignar turnos a trabajador**

**POST /api/trabajadores/turnos/{id_trabajador}**

Asigna turnos masivamente a un trabajador validando el ámbito de la empresa.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-trabajadores-id_trabajador"></a>DELETE `/api/trabajadores/{id_trabajador}`

**Eliminar trabajador**

**DELETE /api/trabajadores/{id_trabajador}**

Elimina un trabajador validando privilegios de administración o empresa.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-trabajadores-id_trabajador"></a>GET `/api/trabajadores/{id_trabajador}`

**Obtener trabajador por ID**

**GET /api/trabajadores/{id_trabajador}**

Busca los detalles de un empleado validando el acceso a su tenant.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="patch-api-trabajadores-id_trabajador"></a>PATCH `/api/trabajadores/{id_trabajador}`

**Actualizar trabajador**

**PATCH /api/trabajadores/{id_trabajador}**

Actualiza datos de un trabajador (incluyendo su rol) validando pertenencia a la empresa.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-trabajadores-id_trabajador-baja-total"></a>POST `/api/trabajadores/{id_trabajador}/baja-total`

**Baja total y coordinada de un trabajador**

**POST /api/trabajadores/{id_trabajador}/baja-total**

Realiza una transacción atómica para tramitar la baja completa de un trabajador:
- Marca al trabajador como inactivo y registra su fecha de baja.
- Rescinde o finaliza sus contratos activos.
- Inactiva o desvincula su cuenta de usuario de sesión para liberar su correo.
- Limpia asignaciones asociadas (turnos, roles, etc.).

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-trabajadores-id_trabajador-empresa"></a>GET `/api/trabajadores/{id_trabajador}/empresa`

**Obtener empresa del trabajador**

**GET /api/trabajadores/{id_trabajador}/empresa**

Recupera la empresa vinculada al expediente validando permisos.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-trabajadores-id_trabajador-foto"></a>PUT `/api/trabajadores/{id_trabajador}/foto`

**Actualizar foto de trabajador**

**PUT /api/trabajadores/{id_trabajador}/foto**

Sube y actualiza la fotografía de perfil de un trabajador.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Cuerpo: `multipart/form-data`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-turnos"></a>POST `/api/turnos`

**Crear turno laboral**

**POST /api/turnos**

Registra un nuevo cuadrante de turno teórico validando empresa y permisos.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-turnos-empresa-id_empresa"></a>GET `/api/turnos/empresa/{id_empresa}`

**Obtener turnos por empresa**

**GET /api/turnos/empresa/{id_empresa}**

Recupera los cuadrantes horarios de una empresa específica aplicando aislamiento multi-tenant.

Parámetros:

- `id_empresa` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-turnos-id_turno"></a>GET `/api/turnos/{id_turno}`

**Obtener turno por ID**

**GET /api/turnos/{id_turno}**

Busca un turno específico validando que pertenezca al ámbito del usuario.

Parámetros:

- `id_turno` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-turnos-id_turno-desactivar"></a>PUT `/api/turnos/{id_turno}/desactivar`

**Dar de baja lógica turno laboral**

**PUT /api/turnos/{id_turno}/desactivar**

Da de baja un turno validando previamente que no existan contratos o asignaciones activas asociadas.

Parámetros:

- `id_turno` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-turnos-id_turno-editar"></a>PUT `/api/turnos/{id_turno}/editar`

**Editar turno laboral**

**PUT /api/turnos/{id_turno}/editar**

Modifica un turno validando la pertenencia a la empresa o rol de administrador.

Parámetros:

- `id_turno` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-usuarios-roles"></a>POST `/api/usuarios-roles`

**Asignar rol a un usuario**

**POST /api/usuarios-roles**

Asigna un nuevo rol de seguridad a un usuario dentro de un ámbito empresarial específico.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-usuarios-roles-usuario-id_usuario"></a>GET `/api/usuarios-roles/usuario/{id_usuario}`

**Obtener roles de un usuario**

**GET /api/usuarios-roles/usuario/{id_usuario}**

Permite consultar los roles asignados a un usuario. Los administradores y personal de RRHH 
pueden consultar cualquier usuario; los usuarios estándar solo pueden consultar sus propios roles.

Parámetros:

- `id_usuario` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="delete-api-usuarios-roles-id_asignacion"></a>DELETE `/api/usuarios-roles/{id_asignacion}`

**Revocar rol a un usuario**

**DELETE /api/usuarios-roles/{id_asignacion}**

Elimina por completo una asignación de rol, revocando los permisos asociados al usuario.

Parámetros:

- `id_asignacion` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-usuarios-roles-id_asignacion"></a>PUT `/api/usuarios-roles/{id_asignacion}`

**Actualizar asignación de rol**

**PUT /api/usuarios-roles/{id_asignacion}**

Modifica una asignación de rol existente para actualizar el usuario, el rol o la empresa vinculada.

Parámetros:

- `id_asignacion` (path, string, obligatorio)

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-usuarios-login"></a>POST `/api/usuarios/login`

**Inicio de sesión en la plataforma**

**POST /api/usuarios/login**

Autentica a un usuario validando su correo electrónico y contraseña, 
actualiza su último acceso y genera un token JWT de sesión.

Cuerpo: `application/json`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-usuarios-login-form"></a>POST `/api/usuarios/login-form`

**Inicio de sesión compatible con Swagger UI**

**POST /api/usuarios/login-form**

Endpoint auxiliar optimizado para autenticación OAuth2 estándar (Swagger UI).

Cuerpo: `application/x-www-form-urlencoded`

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="post-api-usuarios-registro"></a>POST `/api/usuarios/registro`

**Registro inicial de usuario**

**POST /api/usuarios/registro**

Busca al trabajador existente mediante la empresa y el NIF, 
y crea credenciales de usuario vinculadas con contraseña hasheada.

Cuerpo: `application/json`

Respuestas:

- `201`: Successful Response
- `422`: Validation Error

### <a id="get-api-usuarios-trabajador-id_trabajador"></a>GET `/api/usuarios/trabajador/{id_trabajador}`

**Obtener usuario por ID de trabajador**

**GET /api/usuarios/trabajador/{id_trabajador}**

Devuelve la cuenta de usuario asociada a un expediente de trabajador bajo autenticación.

Parámetros:

- `id_trabajador` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="get-api-usuarios-id_usuario"></a>GET `/api/usuarios/{id_usuario}`

**Obtener usuario por ID**

**GET /api/usuarios/{id_usuario}**

Busca los detalles de una cuenta mediante su identificador único UUID de forma protegida.

Parámetros:

- `id_usuario` (path, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-usuarios-id_usuario-estado"></a>PUT `/api/usuarios/{id_usuario}/estado`

**Modificar estado de cuenta de usuario**

**PUT /api/usuarios/{id_usuario}/estado?activo=false**

Permite activar o desactivar una cuenta bloqueando su capacidad de login.

Parámetros:

- `id_usuario` (path, string, obligatorio)
- `activo` (query, boolean, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error

### <a id="put-api-usuarios-id_usuario-password"></a>PUT `/api/usuarios/{id_usuario}/password`

**Actualizar contraseña de usuario**

**PUT /api/usuarios/{id_usuario}/password**

Permite cambiar la contraseña validando que el usuario disponga del rol de administración requerido.

Parámetros:

- `id_usuario` (path, string, obligatorio)
- `antigua_password` (query, string, obligatorio)
- `nueva_password` (query, string, obligatorio)

Respuestas:

- `200`: Successful Response
- `422`: Validation Error
