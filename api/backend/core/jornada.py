import datetime
from sqlalchemy.orm import Session

from core.enums import EstadoCorreccionEnum, EstadoFichajeEnum
from models.correcciones_fichaje import CorreccionesFichaje
from models.fichajes import Fichajes
from models.resumenes_jornada import ResumenesJornada
from models.tipos_evento_fichaje import TiposEventoFichaje


def recalcular_resumen_jornada(
    db: Session,
    empresa_id,
    trabajador_id,
    fecha: datetime.date,
) -> ResumenesJornada:
    """Recalcula el agregado diario a partir de los fichajes vigentes."""
    fichajes = (
        db.query(Fichajes, TiposEventoFichaje.codigo)
        .join(TiposEventoFichaje, TiposEventoFichaje.id == Fichajes.tipo_evento_id)
        .filter(
            Fichajes.empresa_id == empresa_id,
            Fichajes.trabajador_id == trabajador_id,
            Fichajes.estado == EstadoFichajeEnum.VALIDO,
            ~Fichajes.id.in_(db.query(Fichajes.fichaje_sustituido_id).filter(Fichajes.fichaje_sustituido_id.is_not(None))),
            ~Fichajes.id.in_(
                db.query(CorreccionesFichaje.fichaje_afectado_id).filter(
                    CorreccionesFichaje.fichaje_afectado_id.is_not(None),
                    CorreccionesFichaje.tipo_correccion == "Anulación",
                    CorreccionesFichaje.estado == EstadoCorreccionEnum.APROBADA,
                )
            ),
            Fichajes.fecha_hora >= datetime.datetime.combine(fecha, datetime.time.min),
            Fichajes.fecha_hora < datetime.datetime.combine(fecha + datetime.timedelta(days=1), datetime.time.min),
        )
        .order_by(Fichajes.fecha_hora.asc())
        .all()
    )

    entrada = None
    salida = None
    pausas: list[tuple[datetime.datetime, datetime.datetime]] = []
    pausa_inicio = None
    for fichaje, codigo in fichajes:
        codigo = codigo.upper()
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
        resumen.tiene_incidencia = bool(entrada and not salida or pausa_inicio)
        resumen.actualizado_en = datetime.datetime.now(datetime.timezone.utc)
    return resumen