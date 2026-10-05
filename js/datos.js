// Datos que simulan la PokéAPI (nombre, tipos, estadísticas base, habilidades, movimientos e imagen)
const IMAGEN_POR_DEFECTO = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/201.png";

const POKEMONES = [
  {
    nombre: "Pikachu", tipos: ["Eléctrico"],
    base: { ps: 35, atq: 55, def: 40, ate: 50, dfe: 50, vel: 90 },
    habilidades: ["Elec. Estática"],
    oculta: "Pararrayos",
    movimientos: ["Rayo", "Placaje Eléctrico", "Cola Férrea", "Ataque Rápido", "Sorpresa", "Protección", "Hierba Lazo", "Onda Trueno"]
  },
  {
    nombre: "Charizard", tipos: ["Fuego", "Volador"],
    base: { ps: 78, atq: 84, def: 78, ate: 109, dfe: 85, vel: 100 },
    habilidades: ["Mar Llamas"],
    oculta: "Poder Solar",
    movimientos: ["Lanzallamas", "Llamarada", "Tajo Aéreo", "Onda Ígnea", "Rayo Solar", "Pulso Dragón", "Protección", "Respiro"]
  },
  {
    nombre: "Garchomp", tipos: ["Dragón", "Tierra"],
    base: { ps: 108, atq: 130, def: 95, ate: 80, dfe: 85, vel: 102 },
    habilidades: ["Velo Arena"],
    oculta: "Piel Tosca",
    movimientos: ["Terremoto", "Garra Dragón", "Enfado", "Roca Afilada", "Colmillo Ígneo", "Danza Espada", "Protección", "Bucle Arena"]
  },
  {
    nombre: "Incineroar", tipos: ["Fuego", "Siniestro"],
    base: { ps: 95, atq: 115, def: 90, ate: 80, dfe: 90, vel: 60 },
    habilidades: ["Mar Llamas"],
    oculta: "Intimidación",
    movimientos: ["Sorpresa", "Envite Ígneo", "Golpe Bajo", "Desarme", "Ida y Vuelta", "Lanzallamas", "Mofa", "Protección"]
  },
  {
    nombre: "Gengar", tipos: ["Fantasma", "Veneno"],
    base: { ps: 60, atq: 65, def: 60, ate: 130, dfe: 75, vel: 110 },
    habilidades: ["Cuerpo Maldito"],
    oculta: "",
    movimientos: ["Bola Sombra", "Bomba Lodo", "Rayo", "Hipnosis", "Infortunio", "Mismo Destino", "Psíquico", "Protección"]
  },
  {
    nombre: "Gyarados", tipos: ["Agua", "Volador"],
    base: { ps: 95, atq: 125, def: 79, ate: 60, dfe: 100, vel: 81 },
    habilidades: ["Intimidación"],
    oculta: "Autoestima",
    movimientos: ["Cascada", "Acua Cola", "Danza Dragón", "Terremoto", "Colmillo Hielo", "Enfado", "Mofa", "Protección"]
  },
  {
    nombre: "Lucario", tipos: ["Lucha", "Acero"],
    base: { ps: 70, atq: 110, def: 70, ate: 115, dfe: 70, vel: 90 },
    habilidades: ["Impasible", "Foco Interno"],
    oculta: "Justiciero",
    movimientos: ["Esfera Aural", "A Bocajarro", "Velocidad Extrema", "Puño Bala", "Pulso Dragón", "Pulso Umbrío", "Maquinación", "Protección"]
  },
  {
    nombre: "Dragonite", tipos: ["Dragón", "Volador"],
    base: { ps: 91, atq: 134, def: 95, ate: 100, dfe: 100, vel: 80 },
    habilidades: ["Foco Interno"],
    oculta: "Compensación",
    movimientos: ["Velocidad Extrema", "Enfado", "Terremoto", "Puño Fuego", "Danza Dragón", "Viento Afín", "Respiro", "Protección"]
  },
  {
    nombre: "Sylveon", tipos: ["Hada"],
    base: { ps: 95, atq: 65, def: 65, ate: 110, dfe: 130, vel: 60 },
    habilidades: ["Gran Encanto"],
    oculta: "Piel Feérica",
    movimientos: ["Voz Cautivadora", "Fuerza Lunar", "Hiperrayo", "Bola Sombra", "Paz Mental", "Deseo", "Protección", "Ataque Rápido"]
  },
  {
    nombre: "Tyranitar", tipos: ["Roca", "Siniestro"],
    base: { ps: 100, atq: 134, def: 110, ate: 95, dfe: 100, vel: 61 },
    habilidades: ["Chorro Arena"],
    oculta: "Nerviosismo",
    movimientos: ["Avalancha", "Triturar", "Terremoto", "Roca Afilada", "Puño Hielo", "Golpe Bajo", "Danza Dragón", "Protección"]
  },
  {
    nombre: "Snorlax", tipos: ["Normal"],
    base: { ps: 160, atq: 110, def: 65, ate: 65, dfe: 110, vel: 30 },
    habilidades: ["Inmunidad", "Sebo"],
    oculta: "Glotonería",
    movimientos: ["Golpe Cuerpo", "Descanso", "Sonámbulo", "Maldición", "Terremoto", "Puño Hielo", "Bostezo", "Protección"]
  },
  {
    nombre: "Metagross", tipos: ["Acero", "Psíquico"],
    base: { ps: 80, atq: 135, def: 130, ate: 95, dfe: 90, vel: 70 },
    habilidades: ["Cuerpo Puro"],
    oculta: "Metal Liviano",
    movimientos: ["Puño Meteoro", "Cabezazo Zen", "Terremoto", "Puño Bala", "Puño Hielo", "Agilidad", "Ida y Vuelta", "Protección"]
  }
];

