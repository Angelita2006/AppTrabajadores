import datetime
from sqlalchemy import or_
from sqlalchemy.orm import Session
from core.enums import EstadoCorreccionEnum, EstadoFichajeEnum, TipoCorreccionEnum
from models.correcciones_fichaje import CorreccionesFichaje
from models.fichajes import Fichajes
from models.resumenes_jornada import ResumenesJornada
from models.asignaciones_turno import AsignacionesTurno 
from models.turnos import Turnos

def calcular_resumen_jornada(
    db: Session,
    empresa_id,
    trabajador_id,
    fecha: datetime.date,
) -> ResumenesJornada:
    """Calcula el agregado diario a partir de los fichajes vigentes usando el turno asignado (Enfoque B)."""
    
    # 1. Determinar el día de la semana (1=Lunes ... 7=Domingo)
    dia_semana = fecha.isoweekday()

    # 2. Buscar si el trabajador tiene un turno asignado que aplique a este día
    # (Asumiendo que AsignacionesTurno relaciona trabajador con turno y fecha o rango de fechas)
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

    # 3. Calcular la ventana de búsqueda de fichajes en base al turno (o una por defecto si descansa o no tiene turno)
    if turno_asignado:
        # Si el turno es nocturno (ej: 22:00 a 06:00, hora_inicio > hora_fin)
        if turno_asignado.hora_inicio > turno_asignado.hora_fin:
            # Empezamos a buscar un poco antes de la hora de entrada 
            datetime_inicio = datetime.datetime.combine(fecha, turno_asignado.hora_inicio)
            inicio_ventana = datetime_inicio - datetime.timedelta(hours=2)
            # La salida ocurre al día siguiente, así que extendemos la ventana hasta la hora de fin día siguiente
            datetime_fin = datetime.datetime.combine(fecha + datetime.timedelta(days=1), turno_asignado.hora_fin)
            fin_ventana = datetime_fin + datetime.timedelta(hours=2)
        else:
            # Turno diurno normal
            inicio_ventana = datetime.datetime.combine(fecha, datetime.time.min)
            fin_ventana = datetime.datetime.combine(fecha + datetime.timedelta(days=1), datetime.time.min)
    else:
        # Ventana por defecto amplia si no hay turno estricto asignado (ej: jornada flexible o festivo)
        inicio_ventana = datetime.datetime.combine(fecha, datetime.time.min)
        fin_ventana = datetime.datetime.combine(fecha + datetime.timedelta(days=1),  datetime.time.min)

    # 4. Consulta de fichajes vigentes dentro de la ventana calculada
    fichajes = (
        db.query(Fichajes)
        .filter(
            Fichajes.empresa_id == empresa_id,
            Fichajes.trabajador_id == trabajador_id,
            Fichajes.estado == EstadoFichajeEnum.VALIDO,
            ~Fichajes.id.in_(db.query(Fichajes.fichaje_sustituido_id).filter(Fichajes.fichaje_sustituido_id.is_not(None))),
            ~Fichajes.id.in_(
                db.query(CorreccionesFichaje.fichaje_afectado_id).filter(
                    CorreccionesFichaje.fichaje_afectado_id.is_not(None),
                    CorreccionesFichaje.tipo_correccion == TipoCorreccionEnum.ANULACION,
                    CorreccionesFichaje.estado == EstadoCorreccionEnum.APROBADA,
                )
            ),
            Fichajes.fecha_hora >= inicio_ventana,
            Fichajes.fecha_hora < fin_ventana,
        )
        .order_by(Fichajes.fecha_hora.asc())
        .all()
    )

    entrada = None
    salida = None
    pausas: list[tuple[datetime.datetime, datetime.datetime]] = []
    pausa_inicio = None
    for fichaje in fichajes:
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
        resumen.hora_entrada = entrada
        resumen.hora_salida = salida
        resumen.tiene_incidencias = bool(entrada and not salida or pausa_inicio)
        resumen.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    return resumen