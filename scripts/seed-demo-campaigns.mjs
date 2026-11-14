// Explicit development fixture loader. Never runs automatically at startup.
import 'dotenv/config';
import mongoose from 'mongoose';
if (process.env.NODE_ENV === 'production') throw new Error('Demo fixtures are disabled in production');
if (!process.env.MONGODB_URI) throw new Error('Configure MONGODB_URI in .env first');
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('campaigns');
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const examples = [
    { demoKey: 'edupey-materials-v1', title: 'Una mochila llena de posibilidades', category: 'materials', beneficiaryCount: 20, goalMinor: 1000000, summary: 'Materiales para que las primeras misiones de matemáticas continúen también fuera de la pantalla.', description: 'Ejemplo de campaña para financiar veinte kits escolares. Cada kit incluiría cuaderno, lápices y materiales para actividades de matemáticas. La entrega se realizaría mediante una organización educativa participante, una vez validado el aprendizaje.', learningGoal: 'Practicar sumas, restas y resolución de problemas cotidianos.', budget: [{label:'20 kits escolares de $400', amountMinor:800000},{label:'Materiales de actividades educativas',amountMinor:200000}] },
    { demoKey: 'edupey-scholarship-v1', title: 'Que su talento llegue más lejos', category: 'scholarship', beneficiaryCount: 8, goalMinor: 1600000, summary: 'Un taller de matemáticas para participantes que destaquen por su progreso, constancia y curiosidad.', description: 'Ejemplo de campaña para financiar un taller de matemáticas. Los apoyos se asignarían con evidencia de aprendizaje y revisión de un facilitador. La beca se pagaría directamente a la institución que imparta el taller; no se entregaría efectivo al participante.', learningGoal: 'Desarrollar razonamiento matemático a través de retos y proyectos guiados.', budget: [{label:'8 inscripciones al taller de $2,000', amountMinor:1600000}] },
    { demoKey: 'edupey-technology-v1', title: 'Pequeñas ideas, grandes inventos', category: 'technology', beneficiaryCount: 12, goalMinor: 1800000, summary: 'Kits compartidos para explorar lógica, construir proyectos y descubrir nuevas habilidades.', description: 'Ejemplo de campaña para financiar seis kits compartidos de iniciación a la robótica. Los materiales se entregarían a una escuela para sesiones supervisadas. La propuesta combina pensamiento lógico con construcción colaborativa.', learningGoal: 'Resolver secuencias lógicas y construir un primer proyecto colaborativo.', budget: [{label:'6 kits de aprendizaje de $2,500',amountMinor:1500000},{label:'Materiales para sesiones guiadas',amountMinor:300000}] },
  ];
  for (const example of examples) {
    await collection.updateOne({ demoKey:example.demoKey }, { $setOnInsert:{...example, currency:'MXN', isDemo:true, deadline, selectionCriteria:'Ejemplo: participantes inscritos mediante tutor y organización, con revisión humana de progreso y necesidades educativas.', insufficientFundsPolicy:'Propuesta de demo: ajustar el alcance con autorización del equipo y comunicar el destino antes de usar los fondos.', surplusPolicy:'Propuesta de demo: ampliar materiales o plazas del mismo programa, con presupuesto y comunicación al donante.', createdAt:new Date(),updatedAt:new Date()} }, {upsert:true});
  }
  console.log('Tres campañas demo disponibles; sin donaciones ni beneficiarios reales.');
} catch {
  console.error('No se pudieron cargar las campañas demo. Comprueba la configuración y la conexión de MongoDB.');
  process.exitCode=1;
} finally { await mongoose.disconnect(); }
