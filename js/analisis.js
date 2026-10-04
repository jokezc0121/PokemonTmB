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
