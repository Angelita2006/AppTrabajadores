# Pendientes para declarar listo el backend de Fichapp v2

Este documento es una lista de trabajo y comprobaciones, no una certificación de seguridad ni de cumplimiento legal. Se irá marcando o retirando cada punto cuando exista evidencia suficiente. La guía de despliegue se conserva aquí para que los pasos no se pierdan cuando se acerque el pase a producción.

## Estado conocido

- **Repositorio:** la configuración valida los valores requeridos en producción, rechaza claves desconocidas del `.env`, ignora los `.env` con Git y permite configurar `UPLOAD_DIR`. Los archivos subidos se guardan fuera de una ruta pública y se descargan mediante endpoints protegidos.
- **Dominio:** la responsable indica que el dominio de la aplicación ya tiene certificado y redirección HTTPS efectivos. La captura compartida muestra el panel Plesk abierto por IP y con aviso de seguridad; eso es independiente del certificado del dominio público. No reutilizar la dirección IP del panel como prueba del TLS de la aplicación.
- **Copias:** la responsable indica que Plesk tiene copias programadas. La captura muestra copias completadas; falta comprobar el alcance (base de datos y archivos subidos) y ensayar una restauración antes de considerar validada la recuperación.
- **No se implementará purga automática de registros en v2.** Por ello, no queda una tarea de desarrollo de borrado automático en esta lista. La política de conservación y acceso de cada cliente sigue requiriendo revisión laboral y de privacidad.

### 1. Configuración local y configuración de producción

- Mantener `ENVIRONMENT=development` en el entorno local y `ENVIRONMENT=production` en Plesk.
- Mantener secretos diferentes por entorno. `DATABASE_URL` de la API debe usar el rol de ejecución restringido, no el dueño de las tablas ni una cuenta administradora.
- Configurar `URL`, `ALLOWED_ORIGINS` y SMTP con los valores reales de cada entorno. En producción, `URL` y todos los orígenes permitidos deben usar HTTPS.
- Configurar `UPLOAD_DIR` como ruta absoluta, escribible por el proceso de la API y fuera del document root. En local se puede conservar `C:\static`; en Plesk, usar la ruta privada real de la suscripción, fuera de `httpdocs`. Antes de cambiar una ruta que ya contiene archivos, copiar los archivos preservando su estructura relativa y comprobar que la API puede leerlos.
- El `.env` está fuera de `httpdocs`, según la responsable. Mantenerlo fuera del directorio público también en futuras instalaciones; alternativamente, inyectar variables desde Plesk. No subir valores secretos a Git, tickets ni conversaciones.

### 2. Separación de roles PostgreSQL: pendiente antes de producción

La API debe conectarse como un rol de ejecución sin propiedad de tablas, sin superusuario, sin `BYPASSRLS` y con solo los permisos DML que necesite. Alembic necesita una identidad distinta con permisos de migración. El dueño de tablas y políticas debe ser una identidad controlada, no la API.

Esto se debe preparar **tanto en la base local como en producción**. En local permite desarrollar y detectar errores de permisos con el mismo modelo que producción; en producción reduce el impacto de una vulnerabilidad en la API. Cada entorno tiene sus propios roles y contraseñas.

**No ejecutar todavía el SQL de una versión anterior de esta guía:** `ALTER ROLE ... SET role = ...` no es una forma válida de establecer el rol PostgreSQL. Además, el `backend/alembic/env.py` actual toma `settings.DATABASE_URL` y no establece por sí mismo una URL separada ni ejecuta `SET ROLE`. Antes de crear los roles definitivos hay que adaptar y revisar cómo Alembic obtiene la URL de migración y cómo asume el rol propietario durante una migración. Después se documentará el SQL exacto para la versión de PostgreSQL y el proveedor usados.

Secuencia objetivo, una vez adaptado el backend:

1. Crear los roles de dueño, migración y ejecución en la base local.
2. Ejecutar Alembic con la identidad de migración y verificar que los objetos quedan bajo el dueño previsto.
3. Arrancar la API local con el rol restringido y confirmar que la aplicación funciona sin privilegios de propietario.
4. Repetir el esquema en una base de staging de Plesk, con credenciales diferentes.
5. Solo tras verificar migraciones, arranque y permisos, preparar los roles equivalentes en producción.

No usar una cuenta superusuario para el proceso normal de API, ni para demostrar que las comprobaciones de permisos/RLS funcionan.

