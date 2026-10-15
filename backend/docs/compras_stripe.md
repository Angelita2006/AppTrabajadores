# Configuración de compra de planes con Stripe

Fichapp presenta los importes consultando los seis precios recurrentes configurados en Stripe. La API crea una sesión alojada de Stripe Checkout, y solo crea la licencia al verificar el pago en Stripe. El webhook mantiene al día su periodo y estado de suscripción; la licencia queda vinculada al correo de Checkout y solo se puede canjear al registrar la empresa con ese mismo correo.

## Variables de entorno

Añade estos nombres al `.env` local de la raíz del proyecto y configura sus equivalentes como variables protegidas en Plesk. Usa claves de prueba (`sk_test_…` y `whsec_…`) en local y staging, y claves live distintas en producción.

```dotenv
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASICO_MENSUAL=
STRIPE_PRICE_BASICO_ANUAL=
STRIPE_PRICE_PRO_MENSUAL=
STRIPE_PRICE_PRO_ANUAL=
STRIPE_PRICE_ENTERPRISE_MENSUAL=
STRIPE_PRICE_ENTERPRISE_ANUAL=
STRIPE_SUCCESS_URL=http://localhost:8081/checkout/confirmacion?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:8081/planes
STRIPE_AUTOMATIC_TAX_ENABLED=false
```

Sustituye las URLs locales por las URLs HTTPS reales en producción. Si Expo se publica bajo `/frontend/dist`, configura `STRIPE_SUCCESS_URL=https://www.registrohorariosimple.es/frontend/dist/checkout/confirmacion?session_id={CHECKOUT_SESSION_ID}` y `STRIPE_CANCEL_URL=https://www.registrohorariosimple.es/precios.html`. Stripe exige conservar literalmente `{CHECKOUT_SESSION_ID}` en `STRIPE_SUCCESS_URL`. No copies secretos a Git ni al frontend.

## Catálogo de precios

En el Dashboard de Stripe, crea los productos y los seis precios recurrentes: Básico mensual/anual, Pro mensual/anual y Enterprise mensual/anual. Copia el `price_…` de cada uno a su variable correspondiente. No se definen importes en el código. El endpoint `GET /api/licencias/planes/precios` publica solo los precios activos que existan y tengan el intervalo esperado.

Configura en Stripe el tratamiento fiscal y el comportamiento de impuestos de cada precio antes de cobrar clientes. Para que Checkout calcule automáticamente los impuestos, habilita Stripe Tax en la cuenta, configura registros y ubicaciones fiscales y establece `STRIPE_AUTOMATIC_TAX_ENABLED=true`. La opción `false` no calcula impuestos automáticamente. La recogida del identificador fiscal del cliente no sustituye la configuración fiscal del vendedor.

## Webhook

Crea un endpoint de webhook apuntando a:

```text
https://www.registrohorariosimple.es/api/licencias/webhook/stripe
```

Suscríbelo a estos eventos y guarda el secreto de firma `whsec_…` en `STRIPE_WEBHOOK_SECRET`:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

El webhook verifica la firma. Stripe puede reintentar entregas; la creación de licencias es idempotente por ID de sesión de Checkout.

## Desarrollo y despliegue

Desde `backend`, instala la dependencia y aplica la migración:

```powershell
python -m pip install -r requirements.txt
alembic upgrade head
```

Para probar webhooks localmente, instala Stripe CLI, ejecuta la API y usa:

```powershell
stripe listen --forward-to localhost:8080/api/licencias/webhook/stripe
```

Copia el `whsec_…` que imprime Stripe CLI al `.env` local. Completa un pago de prueba y comprueba que se genera una sola licencia, se muestra el mismo código en la pantalla de confirmación y el registro de empresa lo acepta únicamente con el correo pagador.

En producción, crea primero los precios y el webhook en modo live, configura las variables live en Plesk y aplica `alembic upgrade head` a la base de producción durante el despliegue. La landing asume que API y página comparten origen; si están separados, define `window.FICHAPP_API_URL` antes del script de compra con el origen HTTPS de la API. Hasta que haya claves, seis IDs de precios y el webhook configurados, la API no puede iniciar cobros reales; los endpoints de compra responderán con servicio no disponible.
