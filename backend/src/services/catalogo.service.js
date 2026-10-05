const supabase = require("../config/supabase");
const { verificar } = require("../utils/errores");
const { claveTipo } = require("../domain/tipos");
const { STATS, COLUMNA_BASE, normalizarStat } = require("../domain/estadisticas");

const TTL_MS = 10 * 60 * 1000;
const PAGINA = 1000;

let cache = null;
let cargadoEn = 0;
let cargaEnCurso = null;

async function leerTodo(tabla, columnas) {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = verificar(
      await supabase.from(tabla).select(columnas).range(desde, desde + PAGINA - 1),
      `Leyendo ${tabla}`
    );
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

function normalizarTexto(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizarNombrePokemon(texto) {
  return normalizarTexto(texto)
    .replace(/[.'\u2019:%]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function nombreParaMostrar(slug) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function calcularRoles(base) {
  const roles = [];
  if (base.atq >= 100 && base.atq >= base.ate) roles.push("atacante-fisico");
  if (base.ate >= 100 && base.ate > base.atq) roles.push("atacante-especial");
  if ((base.ps + base.def + base.dfe) / 3 >= 95) roles.push("defensivo");
  if (base.vel >= 100) roles.push("rapido");
  if (roles.length === 0) roles.push("equilibrado");
  return roles;
}

const ROLES = ["atacante-fisico", "atacante-especial", "defensivo", "rapido", "equilibrado"];

async function construir() {
  const [
    tiposF, pokemonF, pokTiposF, habilidadesF, pokHabF, movimientosF, pokMovF,
    itemsF, pokItemsF, naturalezasF, regulacionesF, regPokF,
  ] = await Promise.all([
    leerTodo("tipos", "id, nombre, imagen"),
    leerTodo("pokemon", "*"),
    leerTodo("pokemon_tipos", "pokemon_id, tipo_id"),
    leerTodo("habilidad", "id, nombre, descripcion"),
    leerTodo("pokemon_habilidades", "pokemon_id, habilidad_id, es_oculta"),
    leerTodo("movimiento", "id, nombre, tipo_id, categoria, potencia, precision, pp, descripcion"),
    leerTodo("pokemon_movimientos", "pokemon_id, movimiento_id"),
    leerTodo("item", "id, nombre, descripcion"),
    leerTodo("pokemon_items", "pokemon_id, item_id"),
    leerTodo("naturaleza", "id, nombre, descripcion, stat_sube, stat_baja"),
    leerTodo("regulacion", "*").catch(() => []),
    leerTodo("regulacion_pokemon", "regulacion_id, pokemon_id").catch(() => []),
  ]);

  const tipos = new Map(
    tiposF.map((t) => [t.id, { id: t.id, nombre: t.nombre.trim(), clave: claveTipo(t.nombre), imagen: t.imagen }])
  );
  const habilidades = new Map(habilidadesF.map((h) => [h.id, { id: h.id, nombre: h.nombre, descripcion: h.descripcion }]));
  const items = new Map(itemsF.map((i) => [i.id, { id: i.id, nombre: i.nombre, descripcion: i.descripcion }]));
  const movimientos = new Map(
    movimientosF.map((m) => [
      m.id,
      {
        id: m.id,
        nombre: m.nombre,
        tipoId: m.tipo_id,
        categoria: m.categoria,
        potencia: m.potencia,
        precision: m.precision,
        pp: m.pp,
        descripcion: m.descripcion,
      },
    ])
  );
  const naturalezas = new Map(
    naturalezasF.map((n) => [
      n.id,
      {
        id: n.id,
        nombre: n.nombre,
        descripcion: n.descripcion,
        sube: normalizarStat(n.stat_sube),
        baja: normalizarStat(n.stat_baja),
      },
    ])
  );

  const pokemon = new Map();
  for (const p of pokemonF) {
    const base = Object.fromEntries(STATS.map((s) => [s, p[COLUMNA_BASE[s]] ?? 0]));
    pokemon.set(p.id, {
      id: p.id,
      nombre: p.nombre,
      nombreMostrar: nombreParaMostrar(p.nombre),
      pokedex: p.poke_id,
      forma: p.tipo_forma,
      especieBaseId: p.especie_base_id,
      itemRequeridoId: p.item_requerido_id,
      sprite: p.sprite,
      peso: p.peso,
      altura: p.altura,
      base,
      total: STATS.reduce((suma, s) => suma + base[s], 0),
      roles: calcularRoles(base),
      tipos: [],
      habilidades: [],
      movimientos: new Set(),
      objetos: [],
      megas: [],
    });
  }

  for (const { pokemon_id, tipo_id } of pokTiposF) pokemon.get(pokemon_id)?.tipos.push(tipo_id);
  for (const r of pokHabF) pokemon.get(r.pokemon_id)?.habilidades.push({ id: r.habilidad_id, oculta: r.es_oculta });
  for (const r of pokMovF) pokemon.get(r.pokemon_id)?.movimientos.add(r.movimiento_id);
  for (const r of pokItemsF) pokemon.get(r.pokemon_id)?.objetos.push(r.item_id);
  for (const p of pokemon.values()) {
    p.tipos.sort((a, b) => a - b);
    if (p.forma === "mega" && p.especieBaseId) pokemon.get(p.especieBaseId)?.megas.push(p.id);
  }

  const regulaciones = new Map(
    regulacionesF.map((r) => [
      r.id,
      {
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        permiteMega: r.permite_mega,
        vigente: r.vigente,
        fechaInicio: r.fecha_inicio,
        fechaFin: r.fecha_fin,
        permitidos: new Set(),
      },
    ])
  );
  for (const r of regPokF) regulaciones.get(r.regulacion_id)?.permitidos.add(r.pokemon_id);

  const indice = (mapa, fn = normalizarTexto) => {
    const idx = new Map();
    for (const v of mapa.values()) idx.set(fn(v.nombre), v.id);
    return idx;
  };
  const indicePokemon = new Map();
  for (const p of pokemon.values()) {
    indicePokemon.set(normalizarNombrePokemon(p.nombre), p.id);
    indicePokemon.set(normalizarNombrePokemon(p.nombreMostrar), p.id);
  }

  return {
    tipos,
    habilidades,
    items,
    movimientos,
    naturalezas,
    pokemon,
    regulaciones,
    indices: {
      pokemon: indicePokemon,
      tipos: indice(tipos),
      habilidades: indice(habilidades),
      items: indice(items),
      movimientos: indice(movimientos),
      naturalezas: indice(naturalezas),
      regulaciones: new Map([...regulaciones.values()].map((r) => [normalizarTexto(r.codigo), r.id])),
    },
  };
}

async function obtener() {
  if (cache && Date.now() - cargadoEn < TTL_MS) return cache;
  if (!cargaEnCurso) {
    cargaEnCurso = construir()
      .then((nuevo) => {
        cache = nuevo;
        cargadoEn = Date.now();
        return nuevo;
      })
      .finally(() => {
        cargaEnCurso = null;
      });
  }
  if (cache) {
    cargaEnCurso.catch((err) => console.error("No se pudo refrescar el catálogo:", err.message));
    return cache;
  }
  return cargaEnCurso;
}

function invalidar() {
  cargadoEn = 0;
}

function resolverId(cat, coleccion, valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const mapa = cat[coleccion];
  if (typeof valor === "number" || /^\d+$/.test(String(valor))) {
    const id = Number(valor);
    return mapa.has(id) ? id : undefined;
  }
  const clave = coleccion === "pokemon" ? normalizarNombrePokemon(valor) : normalizarTexto(valor);
  return cat.indices[coleccion].get(clave);
}

function regulacionPorDefecto(cat) {
  const vigentes = [...cat.regulaciones.values()].filter((r) => r.vigente);
  return vigentes.sort((a, b) => b.id - a.id)[0] || null;
}


function tipoDTO(cat, id) {
  const t = cat.tipos.get(id);
  return t ? { id: t.id, nombre: t.nombre, imagen: t.imagen } : null;
}

function itemDTO(cat, id) {
  const i = cat.items.get(id);
  return i ? { id: i.id, nombre: i.nombre } : null;
}

function movimientoDTO(cat, id) {
  const m = cat.movimientos.get(id);
  if (!m) return null;
  return {
    id: m.id,
    nombre: m.nombre,
    tipo: tipoDTO(cat, m.tipoId),
    categoria: m.categoria,
    potencia: m.potencia,
    precision: m.precision,
    pp: m.pp,
  };
}

function pokemonResumenDTO(cat, p) {
  return {
    id: p.id,
    nombre: p.nombre,
    nombreMostrar: p.nombreMostrar,
    pokedex: p.pokedex,
    forma: p.forma,
    especieBaseId: p.especieBaseId,
    sprite: p.sprite,
    tipos: p.tipos.map((t) => tipoDTO(cat, t)),
    base: p.base,
    total: p.total,
    roles: p.roles,
    tieneMega: p.megas.length > 0,
  };
}

function pokemonDetalleDTO(cat, p) {
  return {
    ...pokemonResumenDTO(cat, p),
    peso: p.peso,
    altura: p.altura,
    habilidades: p.habilidades.map((h) => ({ ...cat.habilidades.get(h.id), oculta: h.oculta })),
    movimientos: [...p.movimientos]
      .map((id) => movimientoDTO(cat, id))
      .filter(Boolean)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    objetosCompatibles: p.objetos.map((id) => itemDTO(cat, id)).filter(Boolean),
    megas: p.megas.map((id) => {
      const m = cat.pokemon.get(id);
      return { ...pokemonResumenDTO(cat, m), objetoRequerido: itemDTO(cat, m.itemRequeridoId) };
    }),
    regulaciones: [...cat.regulaciones.values()].filter((r) => r.permitidos.has(p.id)).map((r) => r.codigo),
  };
}

function regulacionDTO(r) {
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    descripcion: r.descripcion,
    permiteMega: r.permiteMega,
    vigente: r.vigente,
    fechaInicio: r.fechaInicio,
    fechaFin: r.fechaFin,
    totalPermitidos: r.permitidos.size,
  };
}


async function buscarPokemon(filtros) {
  const cat = await obtener();
  const { nombre, tipo, rol, regulacion, incluirMegas, orden, dir, pagina, limite } = filtros;

  let lista = [...cat.pokemon.values()];
  if (!incluirMegas) lista = lista.filter((p) => p.forma !== "mega");

  if (nombre) {
    const q = normalizarNombrePokemon(nombre);
    lista = lista.filter((p) => p.nombre.includes(q) || normalizarNombrePokemon(p.nombreMostrar).includes(q));
  }
  if (tipo) {
    const tipoId = resolverId(cat, "tipos", tipo);
    lista = tipoId ? lista.filter((p) => p.tipos.includes(tipoId)) : [];
  }
  if (rol) lista = lista.filter((p) => p.roles.includes(rol));
  if (regulacion) {
    const regId = resolverId(cat, "regulaciones", regulacion);
    const reg = cat.regulaciones.get(regId);
    lista = reg ? lista.filter((p) => reg.permitidos.has(p.id)) : [];
  }

  const signo = dir === "desc" ? -1 : 1;
  lista.sort((a, b) => {
    if (orden === "nombre") return signo * a.nombre.localeCompare(b.nombre);
    if (orden === "pokedex") return signo * ((a.pokedex ?? 0) - (b.pokedex ?? 0) || a.id - b.id);
    const va = orden === "total" ? a.total : a.base[orden];
    const vb = orden === "total" ? b.total : b.base[orden];
    return signo * (va - vb) || a.nombre.localeCompare(b.nombre);
  });

  const total = lista.length;
  const inicio = (pagina - 1) * limite;
  return {
    data: lista.slice(inicio, inicio + limite).map((p) => pokemonResumenDTO(cat, p)),
    meta: { total, pagina, limite, paginas: Math.ceil(total / limite) },
  };
}

async function obtenerPokemon(id) {
  const cat = await obtener();
  const p = cat.pokemon.get(resolverId(cat, "pokemon", id));
  return p ? pokemonDetalleDTO(cat, p) : null;
}

async function listarTipos() {
  const cat = await obtener();
  return [...cat.tipos.values()].sort((a, b) => a.id - b.id).map(({ id, nombre, imagen }) => ({ id, nombre, imagen }));
}

async function listarNaturalezas() {
  const cat = await obtener();
  return [...cat.naturalezas.values()].sort((a, b) => a.id - b.id);
}

async function listarObjetos() {
  const cat = await obtener();
  return [...cat.items.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function listarRegulaciones() {
  const cat = await obtener();
  return [...cat.regulaciones.values()].sort((a, b) => b.id - a.id).map(regulacionDTO);
}

module.exports = {
  ROLES,
  obtener,
  invalidar,
  resolverId,
  regulacionPorDefecto,
  normalizarTexto,
  tipoDTO,
  itemDTO,
  movimientoDTO,
  pokemonResumenDTO,
  regulacionDTO,
  buscarPokemon,
  obtenerPokemon,
  listarTipos,
  listarNaturalezas,
  listarObjetos,
  listarRegulaciones,
};