### 3. Aplicar y verificar RLS en cada base

Las políticas RLS están definidas en migraciones, pero su existencia en el código no prueba que estén aplicadas correctamente ni que el rol de API esté sujeto a ellas. RLS se debe aplicar y verificar **por separado en la base local, staging y producción**: las migraciones de una base no modifican las demás.

1. Revisar la migración RLS y la lista de tablas tenant contra los modelos y rutas vigentes; comprobar también las tablas indirectas y catálogos globales.
2. Aplicar migraciones en una base de desarrollo con datos de prueba y conectarse como el rol restringido de API.
3. Comprobar que sin contexto de empresa no se filtran filas tenant; que una empresa no ve filas de otra; que las relaciones indirectas mantienen el aislamiento; y que los permisos globales solo se aplican al superadministrador autorizado.
4. Repetir las pruebas con dos empresas y una gestoría autorizada en un staging aislado antes de tocar producción.
5. Verificar en PostgreSQL `relrowsecurity`, `relforcerowsecurity`, políticas activas y que el usuario API no es dueño ni tiene `BYPASSRLS`. Las consultas administrativas de diagnóstico deben ejecutarse con una cuenta de lectura/administración, no con la identidad API.

RLS no reemplaza las comprobaciones de permisos de la aplicación: la cabecera `Empresa-ID` es solo un selector y nunca concede acceso por sí misma.

### 4. TLS, proxy y URL pública

La responsable confirma que el dominio ya tiene certificado SSL y redirección HTTP a HTTPS. Antes del despliegue de backend, comprobar el dominio exacto de frontend y API, la renovación del certificado, que no hay contenido o llamadas HTTP, y que el proxy no expone Uvicorn directamente a Internet. El aviso del panel Plesk abierto por una dirección IP no debe confundirse con el certificado servido por `registrohorariosimple.es`.

### 5. Copias y restauración

Plesk muestra copias programadas completadas. Antes de declarar recuperable el servicio, confirmar que incluyen **base de datos y archivos subidos** (firmas, justificantes, fotos, contratos y logos), conocer su destino y retención y comprobar quién puede restaurarlas. Restaurar una copia reciente en una base y carpeta aisladas; verificar login, relaciones, consultas y descarga autorizada de archivos. Registrar fecha, alcance y resultado. No probar restauraciones sobre producción.

No es necesario volver a configurar una programación que ya está activa si cumple esos requisitos; la restauración de prueba sigue pendiente hasta que se ejecute y quede registrada.

### 6. Pruebas de aislamiento y flujos críticos en staging

Con cuentas de prueba de dos empresas y una gestoría:

1. Consultar y modificar datos con la empresa A seleccionada; verificar que solo se accede a A.
2. Cambiar `Empresa-ID` a B sin pertenecer a B; debe denegarse el acceso y no devolverse información de B.
3. Verificar el acceso de la gestoría solo a las empresas y operaciones autorizadas.
4. Intentar modificar o borrar un fichaje; debe mantenerse la inmutabilidad y usarse el flujo de corrección previsto.
5. Probar autenticación, recuperación de cuenta, permisos, auditoría, archivos, límites de solicitudes y restauración.

## Secuencia de puesta en producción

1. Cerrar los pendientes de roles PostgreSQL y configuración de Alembic.
2. Aplicar y verificar migraciones y RLS en desarrollo; después repetir en staging aislado.
3. Configurar en staging las variables, permisos de archivos y roles equivalentes a producción, con secretos propios.
4. Restaurar una copia en un entorno aislado y ejecutar las comprobaciones de esta guía.
5. Preparar la base de producción, sus roles, variables y `UPLOAD_DIR` privado; conservar una copia recuperable antes de migrar.
6. Aplicar migraciones con la identidad de migración; iniciar la API con la identidad restringida.
7. Verificar salud, HTTPS, aislamiento, logs sin secretos y funcionamiento del frontend.
8. Desplegar con observación de errores y latencia, y tener un procedimiento de rollback probado. No rebajar el esquema a ciegas si v2 ya ha escrito datos.

La puesta en producción queda pendiente mientras no se hayan verificado los roles de base de datos, RLS con el usuario real de API, la restauración de una copia y las pruebas de staging. La revisión jurídica y de privacidad específica de Fichapp también debe cerrarse con asesoramiento competente.

# Pendientes para declarar listo el backend de Fichapp v2

