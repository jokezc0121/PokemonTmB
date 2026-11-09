// Código del arquetipo del equipo
const selectFormato = document.getElementById("formato");
const selectArquetipo = document.getElementById("arquetipo");

function cargarArquetipos() {
  selectArquetipo.innerHTML = '<option value="">Sin arquetipo (libre)</option>' +
    ARQUETIPOS[selectFormato.value].map(a => `<option value="${a.nombre}">${a.nombre}</option>`).join("");
  mostrarArquetipo();
}

const buscarArquetipo = () => ARQUETIPOS[selectFormato.value].find(a => a.nombre === selectArquetipo.value);

// ¿Algún integrante tiene este movimiento, habilidad u objeto?
const equipoTiene = clave =>
  equipo.some(i => i.movimientos.includes(clave) || i.habilidad === clave || i.objeto === clave);

function mostrarArquetipo() {
  const caja = document.getElementById("arquetipo-info");
  const arquetipo = buscarArquetipo();
  caja.hidden = !arquetipo;
  if (!arquetipo) return;

  const tiene = arquetipo.claves.filter(equipoTiene);
  const claves = arquetipo.claves.map(c => tiene.includes(c)
    ? `<li class="tiene">${c}<span class="solo-lectores"> (ya lo tienes)</span></li>`
    : `<li>${c}<span class="solo-lectores"> (te falta)</span></li>`).join("");

  caja.innerHTML = `
    <p>${arquetipo.descripcion}</p>
    <h3>Elementos clave: tienes ${tiene.length} de ${arquetipo.claves.length}</h3>
    <ul class="claves">${claves}</ul>`;
}

selectFormato.addEventListener("change", () => { cargarArquetipos(); marcarCambios(); });
selectArquetipo.addEventListener("change", () => { mostrarArquetipo(); marcarCambios(); });

// Código de las estadísticas promedio y la sugerencia
function mostrarEstadisticas() {
  const caja = document.getElementById("estadisticas");
  const aviso = document.getElementById("aviso");

  if (equipo.length === 0) {
    caja.innerHTML = "";
    aviso.textContent = "Agrega Pokémon para ver el análisis.";
    return;
  }

  const promedios = Object.keys(NOMBRES_STATS).map(c => ({
    clave: c,
    valor: Math.round(equipo.reduce((suma, i) => suma + i.pokemon.base[c], 0) / equipo.length)
  }));
  const masBaja = promedios.reduce((min, s) => s.valor < min.valor ? s : min);

  caja.innerHTML = promedios
    .map(s => htmlBarraStat(NOMBRES_STATS[s.clave], s.valor, s === masBaja ? "baja" : ""))
    .join("");

  const sugerido = POKEMONES
    .filter(p => !estaEnEquipo(p))
    .sort((a, b) => b.base[masBaja.clave] - a.base[masBaja.clave])[0];

  aviso.textContent = `Tu estadística más baja es ${NOMBRES_STATS[masBaja.clave]} (${masBaja.valor}).` +
    (sugerido && equipo.length < 6 ? ` Sugerencia: ${sugerido.nombre} tiene ${sugerido.base[masBaja.clave]}.` : "");
}

// Código de la lista "Antes de guardar"
function irA(indice, idCampo) {
  if (indice < 0) return;
  seleccionar(indice);
  setTimeout(() => (idCampo ? document.getElementById(idCampo) : editor.querySelector(".movimiento")).focus(), 300);
}

function requisitos() {
  const sinMovimientos = equipo.filter(i => problemasDe(i).length > 0);
  const objetos = equipo.map(i => i.objeto).filter(o => o !== "Ninguno");
  const repetidos = [...new Set(objetos.filter((o, pos) => objetos.indexOf(o) !== pos))];

  return [
    {
      ok: inputNombre.value.trim() !== "",
      texto: "El equipo tiene nombre",
      error: "Ponle un nombre al equipo.",
      arreglar: () => {
        inputNombre.classList.add("invalido");
        document.getElementById("error-nombre-equipo").textContent = "Escribe un nombre, por ejemplo «Equipo Lluvia».";
        inputNombre.focus();
      }
    },
    {
      ok: equipo.length > 0,
      texto: "Hay al menos 1 Pokémon",
      error: "Agrega al menos un Pokémon desde el catálogo.",
      arreglar: () => buscador.focus()
    },
    {
      ok: equipo.length > 0 && sinMovimientos.length === 0,
      texto: "Cada Pokémon tiene al menos 1 movimiento",
      error: `Falta elegir movimientos para: ${sinMovimientos.map(i => escapar(nombreDe(i))).join(", ")}.`,
      arreglar: () => irA(equipo.indexOf(sinMovimientos[0]))
    },
    {
      ok: repetidos.length === 0,
      texto: "Ningún objeto se repite",
      error: `El objeto ${repetidos.join(", ")} está repetido. Cambia uno.`,
      arreglar: () => irA(equipo.map(i => i.objeto).lastIndexOf(repetidos[0]), "objeto")
    }
  ];
}

