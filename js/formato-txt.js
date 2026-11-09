// Código del archivo .txt del equipo (formato Pokémon Showdown).
// Es el mismo formato que usa el backend (formatoTexto.service.js), así que el archivo
// también se puede importar con POST /api/teams/import.
const ABREVIATURA_TXT = { ps: "HP", atq: "Atk", def: "Def", ate: "SpA", dfe: "SpD", vel: "Spe" };
const ALIAS_TXT = {
  hp: "ps", ps: "ps", atk: "atq", atq: "atq", def: "def",
  spa: "ate", ate: "ate", spd: "dfe", dfe: "dfe", spe: "vel", vel: "vel"
};
const IV_MAX = 31;
const FORMATO_TXT = { "Combate Individual": "individual", "Combate Doble": "doble" };
const FORMATO_SELECT = { individual: "Combate Individual", doble: "Combate Doble" };

// "charizard-mega-y" -> "Charizard-Mega-Y"
const especieTxt = slug => slug.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("-");

const lineaStats = (valores, omitir) => Object.keys(ABREVIATURA_TXT)
  .filter(s => valores[s] !== omitir)
  .map(s => `${valores[s]} ${ABREVIATURA_TXT[s]}`)
  .join(" / ");

// Equipo armado en la página -> texto
function exportarTxt({ nombre, formato, integrantes }) {
  const bloques = integrantes.map(i => {
    const especie = especieTxt(i.pokemon.slug);
    let cabecera = i.apodo ? `${i.apodo} (${especie})` : especie;
    if (i.objeto && i.objeto !== "Ninguno") cabecera += ` @ ${i.objeto}`;

    const lineas = [cabecera];
    if (i.habilidad) lineas.push(`Ability: ${i.habilidad}`);
    lineas.push(`Level: ${i.nivel || NIVEL}`);
    const evs = lineaStats(i.evs, 0);
    if (evs) lineas.push(`EVs: ${evs}`);
    if (i.naturaleza) lineas.push(`${i.naturaleza} Nature`);
    const ivs = lineaStats({ ps: 31, atq: 31, def: 31, ate: 31, dfe: 31, vel: 31, ...i.ivs }, IV_MAX);
    if (ivs) lineas.push(`IVs: ${ivs}`);
    i.movimientos.filter(m => m).forEach(m => lineas.push(`- ${m}`));
    return lineas.join("\n");
  });
  return `=== [${FORMATO_TXT[formato] || "individual"}] ${nombre} ===\n\n${bloques.join("\n\n")}\n`;
}

// Error al leer el archivo: tipo "formato" (no es un equipo) o "compatibilidad" (algo no existe en la BD)
class ErrorTxt extends Error {
  constructor(tipo, detalles) {
    super(tipo === "formato" ? "Formato no válido" : "Equipo no compatible");
    this.tipo = tipo;
    this.detalles = detalles;
  }
}

function parsearStats(texto, porDefecto) {
  const valores = { ps: porDefecto, atq: porDefecto, def: porDefecto, ate: porDefecto, dfe: porDefecto, vel: porDefecto };
  for (const parte of texto.split("/").filter(x => x.trim())) {
    const m = parte.trim().match(/^(\d{1,3})\s+(.+)$/);
    const clave = m && ALIAS_TXT[m[2].trim().toLowerCase()];
    if (!clave) return null;
    valores[clave] = Number(m[1]);
  }
  return valores;
}

function parsearCabecera(linea) {
  let resto = linea;
  let objeto = null;
  const arroba = resto.lastIndexOf(" @ ");
  if (arroba !== -1) {
    objeto = resto.slice(arroba + 3).trim();
    resto = resto.slice(0, arroba).trim();
  }
  resto = resto.replace(/\s+\((M|F)\)$/i, "");
  const conApodo = resto.match(/^(.*\S)\s+\(([^()]+)\)$/);
  return conApodo ? { apodo: conApodo[1], especie: conApodo[2], objeto } : { apodo: "", especie: resto, objeto };
}