// Datos del juego: objetos, naturalezas y arquetipos
const OBJETOS = [
  "Ninguno", "Restos", "Vidasfera", "Cinta Elegida", "Gafas Elegidas",
  "Pañuelo Elegido", "Banda Focus", "Baya Zidra", "Chaleco Asalto",
  "Gafas Protectoras", "Hierba Blanca", "Casco Dentado"
];

const NATURALEZAS = [
  { nombre: "Fuerte",   sube: null,  baja: null },
  { nombre: "Huraña",   sube: "atq", baja: "def" },
  { nombre: "Firme",    sube: "atq", baja: "ate" },
  { nombre: "Pícara",   sube: "atq", baja: "dfe" },
  { nombre: "Audaz",    sube: "atq", baja: "vel" },
  { nombre: "Osada",    sube: "def", baja: "atq" },
  { nombre: "Dócil",    sube: null,  baja: null },
  { nombre: "Agitada",  sube: "def", baja: "ate" },
  { nombre: "Floja",    sube: "def", baja: "dfe" },
  { nombre: "Plácida",  sube: "def", baja: "vel" },
  { nombre: "Modesta",  sube: "ate", baja: "atq" },
  { nombre: "Afable",   sube: "ate", baja: "def" },
  { nombre: "Tímida",   sube: null,  baja: null },
  { nombre: "Alocada",  sube: "ate", baja: "dfe" },
  { nombre: "Mansa",    sube: "ate", baja: "vel" },
  { nombre: "Serena",   sube: "dfe", baja: "atq" },
  { nombre: "Amable",   sube: "dfe", baja: "def" },
  { nombre: "Cauta",    sube: "dfe", baja: "ate" },
  { nombre: "Rara",     sube: null,  baja: null },
  { nombre: "Grosera",  sube: "dfe", baja: "vel" },
  { nombre: "Miedosa",  sube: "vel", baja: "atq" },
  { nombre: "Activa",   sube: "vel", baja: "def" },
  { nombre: "Alegre",   sube: "vel", baja: "ate" },
  { nombre: "Ingenua",  sube: "vel", baja: "dfe" },
  { nombre: "Seria",    sube: null,  baja: null }
];

