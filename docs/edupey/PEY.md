# Pey / CoDi — integración preparada

## Estado

Implementación lista para configurar; sin credenciales y sin pagos reales probados por decisión del usuario. Los tests usan respuestas aisladas, no un sandbox bancario. Pey documenta actualmente su API de producción y señala que su entorno de pruebas está pendiente. No activar pagos en campañas demo ni crear cobros automáticamente para probar.

## Activación

1. En `edupey-services/.env`, completar `PEY_API_KEY` y `PEY_WEBHOOK_SECRET` (secreto entregado por Pey al configurar el webhook). No generar un secreto distinto localmente.
2. Opcional: `PEY_BANK_ACCOUNT_ID` de una cuenta registrada y activa en Pey. Si se omite, se utiliza la cuenta CoDi vinculada a la API key.
3. Publicar la API en una URL HTTPS accesible a Pey y registrar en su portal `https://<host-api>/api/v1/webhooks/pey`. `localhost` no recibe webhooks desde Pey; no se creó un túnel ni un despliegue en este trabajo.
4. Reiniciar el backend. Health debe mostrar `integrations.pey.configured: true`; esto indica presencia de configuración, no credenciales o cuenta bancaria verificadas.
5. Usar una campaña normal, abierta y con presupuesto/políticas definidos. Las campañas demo tienen bloqueados los cobros tanto en UI como en backend.
6. Realizar una prueba real controlada cuando el usuario la solicite: generar QR, autorizar desde su banco, comprobar recepción, historial y recaudación. No se realizó ninguna transferencia en este trabajo.

Las claves son exclusivamente de servidor; no hay variables NEXT_PUBLIC para Pey.

## Flujo implementado

Cuenta autenticada → monto → solicitud persistida → QR por API Pey → imagen PNG generada localmente → autorización bancaria → webhook firmado → consulta servidor a servidor de la transacción → recibo canónico → historial y recaudación.

La API usa MXN; internamente se guardan centavos enteros. Rango de aportación: $0.01 a $1,000,000 MXN. QR con vencimiento de 15 minutos. El perfil se asocia a la intención desde la sesión; no se deduce el donante de los datos del titular bancario.

| Endpoint bajo /api/v1 | Acceso |
| --- | --- |
| POST /campaigns/:id/donations | Usuario activo, CSRF, rate limit; body amountMinor + idempotencyKey UUID v4 |
| GET /donations/mine | Historial y total confirmado del usuario de sesión; últimas 100 solicitudes |
| GET /donations/:id | Solo propietario; QR únicamente si está pendiente y vigente |
| POST /donations/:id/reconcile | Solo propietario + CSRF; consulta paginada de transacciones Pey, máximo 6 solicitudes/minuto |
| POST /webhooks/pey | Firma Standard Webhooks sobre raw body; no cookies ni CSRF |
| GET /admin/overview | Admin: resumen de aportaciones, recibos y recaudación |
| GET /admin/donations | Admin: listado con filtros de estado/búsqueda y detalle de donante |
| GET /admin/donations/:id | Admin: detalle operativo (recibos, revisión, IDC); sin QR ni CLABE |
| POST /admin/donations/:id/reconcile | Admin + CSRF: conciliación Pey sin exigir propiedad |
| GET /admin/receipts | Admin: recibos confirmados o en revisión |

UI: monto en detalle de campaña, `/aportaciones/:id` para QR/estado y sección “Mis aportaciones” en dashboard. La página del QR consulta el estado local cada 6 segundos; “Ya pagué” consulta a Pey y nunca confirma por sí mismo. El dashboard muestra panel operativo solo a cuentas `admin`.

## Integridad y recuperación

- Índice único (userId,idempotencyKey) para creación; la misma referencia con campaña o monto distinto genera 409.
- Pey no documenta idempotencia para crear QR. Si hay una respuesta incierta, se conserva la solicitud en revisión y no se repite automáticamente el POST remoto con la misma referencia.
- Índice único transactionId en recibos. Se verifica firma, vigencia del webhook y consulta autenticada de la transacción: PAID, MXN, CODI, API_CODI_QR, QR y metadata de campaña/solicitud.
- La recaudación se agrega desde recibos confirmados, sin incrementar contadores en operaciones separadas. Los reintentos de un webhook no duplican el dinero.
- Se cuenta el monto base documentado por Pey, o el total cuando no hay desglose. Monto distinto al solicitado queda en revisión y fuera del total confirmado.
- Si un QR recibe dos transferencias reales distintas, se registran ambas transacciones una sola vez cada una. El historial muestra el total recibido y sus referencias.
- Un pago válido recibido después de vencer el QR puede confirmarse. Vencimiento de QR no significa que una transferencia ya autorizada haya fallado.
- No se guardan payloads bancarios completos, CLABE ni datos del pagador. QR y detalles de solicitudes requieren autenticación/propiedad.
- Los índices únicos se crean antes de aceptar tráfico del módulo; un error al crearlos bloquea el inicio.
- Conciliación manual recorre hasta 10 páginas por solicitud. Si hay más, solicita revisión del equipo.

## Límites actuales

Pendiente prueba real con Pey, destinatario y URL pública. No hay devoluciones automáticas, recibos fiscales ni conciliación programada. El panel admin lista revisiones y permite conciliar manualmente; no resuelve automáticamente mismatches de monto. Promover admin: `npm run promote:admin -- correo@ejemplo.com` y volver a iniciar sesión. Los casos de revisión se conservan para intervención del equipo; no se promete entrega de beneficios con fondos sin confirmar. La comprobación de aprendizaje y la aprobación humana de beneficios son módulos separados y siguen pendientes.

## Verificación

`npm run test:payments` compila y prueba campañas/pagos con fixtures: QR/API, firmas y timestamps, reintentos, múltiples transferencias, monto incorrecto, referencias cruzadas, pago tardío, privacidad, demos, respuesta incierta y paginación. Frontend: typecheck, lint y build. Runtime sin claves: MongoDB disponible, Pey configured=false, historial vacío y ruta anónima rechazada con 401. No se creó una donación real.

## Fuentes del contrato

- https://docs.pey.mx/openapi.json (versión documentada 2026-10-20)
- https://docs.pey.mx/docs/api/create-qr/
- https://docs.pey.mx/docs/api/get-transaction/
- https://docs.pey.mx/docs/api/get-co-di-qr-transactions/
- https://docs.pey.mx/docs/webhooks/codi/qr/
- https://docs.pey.mx/docs/webhooks/introduction/
- https://docs.pey.mx/docs/tutorials/getting-started/set-up-webhooks/
