const crypto = require("crypto");
const supabase = require("../config/supabase");
const { errores, verificar } = require("../utils/errores");
const esquemas = require("../schemas");
const { formatearIssues } = require("../middlewares/validar");
const catalogo = require("./catalogo.service");
const reglas = require("./reglas.service");
const vista = require("./vistaEquipo");
const analisis = require("./analisis.service");
const recomendaciones = require("./recomendaciones.service");
const formatoTexto = require("./formatoTexto.service");
const hoja = require("./hojaEquipo.service");
const archivos = require("./archivos.service");

const SELECT_EQUIPO = "*, pokemon_equipo(*, pokemon_equipo_movimientos(movimiento_id, slot))";


function regulacionResumen(cat, id) {
  const r = cat.regulaciones.get(id);
  return r ? { id: r.id, codigo: r.codigo, nombre: r.nombre } : null;
}

function equipoResuelto(cat, fila) {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    nombre: fila.nombre,
    formato: fila.formato,
    regulacionId: fila.regulacion_id,
    descripcion: fila.descripcion,
    arquetipo: fila.arquetipo,
    esPublico: fila.es_publico,
    enlacePublico: fila.enlace_publico,
    versionActual: fila.version_actual,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
    integrantes: (fila.pokemon_equipo || [])
      .sort((a, b) => a.posicion - b.posicion)
      .map((pe) => vista.integranteDesdeFila(cat, pe)),
  };
}

function equipoDTO(cat, e, { privado = true } = {}) {
  return {
    id: privado ? e.id : undefined,
    nombre: e.nombre,
    formato: e.formato,
    regulacion: regulacionResumen(cat, e.regulacionId),
    descripcion: e.descripcion,
    arquetipo: e.arquetipo,
    esPublico: privado ? e.esPublico : undefined,
    enlacePublico: privado ? (e.esPublico ? e.enlacePublico : null) : e.enlacePublico,
    versionActual: e.versionActual,
    creadoEn: e.creadoEn,
    actualizadoEn: e.actualizadoEn,
    integrantes: e.integrantes.map((i, n) => vista.integranteDTO(cat, i, i.posicion ?? n + 1)),
  };
}

function resumenDTO(cat, e) {
  return {
    id: e.id,
    nombre: e.nombre,
    formato: e.formato,
    regulacion: regulacionResumen(cat, e.regulacionId),
    esPublico: e.esPublico,
    versionActual: e.versionActual,
    creadoEn: e.creadoEn,
    actualizadoEn: e.actualizadoEn,
    integrantes: e.integrantes.map((i) => {
      const p = cat.pokemon.get(i.pokemonId);
      return { posicion: i.posicion, pokemonId: p.id, nombreMostrar: p.nombreMostrar, apodo: i.apodo, sprite: p.sprite, esMega: i.esMega };
    }),
  };
}

async function buscarPropio(usuarioId, equipoId) {
  const fila = verificar(
    await supabase.from("equipo").select(SELECT_EQUIPO).eq("id", equipoId).eq("usuario_id", usuarioId).maybeSingle(),
    "Buscando equipo"
  );
  if (!fila) throw errores.noEncontrado("Equipo no encontrado.");
  const cat = await catalogo.obtener();
  return { cat, equipo: equipoResuelto(cat, fila) };
}

async function listar(usuarioId, { nombre, formato } = {}) {
  let consulta = supabase
    .from("equipo")
    .select(SELECT_EQUIPO)
    .eq("usuario_id", usuarioId)
    .order("actualizado_en", { ascending: false });
  if (nombre) consulta = consulta.ilike("nombre", `%${nombre.replace(/[%_\\]/g, "\\$&")}%`);
  if (formato) consulta = consulta.eq("formato", formato);

  const filas = verificar(await consulta, "Listando equipos");
  const cat = await catalogo.obtener();
  return filas.map((f) => resumenDTO(cat, equipoResuelto(cat, f)));
}

async function obtener(usuarioId, equipoId) {
  const { cat, equipo } = await buscarPropio(usuarioId, equipoId);
  return equipoDTO(cat, equipo);
}


