const crypto = require("crypto");
const path = require("path");
const supabase = require("../config/supabase");
const env = require("../config/env");
const { errores, verificar } = require("../utils/errores");
const { REGLAS_ARCHIVOS, FIRMAS, MIME_POR_EXTENSION } = require("../domain/archivos");

const DURACION_URL_SEGUNDOS = 60 * 60;
const COLUMNAS = "id, usuario_id, equipo_id, version_id, categoria, nombre_original, nombre_almacenado, mime_tipo, peso_bytes, bucket, ruta, creado_en";

function storage() {
  return supabase.storage.from(env.bucket);
}

function limpiarNombre(nombre) {
  const base = path.basename(String(nombre || "archivo")).replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_");
  return base.slice(-200) || "archivo";
}

function validarArchivo(archivo, categoria) {
  const reglas = REGLAS_ARCHIVOS[categoria];
  if (!archivo) throw errores.validacion(`Adjunta un archivo. ${reglas.descripcion || ""}`.trim());

  const extension = path.extname(archivo.originalname || "").slice(1).toLowerCase();
  if (!reglas.extensiones.includes(extension)) {
    throw errores.tipoNoSoportado(
      `Extensión .${extension || "?"} no permitida. Se aceptan: ${reglas.extensiones.map((e) => "." + e).join(", ")}.`
    );
  }

  const mime = MIME_POR_EXTENSION[extension];
  const declarado = (archivo.mimetype || "").toLowerCase();
  if (declarado && declarado !== "application/octet-stream" && !reglas.mimes.includes(declarado)) {
    throw errores.tipoNoSoportado(`Tipo de archivo ${declarado} no permitido.`);
  }
  if (!FIRMAS[mime](archivo.buffer)) {
    throw errores.tipoNoSoportado(`El contenido no corresponde a un archivo .${extension} válido.`);
  }
  if (archivo.size > reglas.maxBytes) {
    throw errores.archivoGrande(`El archivo supera el máximo de ${Math.round(reglas.maxBytes / 1024)} KB.`);
  }
  return { extension, mime };
}

async function guardar({ usuarioId, equipoId = null, versionId = null, categoria, buffer, nombreOriginal, extension, mime }) {
  const nombreAlmacenado = `${crypto.randomUUID()}.${extension}`;
  const carpeta = equipoId ? `equipos/${equipoId}` : `usuarios/${usuarioId}`;
  const ruta = `${carpeta}/${categoria}/${nombreAlmacenado}`;

  verificar(
    await storage().upload(ruta, buffer, { contentType: mime, upsert: false }),
    "Subiendo archivo a Storage"
  );

  const { data, error } = await supabase
    .from("archivo")
    .insert({
      usuario_id: usuarioId,
      equipo_id: equipoId,
      version_id: versionId,
      categoria,
      nombre_original: limpiarNombre(nombreOriginal),
      nombre_almacenado: nombreAlmacenado,
      mime_tipo: mime,
      peso_bytes: buffer.length,
      bucket: env.bucket,
      ruta,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    await storage().remove([ruta]);
    verificar({ error }, "Registrando metadatos del archivo");
  }
  return data;
}

async function guardarSubido({ usuarioId, equipoId, categoria, archivo }) {
  const { extension, mime } = validarArchivo(archivo, categoria);
  return guardar({
    usuarioId,
    equipoId,
    categoria,
    buffer: archivo.buffer,
    nombreOriginal: archivo.originalname,
    extension,
    mime,
  });
}

async function urlFirmada(fila, { descargar = false } = {}) {
  const { data, error } = await storage().createSignedUrl(fila.ruta, DURACION_URL_SEGUNDOS, {
    download: descargar ? fila.nombre_original : undefined,
  });
  if (error) return null;
  return data.signedUrl;
}

async function conUrls(filas) {
  if (filas.length === 0) return [];
  const { data } = await storage().createSignedUrls(
    filas.map((f) => f.ruta),
    DURACION_URL_SEGUNDOS
  );
  const porRuta = new Map((data || []).map((d) => [d.path, d.signedUrl]));
  return filas.map((f) => archivoDTO(f, porRuta.get(f.ruta) || null));
}

function archivoDTO(f, url) {
  return {
    id: f.id,
    categoria: f.categoria,
    nombreOriginal: f.nombre_original,
    nombreAlmacenado: f.nombre_almacenado,
    mimeTipo: f.mime_tipo,
    pesoBytes: Number(f.peso_bytes),
    ruta: f.ruta,
    equipoId: f.equipo_id,
    versionId: f.version_id,
    creadoEn: f.creado_en,
    url,
    urlExpiraEnSegundos: url ? DURACION_URL_SEGUNDOS : undefined,
  };
}

async function listar(usuarioId, { categoria, equipoId, limite = 50 } = {}) {
  let consulta = supabase
    .from("archivo")
    .select(COLUMNAS)
    .eq("usuario_id", usuarioId)
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (equipoId) consulta = consulta.eq("equipo_id", equipoId);
  return conUrls(verificar(await consulta, "Listando archivos"));
}

async function buscarPropio(usuarioId, id) {
  const fila = verificar(
    await supabase.from("archivo").select(COLUMNAS).eq("id", id).eq("usuario_id", usuarioId).maybeSingle(),
    "Buscando archivo"
  );
  if (!fila) throw errores.noEncontrado("Archivo no encontrado.");
  return fila;
}

async function obtener(usuarioId, id, { descargar = false } = {}) {
  const fila = await buscarPropio(usuarioId, id);
  return archivoDTO(fila, await urlFirmada(fila, { descargar }));
}

async function eliminarFila(fila) {
  const { error } = await storage().remove([fila.ruta]);
  if (error) console.error(`No se pudo borrar ${fila.ruta} de Storage:`, error.message);
  verificar(await supabase.from("archivo").delete().eq("id", fila.id), "Eliminando metadatos del archivo");
}

async function eliminar(usuarioId, id) {
  await eliminarFila(await buscarPropio(usuarioId, id));
}

async function eliminarFicherosDeEquipo(equipoId) {
  const filas = verificar(
    await supabase.from("archivo").select("ruta").eq("equipo_id", equipoId),
    "Listando archivos del equipo"
  );
  if (filas.length === 0) return;
  const { error } = await storage().remove(filas.map((f) => f.ruta));
  if (error) console.error(`No se pudieron borrar los ficheros del equipo ${equipoId}:`, error.message);
}

module.exports = {
  validarArchivo,
  guardar,
  guardarSubido,
  urlFirmada,
  conUrls,
  archivoDTO,
  listar,
  obtener,
  buscarPropio,
  eliminar,
  eliminarFila,
  eliminarFicherosDeEquipo,
};
