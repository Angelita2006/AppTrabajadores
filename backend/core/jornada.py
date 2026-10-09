import datetime
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from core.enums import EstadoCorreccionEnum, EstadoFichajeEnum, TipoCorreccionEnum
from models.correcciones_fichaje import CorreccionesFichaje
from models.fichajes import Fichajes
from models.resumenes_jornada import ResumenesJornada
from models.asignaciones_turno import AsignacionesTurno 
from models.turnos import Turnos
from models.contratos import Contratos
from models.contratos_calendarios import ContratosCalendarios
from models.festivos import Festivos

def calcular_resumen_jornada(
    db: Session,
    empresa_id,
    trabajador_id,
    fecha: datetime.date,
) -> ResumenesJornada:
    """Calcula el agregado diario a partir de los fichajes vigentes considerando turnos, festivos e incidencias por correcciones."""
    
    # 1. Verificar si el día es festivo según el calendario asignado al contrato activo del trabajador
    contrato_activo = (
        db.query(Contratos)
        .filter(
            Contratos.empresa_id == empresa_id,
            Contratos.trabajador_id == trabajador_id,
            Contratos.fecha_inicio <= fecha,
            or_(
                Contratos.fecha_fin.is_(None),
                Contratos.fecha_fin >= fecha
            ),
            Contratos.activo.is_(True)
        )
        .first()
    )

    es_festivo = False
    if contrato_activo:
        festivo_encontrado = (
            db.query(Festivos)
            .join(ContratosCalendarios, ContratosCalendarios.calendario_id == Festivos.calendario_id)
            .filter(
                ContratosCalendarios.contrato_id == contrato_activo.id,
                Festivos.fecha == fecha
            )
            .first()
        )
        if festivo_encontrado:
            es_festivo = True

    # 2. Determinar el día de la semana (1=Lunes ... 7=Domingo)
    dia_semana = fecha.isoweekday()

    # 3. Buscar si el trabajador tiene un turno asignado que aplique a este día
    turno_asignado = (
        db.query(Turnos)
        .join(AsignacionesTurno, AsignacionesTurno.turno_id == Turnos.id)
        .filter(
            AsignacionesTurno.empresa_id == empresa_id,
            AsignacionesTurno.trabajador_id == trabajador_id,
            AsignacionesTurno.fecha_inicio <= fecha,
            or_(
                AsignacionesTurno.fecha_fin.is_(None),
                AsignacionesTurno.fecha_fin >= fecha
            ),
            Turnos.activo.is_(True),
        )
        .first()
    )

    # 4. Calcular la ventana de búsqueda de fichajes en base al turno
    if turno_asignado:
        if turno_asignado.hora_inicio > turno_asignado.hora_fin:
            datetime_inicio = datetime.datetime.combine(fecha, turno_asignado.hora_inicio)
            inicio_ventana = datetime_inicio - datetime.timedelta(hours=2)
            datetime_fin = datetime.datetime.combine(fecha + datetime.timedelta(days=1), turno_asignado.hora_fin)
            fin_ventana = datetime_fin + datetime.timedelta(hours=2)
        else:
            inicio_ventana = datetime.datetime.combine(fecha, datetime.time.min)
            fin_ventana = datetime.datetime.combine(fecha + datetime.timedelta(days=1), datetime.time.min)
    else:
        inicio_ventana = datetime.datetime.combine(fecha, datetime.time.min)
        fin_ventana = datetime.datetime.combine(fecha + datetime.timedelta(days=1), datetime.time.min)

    # 5. Consulta de todos los fichajes en la ventana (tanto válidos como posibles afectados por correcciones)
    fichajes_raw = (
        db.query(Fichajes)
        .filter(
            Fichajes.empresa_id == empresa_id,
            Fichajes.trabajador_id == trabajador_id,
            Fichajes.fecha_hora >= inicio_ventana,
            Fichajes.fecha_hora < fin_ventana,
        )
        .all()
    )

    fichaje_ids = [f.id for f in fichajes_raw]

    # 6. Comprobar si existen correcciones asociadas a los fichajes de esta jornada (pendientes o que afecten la integridad)
    tiene_correcciones_incidencias = False
    if fichaje_ids:
        correcciones_asociadas = (
            db.query(CorreccionesFichaje)
            .filter(
                CorreccionesFichaje.fichaje_afectado_id.in_(fichaje_ids)
            )
            .all()
        )
        # Si hay correcciones pendientes de aprobar o rechazadas, se considera que la jornada tiene incidencias activas
        tiene_correcciones_incidencias = any(
            c.estado in (EstadoCorreccionEnum.PENDIENTE, EstadoCorreccionEnum.RECHAZADA) 
            for c in correcciones_asociadas
        )

    # Filtrar fichajes vigentes para el cálculo de horas
    fichajes_vigentes = [
        f for f in fichajes_raw
        if f.estado == EstadoFichajeEnum.VALIDO 
        and f.fichaje_sustituido_id is None
    ]
    fichajes_vigentes.sort(key=lambda x: x.fecha_hora)

    entrada = None
    salida = None
    pausas: list[tuple[datetime.datetime, datetime.datetime]] = []
    pausa_inicio = None
    
    for fichaje in fichajes_vigentes:
        codigo = fichaje.tipo_evento.value
        if codigo == "ENTRADA" and entrada is None:
            entrada = fichaje.fecha_hora
        elif codigo == "SALIDA":
            salida = fichaje.fecha_hora
        elif codigo == "INICIO_PAUSA":
            pausa_inicio = fichaje.fecha_hora
        elif codigo == "FIN_PAUSA" and pausa_inicio is not None:
            pausas.append((pausa_inicio, fichaje.fecha_hora))
            pausa_inicio = None

    minutos_trabajados = 0
    if entrada and salida and salida >= entrada:
        minutos_trabajados = max(
            0,
            int((salida - entrada).total_seconds() // 60)
            - sum(int((fin - inicio).total_seconds() // 60) for inicio, fin in pausas),
        )

    minutos_pausa = sum(
        int((fin - inicio).total_seconds() // 60) for inicio, fin in pausas
    )
    
    # 7. Cálculo avanzado de minutos extra
    minutos_extra = 0
    if es_festivo:
        minutos_extra = minutos_trabajados
    elif turno_asignado:
        if dia_semana not in turno_asignado.dias_semana:
            minutos_extra = minutos_trabajados
        else:
            dt_inicio_turno = datetime.datetime.combine(fecha, turno_asignado.hora_inicio)
            if turno_asignado.hora_fin > turno_asignado.hora_inicio:
                dt_fin_turno = datetime.datetime.combine(fecha, turno_asignado.hora_fin)
            else:
                dt_fin_turno = datetime.datetime.combine(fecha + datetime.timedelta(days=1), turno_asignado.hora_fin)
            
            duracion_bruta_turno = int((dt_fin_turno - dt_inicio_turno).total_seconds() // 60)
            minutos_esperados = max(0, duracion_bruta_turno - turno_asignado.duracion_pausa_minutos)
            
            minutos_extra = max(0, minutos_trabajados - minutos_esperados)
    else:
        minutos_extra = minutos_trabajados

    # 8. Determinar si hay incidencias globales en el día
    # Se marca incidencia si:
    # - Falta marcar la entrada o la salida (fichaje incompleto)
    # - Hay una pausa iniciada sin cerrar
    # - Existen correcciones pendientes o rechazadas sobre los fichajes del día
    es_incompleto = bool((entrada and not salida) or (not entrada and salida) or pausa_inicio)
    tiene_incidencias = es_incompleto or tiene_correcciones_incidencias

    # 9. Guardar o actualizar el resumen en la base de datos
    resumen = db.query(ResumenesJornada).filter(
        ResumenesJornada.trabajador_id == trabajador_id,
        ResumenesJornada.fecha == fecha,
    ).first()
    
    if resumen is None:
        resumen = ResumenesJornada(
            empresa_id=empresa_id,
            trabajador_id=trabajador_id,
            fecha=fecha,
        )
        db.add(resumen)
    
    if not resumen.cerrado:
        resumen.minutos_trabajados = minutos_trabajados
        resumen.minutos_pausa = minutos_pausa
        resumen.minutos_extra = minutos_extra
        resumen.hora_entrada = entrada
        resumen.hora_salida = salida
        resumen.tiene_incidencias = tiene_incidencias
        resumen.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    return resumen