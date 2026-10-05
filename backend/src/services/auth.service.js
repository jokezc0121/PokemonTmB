const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const env = require("../config/env");
const { errores, verificar } = require("../utils/errores");

const RONDAS_BCRYPT = 10;
const HASH_RELLENO = bcrypt.hashSync("contraseña-de-relleno", RONDAS_BCRYPT);

const COLUMNAS_USUARIO = 'id, "nombreUsuario", correo, rol, biografia, formato_preferido, avatar_archivo_id, creado_en';

async function crearSesion(usuarioId) {
  const expiraEn = new Date(Date.now() + env.jwtExpiresHours * 3600 * 1000);
  const sesion = verificar(
    await supabase.from("sesion").insert({ usuario_id: usuarioId, expira_en: expiraEn.toISOString() }).select("id").single(),
    "Creando sesión"
  );
  const token = jwt.sign({ sub: String(usuarioId), jti: sesion.id }, env.jwtSecret, {
    expiresIn: `${env.jwtExpiresHours}h`,
  });
  return { token, expiraEn: expiraEn.toISOString() };
}

async function registrar({ nombreEntrenador, correo, contrasena }) {
  const existente = verificar(
    await supabase.from("usuario").select("id").eq("correo", correo).maybeSingle(),
    "Buscando correo"
  );
  if (existente) throw errores.conflicto("Ese correo ya está registrado.");

  const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
  const { data: usuario, error } = await supabase
    .from("usuario")
    .insert({ nombreUsuario: nombreEntrenador, correo, "contraseña": hash, rol: "usuario" })
    .select(COLUMNAS_USUARIO)
    .single();

  if (error?.code === "23505") throw errores.conflicto("Ese correo ya está registrado.");
  verificar({ error }, "Registrando usuario");

  const sesion = await crearSesion(usuario.id);
  return { usuario, ...sesion };
}

async function iniciarSesion({ correo, contrasena }) {
  const usuario = verificar(
    await supabase.from("usuario").select(`${COLUMNAS_USUARIO}, "contraseña"`).eq("correo", correo).maybeSingle(),
    "Buscando usuario"
  );

  const coincide = await bcrypt.compare(contrasena, usuario?.["contraseña"] || HASH_RELLENO);
  if (!usuario || !coincide) throw errores.noAutenticado("Correo o contraseña incorrectos.");

  delete usuario["contraseña"];
  const sesion = await crearSesion(usuario.id);
  return { usuario, ...sesion };
}

async function verificarToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw errores.noAutenticado("Tu sesión expiró o no es válida. Inicia sesión de nuevo.");
  }

  const sesion = verificar(
    await supabase.from("sesion").select("id, usuario_id, expira_en, revocada_en").eq("id", payload.jti).maybeSingle(),
    "Verificando sesión"
  );

  const activa =
    sesion &&
    !sesion.revocada_en &&
    new Date(sesion.expira_en) > new Date() &&
    String(sesion.usuario_id) === payload.sub;

  if (!activa) throw errores.noAutenticado("Tu sesión expiró o se cerró. Inicia sesión de nuevo.");
  return { sesionId: sesion.id, usuarioId: sesion.usuario_id };
}

async function cerrarSesion(sesionId) {
  verificar(
    await supabase.from("sesion").update({ revocada_en: new Date().toISOString() }).eq("id", sesionId),
    "Cerrando sesión"
  );
}

module.exports = { COLUMNAS_USUARIO, registrar, iniciarSesion, verificarToken, cerrarSesion };
