# MVP y arquitectura propuesta

## Estado inicial

Base de Next.js y NestJS conectada a MongoDB. Implementados campañas públicas, presupuesto y políticas, publicación por administrador, seguimiento persistente y dashboard. Perfiles infantiles, donaciones, juego, estimación facial y canjes siguen pendientes. Ver CAMPAIGNS.md para contratos implementados.

## Recorrido de demo

Elegir campaña → intención de donación → QR Pey → pago confirmado → recaudación actualizada → misión educativa → progreso visible → solicitud de beneficio → comprobación humana → aprobación → entrega restringida registrada.

Si se simula cualquier paso, etiquetarlo como demo y mantener los registros separados de pagos y beneficiarios reales.

## Superficies

1. Donante: campañas, detalle y presupuesto, aportación, historial y dashboard de progreso.
2. Niño/tutor: perfil validado, juego de matemáticas, progreso, catálogo y solicitudes.
3. Facilitador/admin: campañas y fondos, validaciones, evidencia de aprendizaje, autorizaciones y entrega.

## Entidades propuestas

| Entidad | Propósito |
| --- | --- |
| User / Guardian / ChildProfile | Cuentas adultas, tutela, alias infantil, pertenencia al programa |
| Campaign / Sponsorship | Meta colectiva y seguimiento/apadrinamiento |
| Donation / PaymentEvent | Intención, estado, referencia Pey y deduplicación de eventos |
| FundAllocation | Disponibilidad, reserva y destino de cada monto |
| Mission / Attempt / Progress | Habilidad, respuestas, ayudas, resultados y comparación |
| PointLedger | Movimientos auditables; evitar saldo editable sin historial |
| ParticipantVerification | Resultado mínimo de edad/presencia y validación institucional |
| HumanReview | Participante, comprobación de aprendizaje, decisión y responsable |
| Reward / BenefitRequest / Fulfillment | Restricciones, costo, solicitud y evidencia de entrega |

Dinero en unidades menores enteras con moneda explícita. Mantener puntos separados de dinero. Referencias externas únicas; transiciones e idempotencia en servidor. Definir permisos antes de exponer información de menores.

## Reglas de estado propuestas

- Donación: `pending → confirmed | expired | failed`. Registrar devoluciones por separado según soporte y operación definidos; no inferir pago por retorno del navegador.
- Verificación: `pending → review_required → approved | rejected`, con vía de aclaración.
- Beneficio: `requested → under_review → approved → fulfilled`, o `rejected | cancelled`. Todo beneficio real requiere revisión humana; revalidación proporcional y registro explícito.
- Reservar fondos al aprobar, liberar al cancelar y registrar el consumo al entregar. Evitar dobles canjes mediante operaciones atómicas y claves de idempotencia.

## Orden de implementación

- [x] Fase 0: setup, entornos ignorados, contexto y validación de builds.
- [ ] Fase 1: MongoDB, health y auth verificados; roles básicos user/admin existentes. Permisos de tutor, facilitador y niños pendientes. Decisión del usuario para el hackathon: nuevas cuentas activas por defecto (`isActive: true`), con sesión al registrarse. Conservar el bloqueo de cuentas explícitamente inactivas.
- [ ] Fase 2: campañas y seguimiento en dashboard implementados. Perfiles infantiles protegidos y asignaciones pendientes.
- [ ] Fase 3: Pey, webhook verificado, deduplicación y conciliación.
- [ ] Fase 4: juego único, intentos y progreso validados en servidor.
- [ ] Fase 5: validación del participante, proveedor de edad opcional/configurable, revisión humana y canjes restringidos.
- [ ] Fase 6: demo integral, comprobación de permisos, trazabilidad de fondos y entregas.

## Criterios de aceptación del MVP

- Pago repetido no incrementa dos veces la recaudación.
- Ni el navegador ni el niño pueden aprobar puntos, revisiones o entregas.
- Un beneficio real sin revisión humana aprobada no puede entregarse.
- Una estimación incierta permite revisión alternativa.
- No se aprueban beneficios sin presupuesto disponible.
- Donante únicamente accede a los datos infantiles autorizados.
- Estado de demo distinguible de integración real y confirmada.
- Beca pagada a institución y cupón limitado a catálogo autorizado.

No se incluyen múltiples juegos, entrega automática de tarjetas, reconocimiento de identidad facial, rankings públicos, rentabilidad para donantes ni despliegue en este setup.