const ARQUETIPOS = {
  "Combate Individual": [
    {
      nombre: "Ofensiva total",
      descripcion: "Pokémon rápidos y fuertes que se potencian y buscan barrer al rival antes de que reaccione.",
      claves: ["Danza Dragón", "Danza Espada", "Maquinación", "Banda Focus"]
    },
    {
      nombre: "Equilibrado",
      descripcion: "Mezcla de atacantes y defensores con buena cobertura de tipos. Se adapta a casi cualquier rival.",
      claves: ["Restos", "Ida y Vuelta", "Respiro", "Intimidación"]
    },
    {
      nombre: "Stall (defensivo)",
      descripcion: "Defensas muy altas, recuperación de PS y daño residual para desgastar al rival poco a poco.",
      claves: ["Restos", "Descanso", "Deseo", "Protección"]
    },
    {
      nombre: "Pivotes (Volt-Turn)",
      descripcion: "Ataca y cambia de Pokémon en el mismo turno para mantener la ventaja de tipos.",
      claves: ["Ida y Vuelta", "Voltiocambio", "Casco Dentado"]
    },
    {
      nombre: "Tormenta de arena",
      descripcion: "Un Pokémon invoca arena al entrar y otros aprovechan el clima para defenderse o atacar.",
      claves: ["Chorro Arena", "Velo Arena", "Terremoto"]
    }
  ],
  "Combate Doble": [
    {
      nombre: "Viento Afín",
      descripcion: "Duplica la velocidad del equipo por 4 turnos para que tus atacantes golpeen primero.",
      claves: ["Viento Afín", "Sorpresa", "Protección"]
    },
    {
      nombre: "Espacio Raro",
      descripcion: "Invierte el orden de velocidad: los Pokémon lentos y fuertes atacan antes.",
      claves: ["Espacio Raro", "Protección", "Hierba Blanca"]
    },
    {
      nombre: "Lluvia",
      descripcion: "Un Pokémon invoca lluvia y los de tipo Agua ganan velocidad y potencia.",
      claves: ["Llovizna", "Danza Lluvia", "Nado Rápido"]
    },
    {
      nombre: "Sol",
      descripcion: "El sol potencia los ataques de Fuego y activa habilidades como Poder Solar.",
      claves: ["Sequía", "Poder Solar", "Onda Ígnea"]
    },
    {
      nombre: "Intimidación y apoyo (Goodstuffs)",
      descripcion: "Pokémon fuertes por sí solos con mucho apoyo: bajar el ataque rival, hacer retroceder y protegerse.",
      claves: ["Intimidación", "Sorpresa", "Desarme", "Protección"]
    },
    {
      nombre: "Ofensiva total",
      descripcion: "Ataques que golpean a los dos rivales a la vez para presionar desde el primer turno.",
      claves: ["Voz Cautivadora", "Onda Ígnea", "Terremoto", "Gafas Elegidas"]
    }
  ]
};

// Reglas de estadísticas
const NOMBRES_STATS = {
  ps: "PS", atq: "Ataque", def: "Defensa",
  ate: "At. Esp.", dfe: "Def. Esp.", vel: "Velocidad"
};

const EV_MAX_STAT = 252;
const EV_MAX_TOTAL = 510;
const NIVEL = 50;

// Funciones compartidas por varias páginas
const normalizar = texto => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const escapar = texto => String(texto).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const buscarPokemon = nombre => POKEMONES.find(p => p.nombre === nombre);

const imagenPokemon = pokemon => pokemon.imagen || IMAGEN_POR_DEFECTO;

const htmlImagen = pokemon =>
  `<img class="sprite" src="${imagenPokemon(pokemon)}" alt="${pokemon.nombre}" loading="lazy">`;

const todasLasHabilidades = pokemon =>
  pokemon.oculta ? [...pokemon.habilidades, pokemon.oculta] : pokemon.habilidades;

const totalBase = pokemon => Object.values(pokemon.base).reduce((a, b) => a + b, 0);

const claseTipo = tipo => "tipo-" + normalizar(tipo);

const htmlTipos = tipos => tipos.map(t => `<span class="tipo ${claseTipo(t)}">${t}</span>`).join("");

// Busca por nombre, tipo o habilidad sin importar tildes
const coincideBusqueda = (pokemon, texto) =>
  normalizar([pokemon.nombre, ...pokemon.tipos, ...todasLasHabilidades(pokemon)].join(" ")).includes(normalizar(texto));

// Barra de una estadística (se usa en el perfil y en el análisis del equipo)
const htmlBarraStat = (nombre, valor, clase = "") => `
  <div class="stat ${clase}">
    <span>${nombre}</span>
    <div class="barra"><i style="width:${Math.min(valor / 160 * 100, 100)}%"></i></div>
    <b>${valor}</b>
  </div>`;

const NOMBRE_TIPO_FRONT = { Pelea: "Lucha", Psiquico: "Psíquico", Electrico: "Eléctrico", Dragon: "Dragón" };

const aPokemonFront = p => ({
  id: p.id,
  nombre: p.nombreMostrar,
  tipos: p.tipos.filter(Boolean).map(t => NOMBRE_TIPO_FRONT[t.nombre] || t.nombre),
  base: p.base,
  imagen: p.sprite,
  habilidades: (p.habilidades || []).filter(h => !h.oculta).map(h => h.nombre),
  oculta: (p.habilidades || []).find(h => h.oculta)?.nombre || "",
  movimientos: (p.movimientos || []).map(m => m.nombre)
});

async function cargarPokemones() {
  const r = await api.get("/pokemon?limite=1000&orden=nombre");
  POKEMONES.splice(0, POKEMONES.length, ...r.data.map(aPokemonFront));
}
