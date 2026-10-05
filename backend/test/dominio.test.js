process.env.SUPABASE_URL ||= "http://localhost";
process.env.SUPABASE_SECRET_KEY ||= "prueba";
process.env.JWT_SECRET ||= "prueba";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { multiplicador } = require("../src/domain/tipos");
const reglas = require("../src/services/reglas.service");
const recomendaciones = require("../src/services/recomendaciones.service");
const analisis = require("../src/services/analisis.service");
const formatoTexto = require("../src/services/formatoTexto.service");
const esquemas = require("../src/schemas");

function crearCatalogo() {
  const tipos = new Map(
    [[1, "Fuego"], [2, "Volador"], [3, "Agua"], [4, "Roca"], [5, "Tierra"], [6, "Dragon"]].map(([id, nombre]) => [
      id,
      { id, nombre, clave: nombre.toLowerCase() },
    ])
  );
  const movimientos = new Map(
    [
      [1, "Lanzallamas", 1, "especial"],
      [2, "Surf", 3, "especial"],
      [3, "Terremoto", 5, "fisico"],
      [4, "Protección", null, "estado"],
    ].map(([id, nombre, tipoId, categoria]) => [id, { id, nombre, tipoId, categoria }])
  );
  const items = new Map([[1, { id: 1, nombre: "Restos" }], [2, { id: 2, nombre: "Charizardita Y" }]]);
  const habilidades = new Map([[1, { id: 1, nombre: "Mar Llamas" }], [2, { id: 2, nombre: "Torrente" }]]);
  const naturalezas = new Map([[1, { id: 1, nombre: "Modesta", sube: "ate", baja: "atq" }]]);

  const pk = (id, nombre, base, tiposIds, extra = {}) => ({
    id, nombre, nombreMostrar: nombre[0].toUpperCase() + nombre.slice(1), forma: "base", especieBaseId: null,
    base, total: Object.values(base).reduce((a, b) => a + b, 0), tipos: tiposIds,
    habilidades: [{ id: 1, oculta: false }], movimientos: new Set([1, 4]), objetos: [], megas: [], ...extra,
  });
  const stats = (ps, atq, def, ate, dfe, vel) => ({ ps, atq, def, ate, dfe, vel });

  const pokemon = new Map([
    [1, pk(1, "charizard", stats(78, 84, 78, 109, 85, 100), [1, 2], { megas: [2] })],
    [2, pk(2, "charizard-mega-y", stats(78, 104, 78, 159, 115, 100), [1, 2], { forma: "mega", especieBaseId: 1, itemRequeridoId: 2 })],
    [3, pk(3, "blastoise", stats(79, 83, 100, 85, 105, 78), [3], { habilidades: [{ id: 2, oculta: false }], movimientos: new Set([2, 4]) })],
    [4, pk(4, "golem", stats(80, 120, 130, 55, 65, 45), [4, 5], { movimientos: new Set([3, 4]) })],
    [5, pk(5, "shuckle", stats(20, 10, 230, 10, 230, 5), [4])],
  ]);

  const regulaciones = new Map([[1, { id: 1, codigo: "T", nombre: "Prueba", permiteMega: true, vigente: true, permitidos: new Set([1, 2, 3, 4, 5]) }]]);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const indice = (m) => new Map([...m.values()].map((v) => [norm(v.nombre), v.id]));

  return {
    tipos, movimientos, items, habilidades, naturalezas, pokemon, regulaciones,
    indices: {
      pokemon: indice(pokemon), tipos: indice(tipos), movimientos: indice(movimientos), items: indice(items),
      habilidades: indice(habilidades), naturalezas: indice(naturalezas), regulaciones: new Map([["t", 1]]),
    },
  };
}

const equipo = (integrantes) => esquemas.equipo.parse({ nombre: "Test", formato: "individual", integrantes });

test("multiplicador de tipos combina los dos tipos del defensor", () => {
  assert.equal(multiplicador("Roca", ["Fuego", "Volador"]), 4);
  assert.equal(multiplicador("Tierra", ["Fuego", "Volador"]), 0);
  assert.equal(multiplicador("Eléctrico", ["Agua"]), 2);
  assert.equal(multiplicador("Lucha", ["Normal"]), 2);
});

