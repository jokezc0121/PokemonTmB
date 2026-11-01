const supabase = require("../src/config/supabase");
const authService = require("../src/services/auth.service");
const equipos = require("../src/services/equipos.service");
const esquemas = require("../src/schemas");

const DEMO = { nombreEntrenador: "Entrenador Demo", correo: "demo@pokemontb.com", contrasena: "Demo12345" };

const EQUIPOS = [
  {
    nombre: "Sol con Mega Charizard Y",
    formato: "doble",
    descripcion: "Mega Charizard Y activa el sol con Sequía; Incineroar da apoyo con Sorpresa y Mofa.",
    arquetipo: "Sol",
    integrantes: [
      { pokemon: "charizard", objeto: "Charizardita Y", esMega: true, naturaleza: "Modesta",
        movimientos: ["Lanzallamas", "Onda Ígnea", "Protección"], evs: { ate: 252, vel: 252, ps: 4 } },
      { pokemon: "garchomp", naturaleza: "Alegre", movimientos: ["Terremoto", "Garra Dragón", "Protección"],
        evs: { atq: 252, vel: 252, ps: 4 } },
      { pokemon: "incineroar", naturaleza: "Cauta", movimientos: ["Sorpresa", "Envite Ígneo", "Mofa", "Protección"],
        evs: { ps: 252, dfe: 252, def: 4 } },
    ],
  },
  {
    nombre: "Equilibrado individual",
    formato: "individual",
    integrantes: [
      { pokemon: "gengar", naturaleza: "Miedosa", movimientos: ["Bola Sombra", "Bomba Lodo"], evs: { ate: 252, vel: 252 } },
      { pokemon: "snorlax", naturaleza: "Firme", movimientos: ["Golpe Cuerpo", "Descanso"], evs: { ps: 252, atq: 252 } },
    ],
  },
];

(async () => {
  let usuarioId;
  const existente = (await supabase.from("usuario").select("id").eq("correo", DEMO.correo).maybeSingle()).data;
  if (existente) {
    usuarioId = existente.id;
    console.log(`Usuario demo ya existe (id ${usuarioId}).`);
  } else {
    usuarioId = (await authService.registrar(DEMO)).usuario.id;
    console.log(`Usuario demo creado (id ${usuarioId}).`);
  }

  const actuales = await equipos.listar(usuarioId);
  for (const datos of EQUIPOS) {
    if (actuales.some((e) => e.nombre === datos.nombre)) {
      console.log(`= ${datos.nombre} (ya existe)`);
      continue;
    }
    try {
      const { equipo } = await equipos.crear(usuarioId, esquemas.equipo.parse(datos));
      console.log(`+ ${equipo.nombre} (id ${equipo.id})`);
    } catch (err) {
      console.warn(`! ${datos.nombre}: ${err.message}`, err.detalles ? JSON.stringify(err.detalles) : "");
    }
  }
  console.log(`\nListo. Inicia sesión con ${DEMO.correo} / ${DEMO.contrasena}`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
