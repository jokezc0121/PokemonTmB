const catalogo = require("./catalogo.service");
const { STATS } = require("../domain/estadisticas");

function calcularStat(clave, base, ev, iv, nivel, naturaleza) {
  const parte = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * nivel) / 100);
  if (clave === "ps") return parte + nivel + 10;
  let multiplicador = 1;
  if (naturaleza?.sube === clave) multiplicador = 1.1;
  if (naturaleza?.baja === clave) multiplicador = 0.9;
  return Math.floor((parte + 5) * multiplicador);
}

function integranteDTO(cat, i, posicion) {
  const pokemon = cat.pokemon.get(i.pokemonId);
  const naturaleza = i.naturalezaId ? cat.naturalezas.get(i.naturalezaId) : null;
  const mega = i.megaFormaId ? cat.pokemon.get(i.megaFormaId) : null;
  const habilidad = i.habilidadId ? cat.habilidades.get(i.habilidadId) : null;

  return {
    posicion,
    pokemon: catalogo.pokemonResumenDTO(cat, pokemon),
    apodo: i.apodo,
    habilidad: habilidad ? { id: habilidad.id, nombre: habilidad.nombre } : null,
    objeto: catalogo.itemDTO(cat, i.itemId),
    naturaleza: naturaleza ? { id: naturaleza.id, nombre: naturaleza.nombre, sube: naturaleza.sube, baja: naturaleza.baja } : null,
    movimientos: i.movimientos.map((id) => catalogo.movimientoDTO(cat, id)).filter(Boolean),
    evs: i.evs,
    ivs: i.ivs,
    nivel: i.nivel,
    esMega: i.esMega,
    megaForma: mega ? catalogo.pokemonResumenDTO(cat, mega) : null,
    estadisticas: Object.fromEntries(
      STATS.map((s) => [s, calcularStat(s, pokemon.base[s], i.evs[s], i.ivs[s], i.nivel, naturaleza)])
    ),
  };
}

function megaFormaDe(cat, pokemonId, itemId) {
  const p = cat.pokemon.get(pokemonId);
  return p?.megas.find((id) => cat.pokemon.get(id).itemRequeridoId === itemId) ?? null;
}

function integranteDesdeFila(cat, fila) {
  const evs = { ps: fila.ev_hp, atq: fila.ev_attack, def: fila.ev_defense, ate: fila.ev_sp_attack, dfe: fila.ev_sp_defense, vel: fila.ev_speed };
  const ivs = { ps: fila.iv_hp, atq: fila.iv_attack, def: fila.iv_defense, ate: fila.iv_sp_attack, dfe: fila.iv_sp_defense, vel: fila.iv_speed };
  return {
    id: fila.id,
    posicion: fila.posicion,
    pokemonId: fila.pokemon_id,
    apodo: fila.apodo,
    habilidadId: fila.habilidad_id,
    itemId: fila.item_id,
    naturalezaId: fila.naturaleza_id,
    movimientos: (fila.pokemon_equipo_movimientos || []).sort((a, b) => a.slot - b.slot).map((m) => m.movimiento_id),
    evs,
    ivs,
    nivel: fila.nivel,
    esMega: fila.es_mega,
    megaFormaId: fila.es_mega ? megaFormaDe(cat, fila.pokemon_id, fila.item_id) : null,
  };
}

function entradaDesdeIntegrante(i) {
  return {
    pokemon: i.pokemonId,
    apodo: i.apodo,
    habilidad: i.habilidadId,
    objeto: i.itemId,
    naturaleza: i.naturalezaId,
    movimientos: i.movimientos,
    evs: i.evs,
    ivs: i.ivs,
    nivel: i.nivel,
    esMega: i.esMega,
  };
}

function entradaDesdeDTO(i) {
  return {
    pokemon: i.pokemon.id,
    apodo: i.apodo,
    habilidad: i.habilidad?.id ?? null,
    objeto: i.objeto?.id ?? null,
    naturaleza: i.naturaleza?.id ?? null,
    movimientos: i.movimientos.map((m) => m.id),
    evs: i.evs,
    ivs: i.ivs,
    nivel: i.nivel,
    esMega: i.esMega,
  };
}

module.exports = { calcularStat, integranteDTO, integranteDesdeFila, entradaDesdeIntegrante, entradaDesdeDTO, megaFormaDe };