Este documento es una lista de trabajo y comprobaciones, no una certificación de seguridad ni de cumplimiento legal. Se irá marcando o retirando cada punto cuando exista evidencia suficiente. La guía de despliegue se conserva aquí para que los pasos no se pierdan cuando se acerque el pase a producción.

## Estado conocido

- **Repositorio:** la configuración valida los valores requeridos en producción, rechaza claves desconocidas del `.env`, ignora los `.env` con Git y permite configurar `UPLOAD_DIR`. Los archivos subidos se guardan fuera de una ruta pública y se descargan mediante endpoints protegidos.
- **Dominio:** la responsable indica que el dominio de la aplicación ya tiene certificado y redirección HTTPS efectivos. La captura compartida muestra el panel Plesk abierto por IP y con aviso de seguridad; eso es independiente del certificado del dominio público. No reutilizar la dirección IP del panel como prueba del TLS de la aplicación.
- **Copias:** la responsable indica que Plesk tiene copias programadas. La captura muestra copias completadas; falta comprobar el alcance (base de datos y archivos subidos) y ensayar una restauración antes de considerar validada la recuperación.
- **No se implementará purga automática de registros en v2.** Por ello, no queda una tarea de desarrollo de borrado automático en esta lista. La política de conservación y acceso de cada cliente sigue requiriendo revisión laboral y de privacidad.

## Pendientes técnicos y operativos

### 1. Configuración local y configuración de producción

- Mantener `ENVIRONMENT=development` en el entorno local y `ENVIRONMENT=production` en Plesk. El nombre correcto es `ENVIRONMENT`, no `ENVIROMENT`.
- Mantener secretos diferentes por entorno. `DATABASE_URL` de la API debe usar el rol de ejecución restringido, no el dueño de las tablas ni una cuenta administradora.
- Configurar `URL`, `ALLOWED_ORIGINS` y SMTP con los valores reales de cada entorno. En producción, `URL` y todos los orígenes permitidos deben usar HTTPS.
- Configurar `UPLOAD_DIR` como ruta absoluta, escribible por el proceso de la API y fuera del document root. En local se puede conservar `C:\static`; en Plesk, usar la ruta privada real de la suscripción, fuera de `httpdocs`. Antes de cambiar una ruta que ya contiene archivos, copiar los archivos preservando su estructura relativa y comprobar que la API puede leerlos.
- El `.env` está fuera de `httpdocs`, según la responsable. Mantenerlo fuera del directorio público también en futuras instalaciones; alternativamente, inyectar variables desde Plesk. No subir valores secretos a Git, tickets ni conversaciones.

### 2. Separación de roles PostgreSQL: pendiente antes de producción

La API debe conectarse como un rol de ejecución sin propiedad de tablas, sin superusuario, sin `BYPASSRLS` y con solo los permisos DML que necesite. Alembic necesita una identidad distinta con permisos de migración. El dueño de tablas y políticas debe ser una identidad controlada, no la API.

Esto se debe preparar **tanto en la base local como en producción**. En local permite desarrollar y detectar errores de permisos con el mismo modelo que producción; en producción reduce el impacto de una vulnerabilidad en la API. Cada entorno tiene sus propios roles y contraseñas.

**No ejecutar todavía el SQL de una versión anterior de esta guía:** `ALTER ROLE ... SET role = ...` no es una forma válida de establecer el rol PostgreSQL. Además, el `backend/alembic/env.py` actual toma `settings.DATABASE_URL` y no establece por sí mismo una URL separada ni ejecuta `SET ROLE`. Antes de crear los roles definitivos hay que adaptar y revisar cómo Alembic obtiene la URL de migración y cómo asume el rol propietario durante una migración. Después se documentará el SQL exacto para la versión de PostgreSQL y el proveedor usados.

Secuencia objetivo, una vez adaptado el backend:

1. Crear los roles de dueño, migración y ejecución en la base local.
2. Ejecutar Alembic con la identidad de migración y verificar que los objetos quedan bajo el dueño previsto.
3. Arrancar la API local con el rol restringido y confirmar que la aplicación funciona sin privilegios de propietario.
4. Repetir el esquema en una base de staging de Plesk, con credenciales diferentes.
5. Solo tras verificar migraciones, arranque y permisos, preparar los roles equivalentes en producción.