// Texto -> datos sin comprobar contra la BD. Lanza ErrorTxt("formato") si no tiene forma de equipo.
function leerTxt(texto) {
  const lineas = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  let nombre = "";
  let formato = "individual";
  const bloques = [];
  const malas = [];
  let actual = null;

  lineas.forEach((cruda, n) => {
    const linea = cruda.trim();
    const titulo = linea.match(/^===\s*(?:\[([^\]]*)\])?\s*(.*?)\s*===$/);
    if (titulo) {
      formato = titulo[1] || formato;
      nombre = titulo[2] || nombre;
      actual = null;
      return;
    }
    if (!linea) { actual = null; return; }
    if (!actual) {
      if (/^[-~]|:/.test(linea)) return malas.push(`Línea ${n + 1}: se esperaba "Pokémon @ Objeto" y dice «${linea.slice(0, 60)}»`);
      actual = { ...parsearCabecera(linea), habilidad: "", naturaleza: "", movimientos: [], nivel: NIVEL,
        evs: parsearStats("", 0), ivs: parsearStats("", IV_MAX), datos: 0 };
      return bloques.push(actual);
    }
    let m;
    actual.datos++;
    if ((m = linea.match(/^Ability\s*:\s*(.+)$/i))) actual.habilidad = m[1].trim();
    else if ((m = linea.match(/^Level\s*:\s*(\d{1,3})$/i))) actual.nivel = Number(m[1]);
    else if ((m = linea.match(/^EVs\s*:\s*(.+)$/i)) && parsearStats(m[1], 0)) actual.evs = parsearStats(m[1], 0);
    else if ((m = linea.match(/^IVs\s*:\s*(.+)$/i)) && parsearStats(m[1], IV_MAX)) actual.ivs = parsearStats(m[1], IV_MAX);
    else if ((m = linea.match(/^(.+?)\s+Nature$/i))) actual.naturaleza = m[1].trim();
    else if ((m = linea.match(/^-\s*(.+)$/))) actual.movimientos.push(m[1].trim());
    else if (!/^(Shiny|Tera Type|Happiness|Gigantamax|Dynamax Level|Pokeball)\s*:/i.test(linea)) {
      malas.push(`Línea ${n + 1}: no se reconoce «${linea.slice(0, 60)}»`);
    }
  });

  bloques.filter(b => b.datos === 0).forEach(b => malas.push(`«${b.especie}» no tiene habilidad, naturaleza ni movimientos.`));
  if (!bloques.length) malas.push("El archivo no contiene ningún Pokémon.");
  if (malas.length) throw new ErrorTxt("formato", malas);
  return { nombre, formato: FORMATO_SELECT[formato] || "Combate Individual", bloques };
}

// Compara cada nombre con el catálogo de la BD (sin distinguir mayúsculas, tildes, espacios ni guiones)
const claveTxt = texto => normalizar(texto).replace(/[\s_\-.'’:]+/g, "");
const buscarEn = (lista, nombre) => lista.find(x => claveTxt(x) === claveTxt(nombre));
const buscarEspecie = especie => POKEMONES.find(p => claveTxt(p.slug) === claveTxt(especie) || claveTxt(p.nombre) === claveTxt(especie));

// Devuelve los integrantes listos para el editor, o lanza ErrorTxt("compatibilidad") con todo lo que no existe
async function resolverTxt({ bloques }, cargarMovimientos) {
  const fallos = [];
  if (bloques.length > 6) fallos.push(`El equipo tiene ${bloques.length} Pokémon; el máximo es 6.`);

  const integrantes = [];
  for (const b of bloques.slice(0, 6)) {
    const quien = b.especie;
    const pokemon = buscarEspecie(b.especie);
    if (!pokemon) { fallos.push(`Pokémon no encontrado: ${quien}`); continue; }
    try {
      await cargarMovimientos(pokemon);
    } catch (error) {
      fallos.push(`No se pudieron cargar los datos de ${quien}: ${error.message}`);
      continue;
    }

    const habilidades = [...pokemon.habilidades, pokemon.oculta].filter(Boolean);
    const habilidad = b.habilidad ? buscarEn(habilidades, b.habilidad) : habilidades[0];
    if (b.habilidad && !habilidad) fallos.push(`Habilidad no encontrada: ${b.habilidad} (${quien})`);

    const objeto = b.objeto ? buscarEn(OBJETOS, b.objeto) : "Ninguno";
    if (b.objeto && !objeto) fallos.push(`Objeto no encontrado: ${b.objeto} (${quien})`);

    const naturaleza = b.naturaleza ? buscarEn(NATURALEZAS.map(n => n.nombre), b.naturaleza) : naturalezaPorDefecto();
    if (b.naturaleza && !naturaleza) fallos.push(`Naturaleza no encontrada: ${b.naturaleza} (${quien})`);

    if (b.movimientos.length > 4) fallos.push(`Tiene ${b.movimientos.length} movimientos; el máximo es 4 (${quien})`);
    const movimientos = b.movimientos.slice(0, 4).map(m => {
      const encontrado = buscarEn(pokemon.movimientos, m);
      if (!encontrado) fallos.push(`Movimiento no encontrado: ${m} (${quien})`);
      return encontrado || "";
    });

    const totalEvs = Object.values(b.evs).reduce((a, x) => a + x, 0);
    if (Object.values(b.evs).some(x => x > EV_MAX_STAT) || totalEvs > EV_MAX_TOTAL) {
      fallos.push(`EVs fuera de rango: máximo ${EV_MAX_STAT} por estadística y ${EV_MAX_TOTAL} en total (${quien})`);
    }
    if (Object.values(b.ivs).some(x => x > IV_MAX)) fallos.push(`IVs fuera de rango: máximo ${IV_MAX} (${quien})`);
    if (b.nivel < 1 || b.nivel > 100) fallos.push(`Nivel fuera de rango: ${b.nivel} (${quien})`);

    integrantes.push({
      pokemon,
      apodo: (b.apodo || "").slice(0, 12),
      habilidad: habilidad || "",
      objeto: objeto || "Ninguno",
      naturaleza: naturaleza || naturalezaPorDefecto(),
      movimientos: [...movimientos, "", "", "", ""].slice(0, 4),
      evs: b.evs,
      ivs: b.ivs,
      nivel: b.nivel
    });
  }

  if (fallos.length) throw new ErrorTxt("compatibilidad", fallos);
  return integrantes;
}