function validarOFallar(cat, datos) {
  const { errores: lista, equipo } = reglas.validarEquipo(cat, datos);
  if (lista.length > 0) throw errores.validacion("El equipo no cumple las reglas.", lista);
  return equipo;
}

function parsearEntrada(datos) {
  const r = esquemas.equipo.safeParse(datos);
  if (!r.success) throw errores.validacion("Los datos del equipo no son válidos.", formatearIssues(r.error.issues));
  return r.data;
}


async function guardarExportacionTxt(usuarioId, equipoId, versionId, dto) {
  const texto = formatoTexto.exportar(dto);
  const fila = await archivos.guardar({
    usuarioId,
    equipoId,
    versionId,
    categoria: "exportacion_txt",
    buffer: Buffer.from(texto, "utf8"),
    nombreOriginal: `${dto.nombre}-v${dto.versionActual}.txt`,
    extension: "txt",
    mime: "text/plain",
  });
  return (await archivos.conUrls([fila]))[0];
}

async function persistir(usuarioId, equipoId, resuelto) {
  const cat = await catalogo.obtener();
  const snapshot = equipoDTO(cat, { ...resuelto, id: equipoId, versionActual: null });
  delete snapshot.id;

  const { data, error } = await supabase.rpc("guardar_equipo", {
    p_usuario_id: usuarioId,
    p_equipo_id: equipoId,
    p_equipo: {
      nombre: resuelto.nombre,
      formato: resuelto.formato,
      regulacion_id: resuelto.regulacionId,
      descripcion: resuelto.descripcion,
      arquetipo: resuelto.arquetipo,
    },
    p_integrantes: resuelto.integrantes.map((i) => ({
      pokemon_id: i.pokemonId,
      apodo: i.apodo,
      es_mega: i.esMega,
      nivel: i.nivel,
      habilidad_id: i.habilidadId,
      item_id: i.itemId,
      naturaleza_id: i.naturalezaId,
      evs: i.evs,
      ivs: i.ivs,
      movimientos: i.movimientos,
    })),
    p_snapshot: snapshot,
  });
  if (error?.code === "P0002") throw errores.noEncontrado("Equipo no encontrado.");
  verificar({ error }, "Guardando equipo");

  const guardado = await obtener(usuarioId, data.equipo_id);
  const advertencias = [];
  let exportacion = null;
  try {
    exportacion = await guardarExportacionTxt(usuarioId, data.equipo_id, data.version_id, guardado);
  } catch (err) {
    console.error("No se pudo generar la exportación TXT:", err.message);
    advertencias.push("El equipo se guardó, pero no se pudo generar su archivo de exportación TXT.");
  }

  return { equipo: guardado, version: data.version, exportacion, advertencias };
}

async function crear(usuarioId, datos) {
  const cat = await catalogo.obtener();
  return persistir(usuarioId, null, validarOFallar(cat, datos));
}

async function actualizar(usuarioId, equipoId, datos) {
  await buscarPropio(usuarioId, equipoId);
  const cat = await catalogo.obtener();
  return persistir(usuarioId, equipoId, validarOFallar(cat, datos));
}

async function eliminar(usuarioId, equipoId) {
  await buscarPropio(usuarioId, equipoId);
  await archivos.eliminarFicherosDeEquipo(equipoId);
  verificar(await supabase.from("equipo").delete().eq("id", equipoId).eq("usuario_id", usuarioId), "Eliminando equipo");
}

function entradaDesdeEquipo(e, cambios = {}) {
  return {
    nombre: e.nombre,
    formato: e.formato,
    regulacion: e.regulacionId ?? undefined,
    descripcion: e.descripcion,
    arquetipo: e.arquetipo,
    integrantes: e.integrantes.map(vista.entradaDesdeIntegrante),
    ...cambios,
  };
}

async function duplicar(usuarioId, equipoId) {
  const { cat, equipo } = await buscarPropio(usuarioId, equipoId);
  const nombre = `${equipo.nombre} (copia)`.slice(0, 60);
  return persistir(usuarioId, null, validarOFallar(cat, parsearEntrada(entradaDesdeEquipo(equipo, { nombre }))));
}


