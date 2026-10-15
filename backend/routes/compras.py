"""Stripe Checkout and subscription synchronization endpoints."""

import secrets
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import urlsplit

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.enums import CicloFacturacionEnum, EstadoSuscripcionEnum, PlanLicenciaEnum
from models.licencias import Licencias
from schemas.licencias import CrearCheckoutRequest

router = APIRouter(prefix="/api/licencias", tags=["Compras y suscripciones"])
limiter = Limiter(key_func=get_remote_address)

PRICE_IDS = {
    (PlanLicenciaEnum.BASICO, CicloFacturacionEnum.MENSUAL): lambda: settings.STRIPE_PRICE_BASICO_MENSUAL,
    (PlanLicenciaEnum.BASICO, CicloFacturacionEnum.ANUAL): lambda: settings.STRIPE_PRICE_BASICO_ANUAL,
    (PlanLicenciaEnum.PRO, CicloFacturacionEnum.MENSUAL): lambda: settings.STRIPE_PRICE_PRO_MENSUAL,
    (PlanLicenciaEnum.PRO, CicloFacturacionEnum.ANUAL): lambda: settings.STRIPE_PRICE_PRO_ANUAL,
    (PlanLicenciaEnum.ENTERPRISE, CicloFacturacionEnum.MENSUAL): lambda: settings.STRIPE_PRICE_ENTERPRISE_MENSUAL,
    (PlanLicenciaEnum.ENTERPRISE, CicloFacturacionEnum.ANUAL): lambda: settings.STRIPE_PRICE_ENTERPRISE_ANUAL,
}


def _validar_configuracion() -> None:
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="La compra online no está configurada.")
    if not settings.STRIPE_SUCCESS_URL or "{CHECKOUT_SESSION_ID}" not in settings.STRIPE_SUCCESS_URL:
        raise HTTPException(status_code=503, detail="La URL de confirmación de compra no está configurada.")
    if not settings.STRIPE_CANCEL_URL:
        raise HTTPException(status_code=503, detail="La URL de cancelación de compra no está configurada.")
    urls_retorno = (settings.STRIPE_SUCCESS_URL, settings.STRIPE_CANCEL_URL)
    for url in urls_retorno:
        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(status_code=503, detail="Las URL de retorno de Checkout no son válidas.")
        if settings.ENVIRONMENT.strip().lower() == "production" and parsed.scheme != "https":
            raise HTTPException(status_code=503, detail="Las URL de retorno de Checkout deben usar HTTPS en producción.")


def _habilitar_rls_de_pago(db: Session) -> None:
    """Activa el contexto global solo en esta transacción interna de pago verificado."""
    db.execute(text(
        "SELECT set_config('app.is_superadmin', 'true', true), "
        "set_config('app.current_empresa_id', '00000000-0000-0000-0000-000000000000', true), "
        "set_config('app.allowed_empresa_ids', 'ARRAY[]', true)"
    ))


def _fecha(timestamp: int | None, fallback: date) -> date:
    return datetime.fromtimestamp(timestamp, timezone.utc).date() if timestamp else fallback


def _periodo(suscripcion: Any) -> tuple[int | None, int | None]:
    inicio = suscripcion.get("current_period_start")
    fin = suscripcion.get("current_period_end")
    items = (suscripcion.get("items") or {}).get("data") or []
    if items:
        inicio = inicio or items[0].get("current_period_start")
        fin = fin or items[0].get("current_period_end")
    return inicio, fin


