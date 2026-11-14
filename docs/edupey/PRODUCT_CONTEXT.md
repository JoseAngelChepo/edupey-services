# Contexto del producto — 14 de noviembre de 2026

## Origen y propósito

Proyecto de hackathon. Adultos aportan donaciones mediante Pey, usando pagos QR CoDi. Acceden a un dashboard para seguir a los niños que apadrinan y observar sus avances. Los niños participan en juegos educativos, inicialmente uno, con metas divertidas y recompensas que incentiven la continuidad.

Posicionamiento acordado: **crowdfunding por la educación**. Una comunidad financia metas concretas y puede destinar apoyos mayores a niños sobresalientes. Siempre son donaciones: sin retorno económico, propiedad, participación financiera ni promesas de rentabilidad. “Invertir en educación” expresa impacto social.

Pitch: “EduPey convierte donaciones colectivas en oportunidades de aprendizaje y permite impulsar con más recursos a niños que destacan por su talento, esfuerzo y progreso”.

## Participantes

- Donante/padrino: selecciona campaña, aporta con CoDi, sigue metas, avances y uso del dinero.
- Niño: perfil protegido, juego, metas, progreso y solicitud de beneficios.
- Tutor: gestiona acceso y autorizaciones; acompaña solicitudes.
- Docente/facilitador u organización: valida pertenencia al programa y comprueba aprendizaje.
- Administrador: campañas, pagos, asignaciones, revisiones, catálogo, entregas y trazabilidad.

Los roles de producto son objetivos de diseño; no asumir que los roles técnicos del template ya los implementan.

## Campañas y apadrinamiento

Las campañas son la unidad principal de recaudación; el apadrinamiento mantiene el vínculo con beneficiarios. Cada campaña debe indicar propósito, presupuesto, meta monetaria, plazo, beneficiarios protegidos, criterios de selección, avances y evidencia de entrega. Publicar reglas sobre fondos insuficientes y excedentes antes de recaudar.

Propuesta pendiente de aprobación operativa: fondo común con seguimiento de niños específicos, explicando al donante exactamente cómo se distribuye el dinero. Evitar que popularidad de perfiles decida acceso a recursos básicos.

Dos niveles propuestos:

1. Aprende y descubre: acceso, juego, recursos básicos y primeras recompensas.
2. Impulsa tu talento: cursos, mentorías, materiales especializados y becas para habilidades destacadas.

“Sobresaliente” contempla dominio, progreso desde el punto de partida y constancia, con revisión humana. Horas conectado, cantidad de donantes o ranking del juego no deciden por sí solos el acceso a apoyos.

## Juego inicial propuesto

“Construye tu mundo”: matemáticas para una franja de edad por definir. Isla, ciudad o escuela que se construye resolviendo misiones. Sesiones cortas de explicación, práctica con ayudas y reto final. Ejemplo: una biblioteca necesita 24 bloques y ya tiene 9; calcular cuántos faltan.

Separar experiencia/materiales virtuales de puntos canjeables. Recompensar aprendizaje y esfuerzo sostenido; incluir repaso con preguntas equivalentes. Validar en servidor. Evitar puntos ilimitados por repetir, premios aleatorios y rankings públicos infantiles.

## Reducción de abuso: decisión prioritaria

Riesgo explícito: adultos podrían jugar o resolver misiones para obtener recompensas de menores. El objetivo acordado es **reducir riesgo**, no prometer certeza absoluta. Dificultar suplantación, limitar extracción y controlar destino del apoyo.

**Validación humana obligatoria antes de entregar beneficios de valor real.** El facilitador confirma al beneficiario y comprueba aprendizaje con explicación o ejercicio equivalente. Para apoyos mayores, comprobación más rigurosa y pago directo a institución. La clasificación del juego nunca basta para otorgar becas.

Controles propuestos:

- Registro por tutor, invitación individual y validación de escuela/organización.
- Estimación de edad por captura en vivo y prueba de presencia (liveness) como filtro auxiliar.
- Revisión humana para resultados inciertos; alternativa presencial o asistida para falta de cámara/accesibilidad.
- Varias sesiones, retos de repaso, límites por periodo y controles server-side.
- Señales de abuso: velocidad anómala, saltos bruscos, múltiples cuentas; iniciar revisión, no sancionar automáticamente. Permitir dispositivos compartidos entre hermanos.
- Registrar aprobador, motivo, fecha y evidencia mínima de cada autorización y entrega.

