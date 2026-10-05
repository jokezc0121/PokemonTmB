require("dotenv").config({ quiet: true });

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa backend/.env (ver .env.example).`);
  }
  return valor;
}

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: requerida("SUPABASE_URL"),
  supabaseSecretKey: requerida("SUPABASE_SECRET_KEY"),
  bucket: process.env.SUPABASE_BUCKET || "archivos",
  jwtSecret: requerida("JWT_SECRET"),
  jwtExpiresHours: Number(process.env.JWT_EXPIRES_HOURS) || 12,
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};

module.exports = env;
