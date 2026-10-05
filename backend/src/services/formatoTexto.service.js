const { STATS, ABREVIATURA_TXT, IV_MAX } = require("../domain/estadisticas");

function especieTxt(slug) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

function lineaStats(valores, omitir) {
  return STATS.filter((s) => valores[s] !== omitir)
    .map((s) => `${valores[s]} ${ABREVIATURA_TXT[s]}`)
    .join(" / ");
}

function exportar(equipo) {
  const bloques = equipo.integrantes.map((i) => {
    const especie = especieTxt(i.pokemon.nombre);
    let cabecera = i.apodo && i.apodo !== i.pokemon.nombreMostrar ? `${i.apodo} (${especie})` : especie;
    if (i.objeto) cabecera += ` @ ${i.objeto.nombre}`;

    const lineas = [cabecera];
    if (i.habilidad) lineas.push(`Ability: ${i.habilidad.nombre}`);
    lineas.push(`Level: ${i.nivel}`);
    const evs = lineaStats(i.evs, 0);
    if (evs) lineas.push(`EVs: ${evs}`);
    if (i.naturaleza) lineas.push(`${i.naturaleza.nombre} Nature`);
    const ivs = lineaStats(i.ivs, IV_MAX);
    if (ivs) lineas.push(`IVs: ${ivs}`);
    for (const m of i.movimientos) lineas.push(`- ${m.nombre}`);
    return lineas.join("\n");
  });

  return `=== [${equipo.formato}] ${equipo.nombre} ===\n\n${bloques.join("\n\n")}\n`;
}


const ALIAS_TXT = {
  hp: "ps", ps: "ps",
  atk: "atq", atq: "atq",
  def: "def",
  spa: "ate", ate: "ate", "at.esp": "ate", ataesp: "ate",
  spd: "dfe", dfe: "dfe", "def.esp": "dfe", defesp: "dfe",
  spe: "vel", vel: "vel",
};

function parsearStats(texto, porDefecto) {
  const valores = Object.fromEntries(STATS.map((s) => [s, porDefecto]));
  for (const parte of texto.split("/")) {
    const m = parte.trim().match(/^(\d+)\s+(.+)$/);
    if (!m) continue;
    const clave = ALIAS_TXT[m[2].trim().toLowerCase().replace(/\s+/g, "")];
    if (clave) valores[clave] = Number(m[1]);
  }
  return valores;
}

function parsearCabecera(linea) {
  let resto = linea.trim();
  let objeto = null;
  const arroba = resto.lastIndexOf(" @ ");
  if (arroba !== -1) {
    objeto = resto.slice(arroba + 3).trim();
    resto = resto.slice(0, arroba).trim();
  }
  resto = resto.replace(/\s+\((M|F)\)$/i, "");
  const conApodo = resto.match(/^(.*\S)\s+\(([^()]+)\)$/);
  if (conApodo) return { apodo: conApodo[1], especie: conApodo[2], objeto };
  return { apodo: null, especie: resto, objeto };
}

function importar(texto) {
  const lineas = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  let nombre = null;
  let formato = null;
  const bloques = [];
  let actual = null;

  for (const cruda of lineas) {
    const linea = cruda.trim();
    const titulo = linea.match(/^===\s*(?:\[([^\]]*)\])?\s*(.*?)\s*===$/);
    if (titulo) {
      formato = titulo[1] || formato;
      nombre = titulo[2] || nombre;
      continue;
    }
    if (!linea) {
      actual = null;
      continue;
    }
    if (!actual) {
      actual = { ...parsearCabecera(linea), lineas: [] };
      bloques.push(actual);
      continue;
    }
    actual.lineas.push(linea);
  }

  const integrantes = bloques.map((b) => {
    const i = {
      pokemon: b.especie,
      apodo: b.apodo,
      objeto: b.objeto,
      habilidad: null,
      naturaleza: null,
      movimientos: [],
      evs: parsearStats("", 0),
      ivs: parsearStats("", IV_MAX),
      nivel: 50,
      esMega: false,
    };
    for (const l of b.lineas) {
      let m;
      if ((m = l.match(/^(?:Ability|Habilidad)\s*:\s*(.+)$/i))) i.habilidad = m[1].trim();
      else if ((m = l.match(/^(?:Level|Nivel)\s*:\s*(\d+)$/i))) i.nivel = Math.min(100, Math.max(1, Number(m[1])));
      else if ((m = l.match(/^EVs\s*:\s*(.+)$/i))) i.evs = parsearStats(m[1], 0);
      else if ((m = l.match(/^IVs\s*:\s*(.+)$/i))) i.ivs = parsearStats(m[1], IV_MAX);
      else if ((m = l.match(/^(.+?)\s+Nature$/i)) || (m = l.match(/^Naturaleza\s*:\s*(.+)$/i))) i.naturaleza = m[1].trim();
      else if ((m = l.match(/^[-~]\s*(.+)$/))) i.movimientos.push(m[1].trim());
      else if ((m = l.match(/^Mega\s*:\s*(s[ií]|yes|true)$/i))) i.esMega = true;
    }
    return i;
  });

  return { nombre, formato, integrantes };
}

module.exports = { exportar, importar };