def _emitir_licencia(db: Session, checkout: Any) -> Licencias:
    checkout_id = checkout.get("id")
    if not checkout_id:
        raise ValueError("La sesión de Checkout no tiene identificador.")
    _habilitar_rls_de_pago(db)
    existente = db.query(Licencias).filter(
        Licencias.stripe_checkout_session_id == checkout_id
    ).with_for_update().first()
    if existente:
        return existente

    metadata = checkout.get("metadata") or {}
    plan = PlanLicenciaEnum(metadata.get("plan"))
    ciclo = CicloFacturacionEnum(metadata.get("ciclo"))
    if ciclo == CicloFacturacionEnum.TRIAL:
        raise ValueError("No se emite una prueba gratuita desde Checkout.")
    subscription_id = checkout.get("subscription")
    if isinstance(subscription_id, dict):
        subscription_id = subscription_id.get("id")
    if not subscription_id:
        raise ValueError("La compra pagada no contiene una suscripción.")

    suscripcion = stripe.Subscription.retrieve(subscription_id, api_key=settings.STRIPE_SECRET_KEY)
    inicio, fin = _periodo(suscripcion)
    customer_id = checkout.get("customer")
    if isinstance(customer_id, dict):
        customer_id = customer_id.get("id")
    checkout_email = (
        (checkout.get("customer_details") or {}).get("email")
        or checkout.get("customer_email")
    )
    codigo = secrets.token_hex(6).upper()
    while db.query(Licencias.id).filter(Licencias.codigo == codigo).first():
        codigo = secrets.token_hex(6).upper()

    licencia = Licencias(
        codigo=codigo,
        empresa_id=None,
        plan=plan,
        ciclo=ciclo,
        estado=EstadoSuscripcionEnum.ACTIVA,
        fecha_inicio=_fecha(inicio, date.today()),
        fecha_expiracion=_fecha(fin, date.today()),
        stripe_subscription_id=subscription_id,
        stripe_checkout_session_id=checkout_id,
        stripe_customer_id=customer_id,
        stripe_checkout_email=checkout_email.lower() if checkout_email else None,
    )
    db.add(licencia)
    try:
        db.commit()
        _habilitar_rls_de_pago(db)
        db.refresh(licencia)
        return licencia
    except Exception:
        db.rollback()
        _habilitar_rls_de_pago(db)
        duplicada = db.query(Licencias).filter(
            Licencias.stripe_checkout_session_id == checkout_id
        ).first()
        if duplicada:
            return duplicada
        raise


def _sincronizar_suscripcion(db: Session, suscripcion: Any) -> None:
    subscription_id = suscripcion.get("id")
    if not subscription_id:
        return
    _habilitar_rls_de_pago(db)
    licencia = db.query(Licencias).filter(
        Licencias.stripe_subscription_id == subscription_id
    ).with_for_update().first()
    if not licencia:
        return
    estado = suscripcion.get("status")
    if estado == "canceled":
        licencia.estado = EstadoSuscripcionEnum.CANCELADA
        licencia.revocada_at = datetime.now(timezone.utc)
    elif estado == "trialing":
        licencia.estado = EstadoSuscripcionEnum.TRIALING
    elif estado == "active":
        licencia.estado = EstadoSuscripcionEnum.ACTIVA
    elif estado in {"past_due", "unpaid", "incomplete_expired", "paused"}:
        licencia.estado = EstadoSuscripcionEnum.VENCIDA
    inicio, fin = _periodo(suscripcion)
    if inicio:
        licencia.fecha_inicio = _fecha(inicio, licencia.fecha_inicio)
    if fin:
        licencia.fecha_expiracion = _fecha(fin, licencia.fecha_expiracion)
    licencia.updated_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/planes/precios", summary="Consultar precios de los planes")
@limiter.limit("30/minute")
def obtener_precios(request: Request):
    """Devuelve precio y moneda consultados directamente desde Stripe."""
    _validar_configuracion()
    resultado = []
    try:
        for (plan, ciclo), get_price_id in PRICE_IDS.items():
            price_id = get_price_id()
            if not price_id:
                continue
            precio = stripe.Price.retrieve(price_id, api_key=settings.STRIPE_SECRET_KEY)
            recurring = getattr(precio, "recurring") or {}
            intervalo = "month" if ciclo == CicloFacturacionEnum.MENSUAL else "year"
            if not  getattr(precio, "active") or getattr(recurring, "interval") != intervalo:
                continue
            producto =  getattr(precio, "product")
            if isinstance(producto, str):
                producto = stripe.Product.retrieve(producto, api_key=settings.STRIPE_SECRET_KEY)
            resultado.append({
                "plan": plan.value,
                "ciclo": ciclo.value,
                "importe_menor_unidad":  getattr(precio, "unit_amount"),
                "moneda": ( getattr(precio, "currency") or "eur").upper(),
                "nombre_producto": getattr(producto, "name") if producto else plan.value,
            })
    except stripe.StripeError as error:
        print(f"No se pudieron consultar los precios de Stripe: {error}")
        raise HTTPException(status_code=502, detail="No se pudieron cargar los precios.") from error
    return resultado