function mostrarRequisitos() {
  document.getElementById("requisitos-equipo").innerHTML = requisitos().map(r =>
    `<li class="${r.ok ? "cumple" : ""}">${r.texto}<span class="solo-lectores">${r.ok ? " (listo)" : " (pendiente)"}</span></li>`).join("");
}

// Código de las debilidades del equipo: la API (POST /teams/preview) cruza los tipos de cada
// Pokémon con la tabla de tipos y devuelve, por tipo atacante, quién es débil, resiste o es inmune.
let claveDebilidades = "";
let verTodasDebilidades = false; // se recuerda mientras se edita el equipo
const DEBILIDADES_VISIBLES = 4;
let temporizadorDebilidades = null;

function programarDebilidades() {
  clearTimeout(temporizadorDebilidades);
  temporizadorDebilidades = setTimeout(mostrarDebilidades, 300);
}

async function mostrarDebilidades() {
  const caja = document.getElementById("debilidades");
  const ids = equipo.map(i => i.pokemon.id);
  const clave = ids.join(",");
  if (clave === claveDebilidades) return; // solo dependen de qué Pokémon hay, no de EVs ni movimientos
  claveDebilidades = clave;

  if (ids.length === 0) {
    caja.innerHTML = '<p class="ayuda">Agrega Pokémon para ver sus debilidades.</p>';
    return;
  }

  caja.innerHTML = '<p class="ayuda"><span class="cargando" aria-hidden="true"></span>Calculando debilidades...</p>';
  try {
    const respuesta = await api.post("/teams/preview", {
      nombre: "Análisis",
      formato: "individual",
      integrantes: ids.map(id => ({ pokemon: id }))
    });
    if (clave !== claveDebilidades) return; // el equipo cambió mientras se calculaba
    pintarDebilidades(respuesta.data.analisis.defensa);
  } catch (error) {
    claveDebilidades = "";
    caja.innerHTML = '<p class="aviso">No se pudieron calcular las debilidades: <span></span></p>';
    caja.querySelector("span").textContent = error.message;
  }
}

const nombreTipoDebilidad = tipo => {
  const nombre = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  return NOMBRE_TIPO_FRONT[nombre] || nombre;
};

function pintarDebilidades(defensa) {
  const caja = document.getElementById("debilidades");
  const debiles = defensa
    .filter(f => f.debiles.length > 0)
    .sort((a, b) => b.debiles.length - a.debiles.length || a.balance - b.balance);

  if (debiles.length === 0) {
    caja.innerHTML = '<p class="aviso aviso-bien">Ningún tipo es súper eficaz contra tu equipo.</p>';
    return;
  }

  const mitad = Math.max(2, Math.ceil(equipo.length / 2));
  const filas = debiles.map((f, n) => {
    const cubren = f.resisten.length + f.inmunes.length;
    const grave = f.debiles.length >= mitad || (f.debiles.length >= 2 && cubren === 0);
    return `
      <li class="debilidad${grave ? " grave" : ""}"${n >= DEBILIDADES_VISIBLES ? " data-extra" : ""}>
        ${htmlTipos([escapar(nombreTipoDebilidad(f.tipo))])}
        <span class="debilidad-cuenta"><strong>${f.debiles.length}</strong> débil${f.debiles.length === 1 ? "" : "es"} · ${cubren} lo resiste${cubren === 1 ? "" : "n"}</span>
        <small class="debilidad-quien">Débiles: ${f.debiles.map(escapar).join(", ")}</small>
      </li>`;
  }).join("");

  const principales = debiles.filter(f => f.debiles.length === debiles[0].debiles.length).map(f => nombreTipoDebilidad(f.tipo));
  caja.innerHTML = `
    <p class="aviso">Principal debilidad: <strong>${principales.map(escapar).join(", ")}</strong>.</p>
    <ul class="lista-debilidades" id="lista-debilidades">${filas}</ul>`;

  // Solo las 4 principales; el resto se ve con "Mostrar más"
  const ocultas = debiles.length - DEBILIDADES_VISIBLES;
  if (ocultas <= 0) return;

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-mini boton-ver-mas";
  boton.setAttribute("aria-controls", "lista-debilidades");
  caja.appendChild(boton);

  const aplicar = () => {
    caja.querySelectorAll("[data-extra]").forEach(li => li.hidden = !verTodasDebilidades);
    boton.textContent = verTodasDebilidades ? "Mostrar menos" : `Mostrar más (${ocultas})`;
    boton.setAttribute("aria-expanded", String(verTodasDebilidades));
  };
  boton.addEventListener("click", () => {
    verTodasDebilidades = !verTodasDebilidades;
    aplicar();
  });
  aplicar();
}