No usar una cuenta superusuario para el proceso normal de API, ni para demostrar que las comprobaciones de permisos/RLS funcionan.

### 3. Aplicar y verificar RLS en cada base

Las políticas RLS están definidas en migraciones, pero su existencia en el código no prueba que estén aplicadas correctamente ni que el rol de API esté sujeto a ellas. RLS se debe aplicar y verificar **por separado en la base local, staging y producción**: las migraciones de una base no modifican las demás.

1. Revisar la migración RLS y la lista de tablas tenant contra los modelos y rutas vigentes; comprobar también las tablas indirectas y catálogos globales.
2. Aplicar migraciones en una base de desarrollo con datos de prueba y conectarse como el rol restringido de API.
3. Comprobar que sin contexto de empresa no se filtran filas tenant; que una empresa no ve filas de otra; que las relaciones indirectas mantienen el aislamiento; y que los permisos globales solo se aplican al superadministrador autorizado.
4. Repetir las pruebas con dos empresas y una gestoría autorizada en un staging aislado antes de tocar producción.
5. Verificar en PostgreSQL `relrowsecurity`, `relforcerowsecurity`, políticas activas y que el usuario API no es dueño ni tiene `BYPASSRLS`. Las consultas administrativas de diagnóstico deben ejecutarse con una cuenta de lectura/administración, no con la identidad API.

RLS no reemplaza las comprobaciones de permisos de la aplicación: la cabecera `Empresa-ID` es solo un selector y nunca concede acceso por sí misma.

### 4. TLS, proxy y URL pública

La responsable confirma que el dominio ya tiene certificado SSL y redirección HTTP a HTTPS. Antes del despliegue de backend, comprobar el dominio exacto de frontend y API, la renovación del certificado, que no hay contenido o llamadas HTTP, y que el proxy no expone Uvicorn directamente a Internet. El aviso del panel Plesk abierto por una dirección IP no debe confundirse con el certificado servido por `registrohorariosimple.es`.

### 5. Copias y restauración

Plesk muestra copias programadas completadas. Antes de declarar recuperable el servicio, confirmar que incluyen **base de datos y archivos subidos** (firmas, justificantes, fotos, contratos y logos), conocer su destino y retención y comprobar quién puede restaurarlas. Restaurar una copia reciente en una base y carpeta aisladas; verificar login, relaciones, consultas y descarga autorizada de archivos. Registrar fecha, alcance y resultado. No probar restauraciones sobre producción.

No es necesario volver a configurar una programación que ya está activa si cumple esos requisitos; la restauración de prueba sigue pendiente hasta que se ejecute y quede registrada.

### 6. Pruebas de aislamiento y flujos críticos en staging

Con cuentas de prueba de dos empresas y una gestoría:

1. Consultar y modificar datos con la empresa A seleccionada; verificar que solo se accede a A.
2. Cambiar `Empresa-ID` a B sin pertenecer a B; debe denegarse el acceso y no devolverse información de B.
3. Verificar el acceso de la gestoría solo a las empresas y operaciones autorizadas.
4. Intentar modificar o borrar un fichaje; debe mantenerse la inmutabilidad y usarse el flujo de corrección previsto.
5. Probar autenticación, recuperación de cuenta, permisos, auditoría, archivos, límites de solicitudes y restauración.

## Secuencia de puesta en producción

1. Cerrar los pendientes de roles PostgreSQL y configuración de Alembic.
2. Aplicar y verificar migraciones y RLS en desarrollo; después repetir en staging aislado.
3. Configurar en staging las variables, permisos de archivos y roles equivalentes a producción, con secretos propios.
4. Restaurar una copia en un entorno aislado y ejecutar las comprobaciones de esta guía.
5. Preparar la base de producción, sus roles, variables y `UPLOAD_DIR` privado; conservar una copia recuperable antes de migrar.
6. Aplicar migraciones con la identidad de migración; iniciar la API con la identidad restringida.
7. Verificar salud, HTTPS, aislamiento, logs sin secretos y funcionamiento del frontend.
8. Desplegar con observación de errores y latencia, y tener un procedimiento de rollback probado. No rebajar el esquema a ciegas si v2 ya ha escrito datos.

La puesta en producción queda pendiente mientras no se hayan verificado los roles de base de datos, RLS con el usuario real de API, la restauración de una copia y las pruebas de staging. La revisión jurídica y de privacidad específica de Fichapp también debe cerrarse con asesoramiento competente.
