const { CLAVES_TIPOS, multiplicador } = require("../domain/tipos");

function etiqueta(m) {
  if (m === 0) return "inmune";
  if (m < 1) return "resiste";
  if (m > 1) return "debil";
  return "neutro";
}

function analizar(cat, integrantes) {
  const tiposPorClave = new Map([...cat.tipos.values()].map((t) => [t.clave, t]));
  const nombreTipo = (clave) => tiposPorClave.get(clave)?.nombre || clave;

  const miembros = integrantes.map((i) => {
    const base = cat.pokemon.get(i.pokemonId);
    const forma = i.megaFormaId ? cat.pokemon.get(i.megaFormaId) : base;
    return {
      nombre: i.apodo || forma.nombreMostrar,
      tipos: forma.tipos.map((t) => cat.tipos.get(t)?.clave),
      movimientos: i.movimientos.map((id) => cat.movimientos.get(id)).filter(Boolean),
    };
  });

  const defensa = CLAVES_TIPOS.map((atacante) => {
    const fila = { tipo: nombreTipo(atacante), debiles: [], resisten: [], inmunes: [], multiplicadores: [] };
    for (const m of miembros) {
      const x = multiplicador(atacante, m.tipos);
      fila.multiplicadores.push({ integrante: m.nombre, multiplicador: x, efecto: etiqueta(x) });
      if (x === 0) fila.inmunes.push(m.nombre);
      else if (x < 1) fila.resisten.push(m.nombre);
      else if (x > 1) fila.debiles.push(m.nombre);
    }
    fila.balance = fila.resisten.length + fila.inmunes.length - fila.debiles.length;
    return fila;
  });

  const ofensivos = miembros.flatMap((m) =>
    m.movimientos.filter((mov) => mov.categoria !== "estado" && mov.tipoId).map((mov) => ({ ...mov, de: m.nombre }))
  );

  const ataque = CLAVES_TIPOS.map((defensor) => {
    let mejor = 0;
    const superEficaces = [];
    for (const mov of ofensivos) {
      const x = multiplicador(cat.tipos.get(mov.tipoId)?.clave, [defensor]);
      mejor = Math.max(mejor, x);
      if (x > 1) superEficaces.push(`${mov.nombre} (${mov.de})`);
    }
    return { tipo: nombreTipo(defensor), mejorMultiplicador: ofensivos.length ? mejor : null, superEficaces };
  });

  const alertas = [];
  const umbral = Math.max(2, Math.ceil(miembros.length / 2));

  for (const fila of defensa) {
    if (fila.debiles.length >= umbral) {
      alertas.push({
        nivel: "peligro",
        mensaje: `${fila.debiles.length} integrantes son débiles a ${fila.tipo}.`,
      });
    } else if (fila.debiles.length >= 2 && fila.resisten.length + fila.inmunes.length === 0) {
      alertas.push({ nivel: "aviso", mensaje: `Nadie en tu equipo resiste ${fila.tipo} y ${fila.debiles.length} integrantes son débiles.` });
    }
  }

  if (miembros.length > 0 && ofensivos.length === 0) {
    alertas.push({ nivel: "aviso", mensaje: "Tu equipo no tiene movimientos de ataque: no se puede calcular la cobertura." });
  } else if (ofensivos.length > 0) {
    const sinCobertura = ataque.filter((a) => a.superEficaces.length === 0).map((a) => a.tipo);
    if (sinCobertura.length > 0 && sinCobertura.length <= 4) {
      for (const tipo of sinCobertura) alertas.push({ nivel: "info", mensaje: `Ningún movimiento es súper eficaz contra ${tipo}.` });
    } else if (sinCobertura.length > 4) {
      alertas.push({ nivel: "info", mensaje: `Ningún movimiento es súper eficaz contra: ${sinCobertura.join(", ")}.` });
    }
    for (const a of ataque.filter((x) => x.mejorMultiplicador !== null && x.mejorMultiplicador < 1)) {
      alertas.push({ nivel: "aviso", mensaje: `Ningún ataque de tu equipo golpea con normalidad a ${a.tipo} (todos son poco eficaces o no le afectan).` });
    }
  }

  const peor = [...defensa].sort((a, b) => b.debiles.length - a.debiles.length || a.balance - b.balance)[0];

  return {
    integrantes: miembros.map(({ nombre, tipos }) => ({ nombre, tipos: tipos.map(nombreTipo) })),
    defensa,
    ataque,
    resumen: {
      debilidadPrincipal: peor && peor.debiles.length > 0 ? { tipo: peor.tipo, debiles: peor.debiles.length } : null,
      tiposCubiertos: ataque.filter((a) => a.superEficaces.length > 0).length,
      tiposSinCobertura: ataque.filter((a) => a.superEficaces.length === 0).map((a) => a.tipo),
    },
    alertas,
    nota: "El análisis usa los tipos de cada integrante (o de su Megaevolución) y no considera habilidades ni objetos.",
  };
}

module.exports = { analizar };
