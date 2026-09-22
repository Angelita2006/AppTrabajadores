import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import hashlib
import json
import math
import os
import smtplib
import uuid
from datetime import datetime
from fastapi import HTTPException, Request, status
from google import genai
from google.genai import types
import httpx
from sqlalchemy.orm import Session
from core.archivos import CARPETA_FIRMAS
from core.config import settings
from models.contratos import Contratos
from models.festivos import Festivos

# Configuración
SMTP_SERVER = settings.SMTP_SERVER
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
EMAILS_FROM = settings.EMAILS_FROM

def calcular_distancia_metros(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia en metros entre dos puntos geográficos usando Haversine."""
    radio_tierra_m = 6371000
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = (
        math.sin(d_lat / 2) ** 2 +
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
        math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radio_tierra_m * c

def validar_dia_laboral_o_marcar_extra(db: Session, trabajador_id: uuid.UUID, fecha_fichaje: datetime):
    """Valida si el día del fichaje es festivo o laborable."""
    contrato = db.query(Contratos).filter(
        Contratos.trabajador_id == trabajador_id,
        Contratos.activo == True,
        Contratos.fecha_inicio <= fecha_fichaje,
        (Contratos.fecha_fin == None) | (Contratos.fecha_fin >= fecha_fichaje)
    ).first()

    if not contrato or not contrato.calendario_laboral_id:
        return "Válido"

    es_festivo = db.query(Festivos).filter(
        Festivos.calendario_id == contrato.calendario_laboral_id,
        Festivos.fecha == fecha_fichaje.date()
    ).first()

    if es_festivo:
        return f"Festivo: {es_festivo.descripcion}"
        
    return "Válido"

def calcular_hash_fichaje(trabajador_id: str, empresa_id: str, tipo_evento_id: str, fecha_iso: str) -> str:
    """Genera el hash inmutable SHA-256 para auditoría legal."""
    datos_crudos = f"{trabajador_id}-{empresa_id}-{tipo_evento_id}-{fecha_iso}"
    return hashlib.sha256(datos_crudos.encode('utf-8')).hexdigest()

def procesar_y_guardar_firma(data_firma: str) -> str:
    """Decodifica una firma en base64 y la guarda en disco, devolviendo la ruta relativa."""
    if not data_firma or not isinstance(data_firma, str):
        return ""
        
    data_encoded = data_firma.split(",", 1)[1] if "," in data_firma else data_firma
    bytes_imagen = base64.b64decode(data_encoded)

    nombre_archivo = f"firma_{uuid.uuid4().hex}.png"
    
    CARPETA_FIRMAS.mkdir(parents=True, exist_ok=True)
    ruta_destino = CARPETA_FIRMAS / nombre_archivo

    with open(ruta_destino, "wb") as buffer:
        buffer.write(bytes_imagen)

    return f"/api/archivos/firmas/{nombre_archivo}"

async def obtener_coordenadas(direccion: str):
    """Consulta la API pública de Nominatim para obtener lat/lon a partir de un texto."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": direccion, "format": "json", "limit": 1}
    headers = {"User-Agent": "TuAppDeFichajes/1.0"} 
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    return None, None


def analizar_pdf_con_ia(contenido_pdf: bytes) -> list:
    """
    Envía el archivo PDF binario a Gemini para que extraiga visualmente
    todos los días festivos en un formato JSON limpio.
    """
    # Inicializa el cliente usando la clave de entorno GEMINI_API_KEY
    client = genai.Client(api_key=settings.GEMINI_API_KEY.__str__())
    
    # Preparamos el archivo binario para enviarlo directamente como InlineData
    documento_pdf = types.Part.from_bytes(
        data=contenido_pdf,
        mime_type="application/pdf",
    )
    
    # Creamos el prompt pidiéndole estrictamente un JSON estructurado
    prompt = (
        "Analiza visualmente este calendario laboral en PDF. "
        "Identifica todos los días festivos indicados (generalmente marcados en color o listados). "
        "Devuelve la lista de festivos estrictamente en un formato JSON estructurado con el siguiente esquema: "
        "[{\"fecha\": \"YYYY-MM-DD\", \"descripcion\": \"Nombre del festivo\", \"tipo\": \"Nacional\" | \"Autonómico\" | \"Local\"}]. "
        "No incluyas explicaciones ni bloques de código markdown, solo el JSON crudo."
    )
    
    # Llamamos al modelo idóneo para procesamiento de documentos mutimodales
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[documento_pdf, prompt]
    )
    
    try:
        # Limpiamos posibles espacios o formatos de texto sobrantes de la respuesta
        texto_limpio = response.text.strip() if response.text else ""
        if texto_limpio.startswith("```json"):
            texto_limpio = texto_limpio.split("```json")[1].split("```")[0].strip()
        elif texto_limpio.startswith("```"):
            texto_limpio = texto_limpio.split("```")[1].split("```")[0].strip()
            
        return json.loads(texto_limpio)
    except Exception as e:
        print(f"Error al parsear el JSON de Gemini: {e}")
        # Retorno de emergencia si la IA no estructuró bien la respuesta
        return []

