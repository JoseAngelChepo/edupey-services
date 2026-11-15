// Promote an existing account to admin. Never runs automatically.
import 'dotenv/config';
import mongoose from 'mongoose';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run promote:admin -- correo@ejemplo.com');
  process.exitCode = 1;
  process.exit();
}
if (!process.env.MONGODB_URI) {
  console.error('Configura MONGODB_URI en .env primero.');
  process.exitCode = 1;
  process.exit();
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const existing = await users.findOne({ email });
  if (!existing) {
    console.error(`No hay cuenta con email ${email}. Regístrate primero y vuelve a ejecutar el comando.`);
    process.exitCode = 1;
  } else {
    await users.updateOne(
      { email },
      { $set: { role: 'admin', isActive: true, updatedAt: new Date() } },
    );
    console.log(`Cuenta ${email} promovida a admin. Cierra sesión y vuelve a entrar para refrescar el JWT.`);
  }
} catch {
  console.error('No se pudo promover la cuenta. Comprueba MongoDB y el email.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