@router.post("/checkout", summary="Iniciar compra de un plan")
@limiter.limit("5/minute")
def crear_checkout(payload: CrearCheckoutRequest, request: Request):
    """Crea una sesión Stripe; no emite una licencia antes de confirmarse el pago."""
    _validar_configuracion()
    price_id = PRICE_IDS.get((payload.plan, payload.ciclo), lambda: "")()
    if not price_id:
        raise HTTPException(status_code=503, detail="Este plan no está disponible para compra.")
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=str(payload.email).lower(),
            billing_address_collection="required",
            tax_id_collection={"enabled": True},
            automatic_tax={"enabled": settings.STRIPE_AUTOMATIC_TAX_ENABLED},
            success_url=settings.STRIPE_SUCCESS_URL,
            cancel_url=settings.STRIPE_CANCEL_URL,
            metadata={"plan": payload.plan.value, "ciclo": payload.ciclo.value},
            subscription_data={"metadata": {"plan": payload.plan.value, "ciclo": payload.ciclo.value}},
            idempotency_key=f"fichapp-checkout-{payload.clave_idempotencia}",
            api_key=settings.STRIPE_SECRET_KEY,
        )
    except stripe.StripeError as error:
        print(f"No se pudo crear la sesión Checkout: {error}")
        raise HTTPException(status_code=502, detail="No se pudo iniciar el pago.") from error
    if not getattr(session, "url"):
        raise HTTPException(status_code=502, detail="Stripe no devolvió la URL de pago.")
    return {"url": session.url, "session_id": session.id}


@router.get("/checkout/{session_id}", summary="Confirmar compra y recuperar licencia")
@limiter.limit("10/minute")
def confirmar_checkout(session_id: str, request: Request, db: Session = Depends(get_db)):
    """Verifica el pago con Stripe y devuelve el código de licencia asignado."""
    _validar_configuracion()
    if not session_id.startswith(("cs_test_", "cs_live_")):
        raise HTTPException(status_code=404, detail="No se encontró la compra.")
    try:
        session = stripe.checkout.Session.retrieve(session_id, api_key=settings.STRIPE_SECRET_KEY)
    except stripe.StripeError as error:
        raise HTTPException(status_code=404, detail="No se encontró la compra.") from error
    if getattr(session, "mode") != "subscription" or getattr(session, "payment_status") not in {"paid", "no_payment_required"}:
        raise HTTPException(status_code=409, detail="El pago todavía no está confirmado.")
    try:
        licencia = _emitir_licencia(db, session)
    except Exception as error:
        db.rollback()
        print(f"No se pudo guardar la licencia de compra ({session_id}): {error}")
        raise HTTPException(status_code=503, detail="El pago se recibió y la licencia se está procesando. Vuelve a intentarlo.") from error
    return {
        "codigo": licencia.codigo,
        "plan": licencia.plan.value,
        "ciclo": licencia.ciclo.value,
        "fecha_inicio": licencia.fecha_inicio,
        "fecha_expiracion": licencia.fecha_expiracion,
    }


@router.post("/webhook/stripe", summary="Sincronizar eventos firmados de Stripe")
@limiter.limit("120/minute")
async def webhook_stripe(request: Request, db: Session = Depends(get_db)):
    """Procesa de forma idempotente pagos, renovaciones y cancelaciones de suscripción."""
    if not settings.STRIPE_WEBHOOK_SECRET or not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Webhook Stripe no configurado.")
    try:
        event = stripe.Webhook.construct_event(
            await request.body(),
            request.headers.get("Stripe-Signature"),
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError) as error:
        raise HTTPException(status_code=400, detail="Firma de webhook inválida.") from error

    event_type = getattr(event, "type")
    objeto = getattr(event, "data", {}).get("object", {})
    try:
        if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
            if objeto.get("mode") == "subscription" and objeto.get("payment_status") in {"paid", "no_payment_required"}:
                _emitir_licencia(db, objeto)
        elif event_type in {"customer.subscription.updated", "customer.subscription.deleted"}:
            _sincronizar_suscripcion(db, objeto)
        elif event_type in {"invoice.paid", "invoice.payment_failed"}:
            subscription_id = objeto.get("subscription")
            if isinstance(subscription_id, dict):
                subscription_id = subscription_id.get("id")
            if subscription_id:
                suscripcion = stripe.Subscription.retrieve(subscription_id, api_key=settings.STRIPE_SECRET_KEY)
                _sincronizar_suscripcion(db, suscripcion)
    except Exception as error:
        db.rollback()
        print(f"No se pudo procesar evento Stripe ({getattr(event, 'id')}): {error}")
        raise HTTPException(status_code=500, detail="No se pudo procesar el evento de pago.") from error
    return {"received": True}
