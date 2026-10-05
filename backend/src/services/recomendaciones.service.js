const catalogo = require("./catalogo.service");
const { claveEspecie } = require("./reglas.service");
const { STATS, NOMBRES_STATS } = require("../domain/estadisticas");
const { errores } = require("../utils/errores");

const MAX_SUGERENCIAS = 5;
const TAMANO_EQUIPO = 6;

const redondear = (n) => Math.round(n * 10) / 10;

function promedios(cat, integrantes) {
  return Object.fromEntries(
    STATS.map((s) => [
      s,
      redondear(integrantes.reduce((suma, i) => suma + cat.pokemon.get(i.pokemonId).base[s], 0) / integrantes.length),
    ])
  );
}

function statMasBaja(prom) {
  return STATS.reduce((menor, s) => (prom[s] < prom[menor] ? s : menor), STATS[0]);
}

function recomendar(cat, { integrantes, regulacionId }, statElegida) {
  if (integrantes.length === 0) {
    throw errores.validacion("Agrega al menos un Pokémon al equipo para recibir recomendaciones.");
  }
  const regulacion = cat.regulaciones.get(regulacionId) || catalogo.regulacionPorDefecto(cat);
  if (!regulacion) throw errores.validacion("El equipo no tiene una regulación válida.");

  const prom = promedios(cat, integrantes);
  const stat = statElegida || statMasBaja(prom);
  const nombreStat = NOMBRES_STATS[stat];
  const promedio = prom[stat];

  const especiesEnEquipo = new Set(integrantes.map((i) => claveEspecie(cat.pokemon.get(i.pokemonId))));

  const candidatos = [...regulacion.permitidos]
    .map((id) => cat.pokemon.get(id))
    .filter((p) => p && p.forma !== "mega" && !especiesEnEquipo.has(claveEspecie(p)))
    .sort((a, b) => b.base[stat] - a.base[stat] || b.total - a.total)
    .slice(0, MAX_SUGERENCIAS);

  const lleno = integrantes.length >= TAMANO_EQUIPO;
  let reemplazar = null;
  if (lleno) {
    const peor = integrantes
      .map((i, indice) => ({ i, indice, p: cat.pokemon.get(i.pokemonId) }))
      .sort((a, b) => a.p.base[stat] - b.p.base[stat])[0];
    reemplazar = {
      posicion: peor.i.posicion ?? peor.indice + 1,
      pokemon: catalogo.pokemonResumenDTO(cat, peor.p),
      apodo: peor.i.apodo ?? null,
      valor: peor.p.base[stat],
    };
  }

  return {
    estadistica: { clave: stat, nombre: nombreStat },
    eleccion: statElegida ? "manual" : "automatica",
    promedioEquipo: promedio,
    promedios: prom,
    regulacion: { id: regulacion.id, codigo: regulacion.codigo, nombre: regulacion.nombre },
    accion: lleno ? "reemplazar" : "agregar",
    reemplazar,
    sugerencias: candidatos.map((p) => ({
      pokemon: catalogo.pokemonResumenDTO(cat, p),
      valor: p.base[stat],
      motivo: `${nombreStat} base ${p.base[stat]}; tu equipo promedia ${promedio} en ${nombreStat}.`,
    })),
  };
}

module.exports = { recomendar, promedios, statMasBaja };