Una foto estima edad; no acredita fecha de nacimiento, identidad, que sea el mismo participante en cada sesión ni autoría de respuestas. Liveness reduce presentación de fotos/videos, sin garantía absoluta.

## Proveedores de edad investigados

Investigación documental, no integración probada ni contrato aprobado:

- **Yoti**, candidato preferido para evaluación: estimación facial y liveness combinados en `POST /ai/v1/age-antispoofing`; devuelve edad estimada y desviación. https://developers.yoti.com/facial-age-estimation-api
- **Privately AgeAssure**, alternativa: SDK web/móvil con procesamiento en dispositivo según proveedor. https://developer.privately.eu/static/web/getting_started.html y https://www.privately.eu/solutions/online-age-verification
- **Amazon Rekognition**, señal auxiliar de rango estimado de edad; `AgeRange` no demuestra presencia ni identidad. https://docs.aws.amazon.com/rekognition/latest/APIReference/API_AgeRange.html

Pendientes: precio, credenciales, condiciones de uso con menores en México, rangos etarios, umbrales y evaluación representativa. No usar umbral arbitrario como prueba definitiva. Obtener autorización del tutor; minimizar datos y evitar conservar imágenes. Confirmar retención del proveedor y del flujo elegido. Las fotos no se muestran a donantes.

## Beneficios y entrega

La idea inicial incluía créditos de Minecraft/Roblox y cupones de útiles. Se priorizan beneficios educativos vinculados al niño, que reducen incentivos de fraude:

- Becas de talleres/cursos infantiles: inscripción nominativa, pago a institución y asistencia.
- Inscripción/colegiatura: pago a escuela vinculado a matrícula.
- Cupones de útiles/uniformes: un uso, productos autorizados, sin efectivo ni saldo de libre disposición.
- Licencias educativas: cuenta escolar del niño.
- Museos/campamentos: reserva nominativa, acompañante cuando proceda.
- Kits de robótica/materiales: entrega vía escuela con recepción registrada.

Ninguna categoría garantiza uso exclusivo por menores. Objetos y cupones pueden desviarse; las restricciones dependen de acuerdos con proveedores. Becas pagadas directamente brindan mayor control. Minecraft/Roblox quedan como opción secundaria/futura, sin afirmar alianzas ni APIs de entrega existentes.

MVP propuesto: un cupón escolar restringido y una beca/taller infantil con entrega manual. Catálogo con existencias y presupuesto; no prometer canjes sin fondos reservados.

## Donaciones y transparencia

Pey genera QR; el backend espera confirmación antes de marcar la aportación pagada. Usar referencia e idempotencia; validar autenticidad del evento según documentación del proveedor. Fuentes: https://docs.pey.mx/docs/api/create-qr/ y https://docs.pey.mx/docs/webhooks/codi/qr/

No identificar automáticamente al donante a partir del titular bancario: asociar intención de donación a la cuenta del usuario. Propuesta futura de acceso por enlace de correo; el template tiene autenticación existente y no se ha sustituido por magic links.

Dashboard: campañas, monto recaudado, asignaciones, gasto/entrega, saldo disponible, habilidades trabajadas y progreso con evaluaciones comparables. No presentar avance del juego como mejora escolar o impacto causal comprobado.

## Privacidad y acceso

Alias y avatares para donantes; información educativa autorizada y mínima. Sin contacto directo padrino-menor. Datos de tutor, edad/documentos y verificaciones restringidos al personal autorizado. Separar permisos de donar, revisar y entregar. No enviar claves de proveedores al navegador.

## Pendientes de decisión

Franja de edad, escuela/organización piloto, reglas de asignación, costo y disponibilidad de premios, criterios de becas, proveedor de edad y condiciones, política de campañas incompletas/excedentes, operación de revisiones y entrega. Estas decisiones no impiden preparar la base técnica.