async function previsualizar(datos, stat) {
  const cat = await catalogo.obtener();
  const { errores: lista, equipo } = reglas.validarEquipo(cat, datos);
  const validos = equipo.integrantes;
  return {
    valido: lista.length === 0,
    errores: lista,
    analisis: analisis.analizar(cat, validos),
    recomendaciones: validos.length > 0 ? recomendaciones.recomendar(cat, { integrantes: validos, regulacionId: equipo.regulacionId }, stat) : null,
  };
}

async function analizar(usuarioId, equipoId) {
  const { cat, equipo } = await buscarPropio(usuarioId, equipoId);
  return analisis.analizar(cat, equipo.integrantes);
}

async function recomendar(usuarioId, equipoId, stat) {
  const { cat, equipo } = await buscarPropio(usuarioId, equipoId);
  return recomendaciones.recomendar(cat, equipo, stat);
}


async function listarVersiones(usuarioId, equipoId) {
  await buscarPropio(usuarioId, equipoId);
  const filas = verificar(
    await supabase
      .from("equipo_version")
      .select("id, numero, creado_en, snapshot, archivo(id, categoria)")
      .eq("equipo_id", equipoId)
      .order("numero", { ascending: false }),
    "Listando versiones"
  );
  return filas.map((v) => ({
    numero: v.numero,
    creadoEn: v.creado_en,
    nombre: v.snapshot.nombre,
    integrantes: (v.snapshot.integrantes || []).map((i) => i.apodo || i.pokemon.nombreMostrar),
    exportacionId: v.archivo?.find((a) => a.categoria === "exportacion_txt")?.id ?? null,
  }));
}

async function buscarVersion(equipoId, numero) {
  const v = verificar(
    await supabase.from("equipo_version").select("numero, creado_en, snapshot").eq("equipo_id", equipoId).eq("numero", numero).maybeSingle(),
    "Buscando versión"
  );
  if (!v) throw errores.noEncontrado(`La versión ${numero} no existe.`);
  return v;
}

async function obtenerVersion(usuarioId, equipoId, numero) {
  await buscarPropio(usuarioId, equipoId);
  const v = await buscarVersion(equipoId, numero);
  return { numero: v.numero, creadoEn: v.creado_en, equipo: v.snapshot };
}

async function restaurarVersion(usuarioId, equipoId, numero) {
  await buscarPropio(usuarioId, equipoId);
  const { snapshot } = await buscarVersion(equipoId, numero);
  const cat = await catalogo.obtener();
  const entrada = parsearEntrada({
    nombre: snapshot.nombre,
    formato: snapshot.formato,
    regulacion: snapshot.regulacion?.id,
    descripcion: snapshot.descripcion,
    arquetipo: snapshot.arquetipo,
    integrantes: snapshot.integrantes.map(vista.entradaDesdeDTO),
  });
  const resultado = await persistir(usuarioId, equipoId, validarOFallar(cat, entrada));
  return { ...resultado, restauradaDesde: numero };
}


async function compartir(usuarioId, equipoId, publico) {
  const { equipo } = await buscarPropio(usuarioId, equipoId);
  const enlace = equipo.enlacePublico || crypto.randomBytes(9).toString("base64url");
  verificar(
    await supabase.from("equipo").update({ es_publico: publico, enlace_publico: enlace }).eq("id", equipoId),
    "Actualizando enlace público"
  );
  return { esPublico: publico, enlacePublico: publico ? enlace : null };
}

async function obtenerPublico(enlace) {
  const fila = verificar(
    await supabase
      .from("equipo")
      .select(`${SELECT_EQUIPO}, usuario("nombreUsuario")`)
      .eq("enlace_publico", enlace)
      .eq("es_publico", true)
      .maybeSingle(),
    "Buscando equipo público"
  );
  if (!fila) throw errores.noEncontrado("Este equipo no existe o ya no es público.");
  const cat = await catalogo.obtener();
  const equipo = equipoResuelto(cat, fila);

  const hojas = verificar(
    await supabase
      .from("archivo")
      .select("id, ruta, nombre_original, categoria, mime_tipo, peso_bytes, creado_en, equipo_id, version_id, nombre_almacenado")
      .eq("equipo_id", equipo.id)
      .eq("categoria", "hoja_png")
      .order("creado_en", { ascending: false })
      .limit(1),
    "Buscando hoja del equipo"
  );

  return {
    ...equipoDTO(cat, equipo, { privado: false }),
    autor: fila.usuario?.nombreUsuario ?? null,
    hojaPng: hojas[0] ? await archivos.urlFirmada(hojas[0]) : null,
  };
}


