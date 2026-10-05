const catalogo = require("./catalogo.service");
const { STATS, EV_MAX_TOTAL } = require("../domain/estadisticas");

function claveEspecie(p) {
  return p.especieBaseId ?? p.id;
}

function validarEquipo(cat, datos) {
  const errores = [];
  const error = (campo, mensaje) => errores.push({ campo, mensaje });

  let regulacion;
  if (datos.regulacion !== undefined) {
    regulacion = cat.regulaciones.get(catalogo.resolverId(cat, "regulaciones", datos.regulacion));
    if (!regulacion) error("regulacion", `La regulación "${datos.regulacion}" no existe.`);
  } else {
    regulacion = catalogo.regulacionPorDefecto(cat);
    if (!regulacion) error("regulacion", "No hay ninguna regulación vigente configurada.");
  }

  if (datos.integrantes.length === 0) error("integrantes", "Agrega al menos un Pokémon.");

  const especies = new Map();
  const objetos = new Map();
  const integrantes = [];
  let megas = 0;

  datos.integrantes.forEach((entrada, i) => {
    const campo = (c) => `integrantes[${i}].${c}`;
    const pokemonId = catalogo.resolverId(cat, "pokemon", entrada.pokemon);
    const pokemon = cat.pokemon.get(pokemonId);

    if (!pokemon) {
      error(campo("pokemon"), `El Pokémon "${entrada.pokemon}" no existe en el catálogo.`);
      return;
    }
    const nombre = entrada.apodo || pokemon.nombreMostrar;

    if (pokemon.forma === "mega") {
      error(campo("pokemon"), `${pokemon.nombreMostrar} es una Megaevolución: elige la forma base y marca "Megaevolución".`);
    }
    if (regulacion && !regulacion.permitidos.has(pokemon.id)) {
      error(campo("pokemon"), `${pokemon.nombreMostrar} no está permitido en ${regulacion.nombre}.`);
    }

    const especie = claveEspecie(pokemon);
    if (especies.has(especie)) {
      error(campo("pokemon"), `Especie repetida: ${pokemon.nombreMostrar} ya está en la posición ${especies.get(especie) + 1}.`);
    } else {
      especies.set(especie, i);
    }

    let habilidadId = pokemon.habilidades.find((h) => !h.oculta)?.id ?? pokemon.habilidades[0]?.id ?? null;
    if (entrada.habilidad !== undefined && entrada.habilidad !== null) {
      habilidadId = catalogo.resolverId(cat, "habilidades", entrada.habilidad);
      if (!habilidadId) {
        error(campo("habilidad"), `La habilidad "${entrada.habilidad}" no existe.`);
      } else if (!pokemon.habilidades.some((h) => h.id === habilidadId)) {
        error(campo("habilidad"), `${pokemon.nombreMostrar} no puede tener la habilidad ${cat.habilidades.get(habilidadId).nombre}.`);
      }
    }

    let itemId = null;
    if (entrada.objeto !== undefined && entrada.objeto !== null) {
      itemId = catalogo.resolverId(cat, "items", entrada.objeto);
      if (!itemId) {
        error(campo("objeto"), `El objeto "${entrada.objeto}" no existe.`);
      } else if (objetos.has(itemId)) {
        error(campo("objeto"), `El objeto ${cat.items.get(itemId).nombre} está repetido (también lo lleva la posición ${objetos.get(itemId) + 1}).`);
      } else {
        objetos.set(itemId, i);
      }
    }

    let naturalezaId = null;
    if (entrada.naturaleza !== undefined && entrada.naturaleza !== null) {
      naturalezaId = catalogo.resolverId(cat, "naturalezas", entrada.naturaleza);
      if (!naturalezaId) error(campo("naturaleza"), `La naturaleza "${entrada.naturaleza}" no existe.`);
    }

    const movimientos = [];
    const pedidos = entrada.movimientos.filter((m) => m !== undefined && m !== null);
    if (pedidos.length === 0) error(campo("movimientos"), `${nombre} necesita al menos un movimiento.`);
    pedidos.forEach((m, j) => {
      const movId = catalogo.resolverId(cat, "movimientos", m);
      if (!movId) {
        error(`${campo("movimientos")}[${j}]`, `El movimiento "${m}" no existe.`);
      } else if (!pokemon.movimientos.has(movId)) {
        error(`${campo("movimientos")}[${j}]`, `${pokemon.nombreMostrar} no puede aprender ${cat.movimientos.get(movId).nombre}.`);
      } else if (movimientos.includes(movId)) {
        error(`${campo("movimientos")}[${j}]`, `${cat.movimientos.get(movId).nombre} está repetido.`);
      } else {
        movimientos.push(movId);
      }
    });

    const totalEvs = STATS.reduce((suma, s) => suma + entrada.evs[s], 0);
    if (totalEvs > EV_MAX_TOTAL) {
      error(campo("evs"), `${nombre} tiene ${totalEvs} EVs; el máximo total es ${EV_MAX_TOTAL}.`);
    }

    let megaFormaId = null;
    if (entrada.esMega) {
      megas += 1;
      if (regulacion && !regulacion.permiteMega) {
        error(campo("esMega"), `${regulacion.nombre} no permite Megaevoluciones.`);
      } else if (pokemon.megas.length === 0) {
        error(campo("esMega"), `${pokemon.nombreMostrar} no tiene Megaevolución.`);
      } else {
        const mega = pokemon.megas.map((id) => cat.pokemon.get(id)).find((m) => m.itemRequeridoId === itemId);
        if (!mega) {
          const piedras = pokemon.megas.map((id) => cat.items.get(cat.pokemon.get(id).itemRequeridoId)?.nombre).filter(Boolean);
          error(campo("objeto"), `Para megaevolucionar, ${nombre} debe llevar ${piedras.join(" o ")}.`);
        } else if (regulacion && !regulacion.permitidos.has(mega.id)) {
          error(campo("esMega"), `${mega.nombreMostrar} no está permitida en ${regulacion.nombre}.`);
        } else {
          megaFormaId = mega.id;
        }
      }
    }

    integrantes.push({
      pokemonId: pokemon.id,
      apodo: entrada.apodo ?? null,
      habilidadId,
      itemId,
      naturalezaId,
      movimientos,
      evs: entrada.evs,
      ivs: entrada.ivs,
      nivel: entrada.nivel,
      esMega: Boolean(entrada.esMega),
      megaFormaId,
    });
  });

  if (megas > 1) error("integrantes", `Solo un integrante puede llevar la Megaevolución (marcaste ${megas}).`);

  return {
    errores,
    equipo: {
      nombre: datos.nombre,
      formato: datos.formato,
      regulacionId: regulacion?.id ?? null,
      descripcion: datos.descripcion ?? null,
      arquetipo: datos.arquetipo ?? null,
      integrantes,
    },
  };
}

module.exports = { validarEquipo, claveEspecie };