def enviar_correo_recuperacion(destinatario: str, codigo: str):
    """Función auxiliar para enviar el correo mediante SMTP"""
    try:
        mensaje = MIMEMultipart("alternative")
        mensaje.add_header("Subject", "Código de recuperación de contraseña - Fichapp")
        mensaje["From"] = EMAILS_FROM
        mensaje["To"] = destinatario

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
              <h2 style="color: #2563EB;">Recuperación de Contraseña</h2>
              <p>Has solicitado restablecer tu contraseña en <strong>Fichapp</strong>.</p>
              <p>Tu código de verificación de 6 dígitos es:</p>
              <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 4px;">
                {codigo}
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            </div>
          </body>
        </html>
        """

        mensaje.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as servidor:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
            servidor.sendmail(SMTP_USER, destinatario, mensaje.as_string())
            
    except Exception as e:
        print(f"Error al enviar el correo SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo electrónico de recuperación. Inténtalo más tarde."
        )


def enviar_correo_cambio_contraseña(destinatario: str, codigo: str):
    """Función auxiliar para enviar el correo mediante SMTP"""
    try:
        mensaje = MIMEMultipart("alternative")
        mensaje.add_header("Subject", "Código de cambio de contraseña - Fichapp")
        mensaje["From"] = EMAILS_FROM
        mensaje["To"] = destinatario

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
              <h2 style="color: #2563EB;">Cambio de Contraseña</h2>
              <p>Has solicitado cambiar tu contraseña en <strong>Fichapp</strong>.</p>
              <p>Tu código de verificación de 6 dígitos es:</p>
              <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 4px;">
                {codigo}
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            </div>
          </body>
        </html>
        """

        mensaje.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as servidor:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
            servidor.sendmail(SMTP_USER, destinatario, mensaje.as_string())
            
    except Exception as e:
        print(f"Error al enviar el correo SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo electrónico de cambio de contraseña. Inténtalo más tarde."
        )

def enviar_correo_cambio_email(destinatario: str, token: str):
    """Función auxiliar para enviar el enlace de confirmación de cambio de correo mediante SMTP"""
    # Ajusta esta URL a la ruta de tu frontend o aplicación que procesará el token
    url_confirmacion = f"http://localhost:8081/confirmar-cambio-email?token={token}"
    
    try:
        mensaje = MIMEMultipart("alternative")
        mensaje.add_header("Subject", "Confirmación de cambio de correo electrónico - Fichapp")
        mensaje["From"] = EMAILS_FROM
        mensaje["To"] = destinatario

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
              <h2 style="color: #2563EB;">Cambio de Correo Electrónico</h2>
              <p>Has solicitado cambiar tu correo electrónico en <strong>Fichapp</strong>.</p>
              <p>Para confirmar tu nuevo correo y completar el proceso, haz clic en el siguiente botón:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{url_confirmacion}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Confirmar mi nuevo correo</a>
              </div>
              <p style="font-size: 14px; color: #555;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
              <p style="font-size: 12px; color: #2563EB; word-break: break-all;">{url_confirmacion}</p>
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
            </div>
          </body>
        </html>
        """

        mensaje.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as servidor:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
            servidor.sendmail(SMTP_USER, destinatario, mensaje.as_string())
            
    except Exception as e:
        print(f"Error al enviar el correo SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo electrónico de confirmación. Inténtalo más tarde."
        )