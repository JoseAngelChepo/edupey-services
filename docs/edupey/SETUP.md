# Setup EduPey — 14 de noviembre de 2026

Base preparada con https://raw.githubusercontent.com/JoseAngelChepo/template-local-setup/main/SKILL.md.

- Node 22.22.3 y npm 10.9.8; dependencias instaladas con npm ci.
- API: NestJS en http://localhost:3001/api/v1; frontend: Next.js en http://localhost:3000.
- El usuario agregó MongoDB en edupey-services/.env. Health respondió status ok y database.status up. No se instaló ni inició MongoDB localmente.
- Variables y secretos están ignorados por Git. No mostrar ni sobrescribir la conexión del usuario.
- Typecheck/build del backend y typecheck/lint/build del frontend pasaron durante el setup.
- Auditoría: frontend producción sin vulnerabilidades; auditoría completa 8 moderadas de desarrollo. Backend: 4 bajas en producción por Resend/deepmerge; completa 8 (5 bajas, 3 moderadas). Sin altas ni críticas; audit:security pasó en ambos. No se aplicaron upgrades mayores forzados.
- Landing y formulario de registro verificados en navegador. Se creó una cuenta sintética smoke_20261114@example.invalid, pendiente con la configuración anterior. No se cambian cuentas existentes automáticamente.
- Decisión posterior del usuario: isActive true por defecto para nuevas cuentas; registro de cuentas activas crea sesión. Se mantienen los bloqueos de cuentas explícitamente inactivas.
- Campañas y seguimiento implementados; integraciones Pey, edad, juego, perfiles infantiles y beneficios pendientes. Google OAuth y Resend sin configurar.

## Arranque

Ejecutar npm run dev desde edupey-services; comprobar /api/v1/health y después npm run dev desde edupey-platform.

## Repositorios

Repos públicos independientes (historial limpio, sin vínculo a las plantillas):

- https://github.com/JoseAngelChepo/edupey-platform
- https://github.com/JoseAngelChepo/edupey-services

No hacer push a los remotos de `template-platform` / `template-services`. Contexto canónico en docs/ de la raíz, copiado a docs/edupey/ de ambos proyectos.

## Entrega de campañas

- Catálogo con filtros/búsqueda en `/campanas`, detalle `/campanas/:id`, seguimiento `/dashboard` y plantilla conservada en `/dashboard/template`.
- Tres campañas ficticias cargadas explícitamente con `npm run seed:demo`; carga idempotente y bloqueada en NODE_ENV=production. No hay donaciones ni niños reales en esas campañas.
- Backend typecheck, build y 4 pruebas de dominio pasaron; frontend typecheck, lint y build pasaron.
- Prueba HTTP con cuenta ficticia: catálogo, presupuesto, IDs inválidos/ausentes, acceso anónimo, publicación restringida a admin, CSRF y seguimiento idempotente/persistente. Sin crear donaciones.
- Navegador: filtro de becas, detalle, login, seguimiento guardado y dashboard tras recarga. Vista móvil a 390px revisada.
- Fuente tipográfica: system-ui, elegida para lectura y builds offline.
- Formulario administrativo solo visible para cuentas con rol admin. No se promovió a ningún usuario. La prueba end-to-end de publicación con un administrador queda pendiente de contar con esa cuenta.

## Pey preparado

Campos PEY_API_KEY, PEY_WEBHOOK_SECRET y PEY_BANK_ACCOUNT_ID preparados en .env y .env.example. El usuario pidió dejarlo sin activar. Ver PEY.md. Health reporta configured=false y la API de historial funciona autenticada. Sin pagos reales ejecutados.
