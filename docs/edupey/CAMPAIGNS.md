# Campañas y seguimiento — contrato implementado

Todas las rutas bajo `/api/v1`.

| Ruta | Acceso | Resultado |
| --- | --- | --- |
| GET /campaigns | Público | Hasta 100 campañas, recientes primero |
| GET /campaigns/:id | Público | Detalle; 400 para ID inválido, 404 inexistente |
| POST /campaigns | Admin activo + CSRF | Publica campaña validada |
| GET /campaigns/following | Usuario autenticado | Campañas seguidas por el usuario de la sesión |
| POST /campaigns/:id/follow | Usuario autenticado + CSRF | Seguimiento idempotente |
| DELETE /campaigns/:id/follow | Usuario autenticado + CSRF | Dejar de seguir |

Creación: title, summary, description, category (materials/scholarship/technology), goalMinor (centavos MXN enteros), beneficiaryCount, learningGoal, selectionCriteria, insufficientFundsPolicy, surplusPolicy, deadline ISO futuro y budget [{label, amountMinor}]. El presupuesto debe sumar la meta. El formulario inicial admite una partida; la API admite hasta 20.

No acepta recaudación, beneficiarios identificables, estado de pago ni createdBy desde el navegador. createdBy viene de la sesión y no se expone públicamente. beneficiaryCount es una cantidad prevista; no equivale a matrícula o identidad verificada. El cierre de plazo se calcula en servidor.

`raisedMinor: 0` y `paymentAvailable: false` expresan que aún no se implementaron pagos; no hay endpoint para confirmar cobros. Seguir una campaña no es donar ni apadrinar un niño. El índice único (userId,campaignId) impide duplicar seguimientos y las consultas se limitan al usuario de sesión.

## Desarrollo y datos demo

`npm run seed:demo` desde edupey-services crea tres ejemplos con isDemo=true sin modificar ejemplos existentes. No ejecutarlo contra bases productivas. Cada ejemplo muestra presupuesto y reglas propuestas, sin afirmar alianzas ni entregas reales. La API de publicación genera campañas normales, sin permitir al cliente inyectar isDemo.

## Validación

`npm run test:campaigns` compila y ejecuta cuatro pruebas de validación y privacidad. Runtime comprobó lectura, permisos, CSRF y seguimiento sin duplicados. La UI permite publicar solo a administradores; no se crearon administradores para realizar la prueba.

Pendiente: edición/paginación de campañas, moderación de publicación, perfiles infantiles, asignaciones, conciliación Pey, revisión humana operativa y entregas. Las menciones de revisión en la UI describen el modelo previsto; no indican un módulo de entrega ya activo.

## Entrada de la plataforma

El catálogo se muestra en `/` y `/campanas`. La explicación del proyecto se conserva en `/proyecto`. Arrancar el frontend desde `edupey-platform` y abrir http://localhost:3000.