test("un equipo válido no tiene errores y resuelve nombres a IDs", () => {
  const cat = crearCatalogo();
  const { errores, equipo: e } = reglas.validarEquipo(cat, equipo([
    { pokemon: "Charizard", objeto: "Charizardita Y", esMega: true, naturaleza: "modesta", movimientos: ["Lanzallamas", "Protección"] },
  ]));
  assert.deepEqual(errores, []);
  assert.equal(e.integrantes[0].pokemonId, 1);
  assert.equal(e.integrantes[0].megaFormaId, 2);
  assert.deepEqual(e.integrantes[0].movimientos, [1, 4]);
});

test("detecta especie repetida, objeto repetido, movimiento no aprendible y EVs de más", () => {
  const cat = crearCatalogo();
  const { errores } = reglas.validarEquipo(cat, equipo([
    { pokemon: "charizard", objeto: "Restos", movimientos: ["Surf"], evs: { atq: 252, def: 252, vel: 252 } },
    { pokemon: "charizard", objeto: "Restos", movimientos: ["Lanzallamas"] },
  ]));
  const campos = errores.map((e) => e.campo);
  assert.ok(campos.includes("integrantes[0].movimientos[0]"));
  assert.ok(campos.includes("integrantes[0].evs"));
  assert.ok(campos.includes("integrantes[1].pokemon"));
  assert.ok(campos.includes("integrantes[1].objeto"));
});

test("la Megaevolución exige la Megapiedra correcta", () => {
  const cat = crearCatalogo();
  const { errores } = reglas.validarEquipo(cat, equipo([
    { pokemon: "charizard", objeto: "Restos", esMega: true, movimientos: ["Lanzallamas"] },
  ]));
  assert.match(errores[0].mensaje, /Charizardita Y/);
});

test("rechaza Pokémon fuera de la regulación", () => {
  const cat = crearCatalogo();
  cat.regulaciones.get(1).permitidos.delete(4);
  const { errores } = reglas.validarEquipo(cat, equipo([{ pokemon: "golem", movimientos: ["Terremoto"] }]));
  assert.match(errores[0].mensaje, /no está permitido/);
});

test("recomienda según la estadística con menor promedio y excluye especies del equipo", () => {
  const cat = crearCatalogo();
  const { equipo: e } = reglas.validarEquipo(cat, equipo([{ pokemon: "golem", movimientos: ["Terremoto"] }]));
  const r = recomendaciones.recomendar(cat, { integrantes: e.integrantes, regulacionId: 1 });
  assert.equal(r.estadistica.clave, "vel");
  assert.equal(r.sugerencias[0].pokemon.nombre, "charizard");
  assert.ok(r.sugerencias.every((s) => s.pokemon.nombre !== "golem" && s.pokemon.forma !== "mega"));

  const manual = recomendaciones.recomendar(cat, { integrantes: e.integrantes, regulacionId: 1 }, "dfe");
  assert.equal(manual.sugerencias[0].pokemon.nombre, "shuckle");
  assert.equal(manual.eleccion, "manual");
});

test("el análisis alerta debilidades compartidas", () => {
  const cat = crearCatalogo();
  const { equipo: e } = reglas.validarEquipo(cat, equipo([
    { pokemon: "charizard", movimientos: ["Lanzallamas"] },
    { pokemon: "golem", movimientos: ["Terremoto"] },
  ]));
  const a = analisis.analizar(cat, e.integrantes);
  const agua = a.defensa.find((f) => f.tipo === "Agua");
  assert.deepEqual(agua.debiles.sort(), ["Charizard", "Golem"]);
  assert.ok(a.alertas.some((x) => x.mensaje === "2 integrantes son débiles a Agua."));
});

test("importa el formato de texto de la comunidad", () => {
  const texto = [
    "=== [doble] Mi equipo ===",
    "",
    "Fuego (Charizard) (M) @ Charizardita Y",
    "Ability: Mar Llamas",
    "Level: 50",
    "EVs: 4 HP / 252 SpA / 252 Spe",
    "Modesta Nature",
    "IVs: 0 Atk",
    "- Lanzallamas",
    "- Protección",
  ].join("\r\n");
  const r = formatoTexto.importar(texto);
  assert.equal(r.nombre, "Mi equipo");
  assert.equal(r.formato, "doble");
  const [i] = r.integrantes;
  assert.equal(i.apodo, "Fuego");
  assert.equal(i.pokemon, "Charizard");
  assert.equal(i.objeto, "Charizardita Y");
  assert.equal(i.evs.ate, 252);
  assert.equal(i.ivs.atq, 0);
  assert.equal(i.naturaleza, "Modesta");
  assert.deepEqual(i.movimientos, ["Lanzallamas", "Protección"]);
});
