from datetime import datetime, timedelta
import pytz
from sqlalchemy.future import select
from sqlalchemy import and_
from apscheduler.schedulers.background import BackgroundScheduler
from core.database import SessionLocal
from models.dispositivos_push import DispositivosPush
from models.turnos import Turnos 
from models.asignaciones_turno import AsignacionesTurno 
from models.fichajes import Fichajes 
from firebase_admin import messaging

def enviar_notificacion_olvido_fichaje(fcm_token: str, tipo_accion: str):
    """
    Envía una notificación push mediante FCM al dispositivo del trabajador.
    """
    titulo = "¡Aviso de fichaje próximo!"
    cuerpo = f"Quedan menos de 10 minutos para tu hora de {tipo_accion.lower()}. Por favor, recuerda fichar."

    mensaje = messaging.Message(
        notification=messaging.Notification(
            title=titulo,
            body=cuerpo,
        ),
        data={
            "type": "AVISO_FICHAGE",
            "accion": tipo_accion,
        },
        token=fcm_token,
    )

    try:
        respuesta = messaging.send(mensaje)
        print(f"Notificación de {tipo_accion} enviada con éxito al token: {fcm_token[:10]}...")
        return True
    except Exception as e:
        print(f"Error al enviar la notificación push FCM: {e}")
        return False

def tarea_verificar_olvidos_fichaje():
    """
    Revisa cada minuto si hay turnos que empiezan o terminan en los próximos 10 minutos,
    notificando de forma recurrente dentro de esa ventana si aún no se ha fichado.
    """
    db = SessionLocal()
    try:
        tz = pytz.timezone('Europe/Madrid')
        ahora = datetime.now(tz)
        fecha_hoy = ahora.strftime("%Y-%m-%d")
        
        # Ventana de tiempo: desde 1 minuto en el futuro hasta 10 minutos en el futuro
        minuto_inicio = ahora + timedelta(minutes=1)
        minuto_fin = ahora + timedelta(minutes=10)
        
        hora_inicio_str = minuto_inicio.strftime("%H:%M")
        hora_fin_str = minuto_fin.strftime("%H:%M")
        
        print(f"[{ahora.strftime('%H:%M:%S')}] Buscando turnos entre las {hora_inicio_str} y las {hora_fin_str}...")

        # 1. REVISIÓN DE ENTRADAS (Turnos que empiezan en esa ventana de 10 minutos)
        stmt_entradas = select(AsignacionesTurno, Turnos).join(Turnos, AsignacionesTurno.turno_id == Turnos.id).where(
            and_(
                Turnos.hora_inicio >= hora_inicio_str,
                Turnos.hora_inicio <= hora_fin_str,
                AsignacionesTurno.fecha_inicio == fecha_hoy 
            )
        )
        asignaciones_entrada = db.execute(stmt_entradas).all()

        for asig, turno in asignaciones_entrada:
            trabajador_id = asig.trabajador_id
            
            # Comprobar si ya existe un registro de ENTRADA hoy
            stmt_fichaje = select(Fichajes).where(
                and_(
                    Fichajes.trabajador_id == trabajador_id,
                    Fichajes.fecha == fecha_hoy,
                    Fichajes.tipo_evento == "ENTRADA" 
                )
            )
            fichaje_existente = db.execute(stmt_fichaje.limit(1)).scalars().first()

            if not fichaje_existente:
                stmt_push = select(DispositivosPush).where(DispositivosPush.usuario_id == trabajador_id)
                dispositivo = db.execute(stmt_push).scalars().first()

                if dispositivo and dispositivo.fcm_token:
                    enviar_notificacion_olvido_fichaje(dispositivo.fcm_token, "ENTRADA")

        # 2. REVISIÓN DE SALIDAS (Turnos que terminan en esa ventana de 10 minutos)
        stmt_salidas = select(AsignacionesTurno, Turnos).join(Turnos, AsignacionesTurno.turno_id == Turnos.id).where(
            and_(
                Turnos.hora_fin >= hora_inicio_str,
                Turnos.hora_fin <= hora_fin_str,
                AsignacionesTurno.fecha_inicio == fecha_hoy
            )
        )
        asignaciones_salida = db.execute(stmt_salidas).all()

        for asig, turno in asignaciones_salida:
            trabajador_id = asig.trabajador_id
            
            stmt_fichaje_salida = select(Fichajes).where(
                and_(
                    Fichajes.trabajador_id == trabajador_id,
                    Fichajes.fecha == fecha_hoy,
                    Fichajes.tipo_evento == "SALIDA"
                )
            )
            fichaje_salida_existente = db.execute(stmt_fichaje_salida.limit(1)).scalars().first()

            if not fichaje_salida_existente:
                stmt_push = select(DispositivosPush).where(DispositivosPush.usuario_id == trabajador_id)
                dispositivo = db.execute(stmt_push).scalars().first()

                if dispositivo and dispositivo.fcm_token:
                    enviar_notificacion_olvido_fichaje(dispositivo.fcm_token, "SALIDA")

    except Exception as e:
        print(f"Error en la tarea programada de verificación de fichajes: {e}")
    finally:
        db.close()

# Configuración y arranque del Scheduler (para iniciar junto con FastAPI)
scheduler = BackgroundScheduler()
# Se ejecuta cada 1 minuto para evaluar de forma continua el margen previo de los 10 minutos
scheduler.add_job(tarea_verificar_olvidos_fichaje, 'interval', minutes=1)

def iniciar_scheduler_fichajes():
    if not scheduler.running:
        scheduler.start()
        print("Scheduler de alertas de fichaje iniciado correctamente.")