async function exportar(usuarioId, equipoId, formato) {
  const { cat, equipo } = await buscarPropio(usuarioId, equipoId);
  const dto = equipoDTO(cat, equipo);
  const version = verificar(
    await supabase.from("equipo_version").select("id").eq("equipo_id", equipoId).eq("numero", equipo.versionActual).maybeSingle(),
    "Buscando versión actual"
  );

  if (formato === "txt") return guardarExportacionTxt(usuarioId, equipoId, version?.id ?? null, dto);

  if (dto.integrantes.length === 0) throw errores.validacion("El equipo no tiene integrantes para generar la hoja.");
  const usuario = verificar(await supabase.from("usuario").select('"nombreUsuario"').eq("id", usuarioId).single(), "Buscando autor");
  const png = await hoja.generarPng(dto, { autor: usuario.nombreUsuario });
  const fila = await archivos.guardar({
    usuarioId,
    equipoId,
    versionId: version?.id ?? null,
    categoria: "hoja_png",
    buffer: png,
    nombreOriginal: `${dto.nombre}-v${dto.versionActual}.png`,
    extension: "png",
    mime: "image/png",
  });
  return (await archivos.conUrls([fila]))[0];
}

function deducirMegas(cat, integrantes) {
  let marcado = integrantes.some((i) => i.esMega);
  for (const i of integrantes) {
    if (marcado) break;
    const pokemonId = catalogo.resolverId(cat, "pokemon", i.pokemon);
    const itemId = catalogo.resolverId(cat, "items", i.objeto);
    if (pokemonId && itemId && vista.megaFormaDe(cat, pokemonId, itemId)) {
      i.esMega = true;
      marcado = true;
    }
  }
}

async function importar(usuarioId, archivo, opciones) {
  archivos.validarArchivo(archivo, "importacion_txt");
  const texto = archivo.buffer.toString("utf8");
  const leido = formatoTexto.importar(texto);
  if (leido.integrantes.length === 0) {
    throw errores.validacion("No se encontró ningún Pokémon en el archivo. Revisa que use el formato de texto de equipos.");
  }

  const cat = await catalogo.obtener();
  deducirMegas(cat, leido.integrantes);

  const entrada = parsearEntrada({
    nombre: opciones.nombre || leido.nombre || archivo.originalname.replace(/\.txt$/i, "").slice(0, 60) || "Equipo importado",
    formato: opciones.formato || leido.formato || "individual",
    regulacion: opciones.regulacion,
    integrantes: leido.integrantes.slice(0, 6),
  });
  const resultado = await persistir(usuarioId, null, validarOFallar(cat, entrada));

  const original = await archivos.guardarSubido({
    usuarioId,
    equipoId: resultado.equipo.id,
    categoria: "importacion_txt",
    archivo,
  });
  return { ...resultado, archivoImportado: (await archivos.conUrls([original]))[0] };
}


async function subirAdjunto(usuarioId, equipoId, archivo, categoria) {
  await buscarPropio(usuarioId, equipoId);
  const extension = (archivo?.originalname || "").split(".").pop().toLowerCase();
  const cat = categoria || (extension === "pdf" ? "notas_pdf" : "captura");
  const fila = await archivos.guardarSubido({ usuarioId, equipoId, categoria: cat, archivo });
  return (await archivos.conUrls([fila]))[0];
}

async function listarArchivos(usuarioId, equipoId) {
  await buscarPropio(usuarioId, equipoId);
  return archivos.listar(usuarioId, { equipoId, limite: 100 });
}

module.exports = {
  equipoResuelto,
  resumenDTO,
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  duplicar,
  previsualizar,
  analizar,
  recomendar,
  listarVersiones,
  obtenerVersion,
  restaurarVersion,
  compartir,
  obtenerPublico,
  exportar,
  importar,
  subirAdjunto,
  listarArchivos,
};
