// Imagen genérica para cuando un Pokémon no tiene sprite
const IMAGEN_POR_DEFECTO = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/201.png";

// Catálogo de Pokémon: se llena desde la base de datos con cargarPokemones()
const POKEMONES = [];

// Objetos y naturalezas: se llenan desde la base de datos (GET /api/catalog/items y /api/catalog/natures)
const OBJETOS = ["Ninguno"];
const NATURALEZAS = [];

// Arquetipos de equipo (guía de la interfaz)

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

const buscarPokemon = valor => POKEMONES.find(p => String(p.id) === String(valor) || p.nombre === valor);

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
  slug: p.nombre,
  nombre: p.nombreMostrar,
  tipos: p.tipos.filter(Boolean).map(t => NOMBRE_TIPO_FRONT[t.nombre] || t.nombre),
  base: p.base,
  imagen: p.sprite,
  habilidades: (p.habilidades || []).filter(h => !h.oculta).map(h => h.nombre),
  oculta: (p.habilidades || []).find(h => h.oculta)?.nombre || "",
  movimientos: (p.movimientos || []).map(m => m.nombre)
});

async function cargarPokemones() {
  const todos = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const respuesta = await api.get(
      `/pokemon?limite=1000&pagina=${pagina}&orden=nombre&incluirMegas=true`
    );

    todos.push(...respuesta.data.map(aPokemonFront));

    totalPaginas = respuesta.meta.paginas;
    pagina++;

  } while (pagina <= totalPaginas);

  POKEMONES.splice(0, POKEMONES.length, ...todos);

  console.log("Pokémon cargados:", POKEMONES.length);
}
