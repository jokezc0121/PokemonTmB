// Código del estado del equipo
let equipo = [];
let seleccionado = -1;
let hayCambios = false;
let ultimoQuitado = null;

const listaCatalogo = document.getElementById("catalogo");
const listaRanuras = document.getElementById("ranuras");
const buscador = document.getElementById("buscar");
const inputNombre = document.getElementById("nombre-equipo");
const estadoGuardado = document.getElementById("estado-guardado");
const CLAVE_BORRADOR = "borrador-equipo";

const crearIntegrante = pokemon => ({
  pokemon,
  apodo: "",
  habilidad: pokemon.habilidades[0],
  objeto: "Ninguno",
  naturaleza: "Fuerte",
  movimientos: ["", "", "", ""],
  evs: { ps: 0, atq: 0, def: 0, ate: 0, dfe: 0, vel: 0 }
});

const nombreDe = integrante => integrante.apodo || integrante.pokemon.nombre;
const estaEnEquipo = pokemon => equipo.some(i => i.pokemon === pokemon);
const problemasDe = integrante => integrante.movimientos.some(m => m !== "") ? [] : ["Sin movimientos"];

// Código del indicador de guardado y el borrador
function pintarEstado(texto, clase = "") {
  estadoGuardado.textContent = texto;
  estadoGuardado.className = `estado-guardado ${clase}`;
}

function marcarCambios() {
  hayCambios = true;
  pintarEstado("● Cambios sin guardar", "pendiente");
  guardarBorrador();
  mostrarRequisitos();
}

function guardarBorrador() {
  try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datosDelEquipo())); } catch (e) {}
}

function borrarBorrador() {
  try { localStorage.removeItem(CLAVE_BORRADOR); } catch (e) {}
}

function cargarBorrador() {
  let datos = null;
  try { datos = JSON.parse(localStorage.getItem(CLAVE_BORRADOR)); } catch (e) {}
  if (!datos?.integrantes?.length) return false;

  inputNombre.value = datos.nombre || "";
  selectFormato.value = datos.formato || "Combate Individual";
  cargarArquetipos();
  selectArquetipo.value = datos.arquetipo === "Libre" ? "" : (datos.arquetipo || "");

  equipo = datos.integrantes
    .filter(d => buscarPokemon(d.pokemon))
    .map(d => ({
      ...crearIntegrante(buscarPokemon(d.pokemon)),
      apodo: d.apodo || "",
      habilidad: d.habilidad || buscarPokemon(d.pokemon).habilidades[0],
      objeto: d.objeto || "Ninguno",
      naturaleza: d.naturaleza || "Fuerte",
      movimientos: [...(d.movimientos || []), "", "", "", ""].slice(0, 4),
      evs: { ps: 0, atq: 0, def: 0, ate: 0, dfe: 0, vel: 0, ...d.evs }
    }));
  seleccionado = equipo.length ? 0 : -1;
  return equipo.length > 0;
}

window.addEventListener("beforeunload", e => {
  if (hayCambios && !window.salidaConfirmada) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Código del catálogo lateral
const filtrarCatalogo = () => POKEMONES.filter(p => coincideBusqueda(p, buscador.value.trim()));

function mostrarCatalogo() {
  const lista = filtrarCatalogo();
  const lleno = equipo.length >= 6;
  listaCatalogo.innerHTML = "";

  lista.forEach(p => {
    const yaEsta = estaEnEquipo(p);
    const texto = yaEsta ? "✓ En equipo" : lleno ? "Equipo lleno" : "+ Agregar";
    const etiqueta = yaEsta ? `${p.nombre} ya está en tu equipo` : lleno ? "Equipo lleno" : `Agregar ${p.nombre}`;
    const li = document.createElement("li");
    li.innerHTML = `${htmlImagen(p)}
      <div><strong>${p.nombre}</strong>${htmlTipos(p.tipos)}</div>
      <button type="button" class="boton-mini"${yaEsta || lleno ? " disabled" : ""} aria-label="${etiqueta}">${texto}</button>`;
    li.querySelector("button").addEventListener("click", () => agregar(p));
    listaCatalogo.appendChild(li);
  });

  if (lista.length === 0) {
    listaCatalogo.innerHTML = `<li class="vacio">Ningún Pokémon coincide con «${escapar(buscador.value)}».
      <button type="button" class="enlace-boton" id="limpiar-busqueda">Ver todos</button></li>`;
    document.getElementById("limpiar-busqueda").addEventListener("click", () => {
      buscador.value = "";
      mostrarCatalogo();
      buscador.focus();
    });
  }
}

// Código de agregar, quitar y vaciar
function agregar(pokemon) {
  if (equipo.length >= 6 || estaEnEquipo(pokemon)) return;
  equipo.push(crearIntegrante(pokemon));
  seleccionado = equipo.length - 1;
  actualizarTodo();
  marcarCambios();
  UI.aviso(`${pokemon.nombre} se unió al equipo (${equipo.length}/6).`, "exito");
}

function quitar(indice) {
  const integrante = equipo[indice];
  ultimoQuitado = { integrante, posicion: indice };
  equipo.splice(indice, 1);
  seleccionado = Math.min(seleccionado, equipo.length - 1);
  actualizarTodo();
  marcarCambios();
  UI.aviso(`${nombreDe(integrante)} salió del equipo.`, "info", { texto: "Deshacer", alHacerClic: deshacerQuitar });
}

function deshacerQuitar() {
  if (!ultimoQuitado || equipo.length >= 6) return;
  const { integrante, posicion } = ultimoQuitado;
  equipo.splice(posicion, 0, integrante);
  seleccionado = posicion;
  ultimoQuitado = null;
  UI.aviso(`${nombreDe(integrante)} volvió al equipo.`, "exito");
  actualizarTodo();
  marcarCambios();
}

document.getElementById("vaciar").addEventListener("click", async () => {
  const si = await UI.confirmar({
    titulo: "¿Vaciar el equipo?",
    mensaje: `Se quitarán los ${equipo.length} Pokémon y su configuración.`,
    aceptar: "Sí, vaciar",
    cancelar: "No, mantener",
    peligro: true
  });
  if (!si) return;

  const copia = [...equipo];
  equipo = [];
  seleccionado = -1;
  actualizarTodo();
  marcarCambios();
  UI.aviso("Equipo vaciado.", "info", {
    texto: "Deshacer",
    alHacerClic: () => {
      equipo = copia;
      seleccionado = 0;
      actualizarTodo();
      marcarCambios();
      UI.aviso("Equipo restaurado.", "exito");
    }
  });
});

// Código de las ranuras del equipo
function htmlRanura(integrante, i) {
  const p = integrante.pokemon;
  const nombre = escapar(nombreDe(integrante));
  const movs = integrante.movimientos.filter(m => m !== "").length;
  const problemas = problemasDe(integrante);
  return `
    <button type="button" class="ranura-boton"${i === seleccionado ? ' aria-current="true"' : ""} aria-label="Configurar ${nombre}">
      <span class="numero">${i + 1}</span>
      ${htmlImagen(p)}
      <div>
        <strong>${nombre}</strong>${htmlTipos(p.tipos)}
        <small class="objeto">${integrante.objeto === "Ninguno" ? "Sin objeto" : integrante.objeto} · ${movs}/4 mov.</small>
        ${problemas.length ? `<small class="alerta-ranura">⚠ ${problemas.join(", ")}</small>` : ""}
      </div>
    </button>
    <button type="button" class="quitar" title="Quitar del equipo" aria-label="Quitar ${nombre} del equipo">✕</button>`;
}

function mostrarEquipo() {
  listaRanuras.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const integrante = equipo[i];
    const li = document.createElement("li");

    if (!integrante) {
      li.className = "ranura";
      li.innerHTML = `<span class="numero">${i + 1}</span><span>Vacío</span>`;
    } else {
      li.className = `ranura llena${i === seleccionado ? " activa" : ""}`;
      li.innerHTML = htmlRanura(integrante, i);
      li.querySelector(".ranura-boton").addEventListener("click", () => seleccionar(i));
      li.querySelector(".quitar").addEventListener("click", () => quitar(i));
    }
    listaRanuras.appendChild(li);
  }

  document.getElementById("contador").textContent = `${equipo.length}/6`;
  document.getElementById("vaciar").disabled = equipo.length === 0;
  document.getElementById("ayuda-equipo").textContent = equipo.length === 0
    ? "Tu equipo está vacío. Agrega Pokémon desde el catálogo de la derecha."
    : "Haz clic en un Pokémon para configurarlo. Usa ✕ para quitarlo.";
}

function seleccionar(i) {
  seleccionado = i;
  mostrarEquipo();
  mostrarEditor();
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

inputNombre.addEventListener("input", () => {
  document.getElementById("error-nombre-equipo").textContent = "";
  inputNombre.classList.remove("invalido");
  marcarCambios();
});

// Código de guardar el equipo
const datosDelEquipo = () => ({
  nombre: inputNombre.value.trim(),
  formato: selectFormato.value,
  arquetipo: selectArquetipo.value || "Libre",
  integrantes: equipo.map(i => ({
    pokemon: i.pokemon.nombre,
    apodo: i.apodo,
    habilidad: i.habilidad,
    objeto: i.objeto,
    naturaleza: i.naturaleza,
    movimientos: i.movimientos.filter(m => m !== ""),
    evs: i.evs
  }))
});

const TEXTO_GUARDAR = 'Guardar equipo <small class="atajo-boton">Ctrl + S</small>';

function mostrarErrores(pendientes) {
  const lista = document.getElementById("mensaje");
  lista.innerHTML = "";
  pendientes.forEach(r => {
    const li = document.createElement("li");
    li.className = "mal";
    li.innerHTML = `<span>${r.error}</span> <button type="button" class="enlace-boton">Corregir →</button>`;
    li.querySelector("button").addEventListener("click", r.arreglar);
    lista.appendChild(li);
  });
  UI.aviso(`No se pudo guardar: ${pendientes.length} ${pendientes.length === 1 ? "cosa" : "cosas"} por corregir.`, "error");
}

function guardar() {
  const pendientes = requisitos().filter(r => !r.ok);
  if (pendientes.length) return mostrarErrores(pendientes);

  const boton = document.getElementById("guardar");
  const datos = datosDelEquipo();
  boton.disabled = true;
  boton.innerHTML = '<span class="cargando" aria-hidden="true"></span>Guardando...';
  pintarEstado("Guardando...", "pendiente");

  setTimeout(() => {
    hayCambios = false;
    borrarBorrador();
    const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    pintarEstado(`✓ Guardado a las ${hora}`, "guardado");
    document.getElementById("mensaje").innerHTML = `<li class="bien">¡Equipo «${escapar(datos.nombre)}» guardado!</li>`;
    UI.aviso(`Equipo «${datos.nombre}» guardado.`, "exito");
    boton.disabled = false;
    boton.innerHTML = TEXTO_GUARDAR;
  }, 700);
}

document.getElementById("guardar").addEventListener("click", guardar);

// Código de los atajos de teclado del editor
document.addEventListener("keydown", e => {
  if (document.getElementById("modal")) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const tecla = e.key.toLowerCase();
  const enCampo = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);

  if (ctrl && tecla === "s") {
    e.preventDefault();
    guardar();
  }
  if (ctrl && tecla === "z" && !enCampo && ultimoQuitado) {
    e.preventDefault();
    deshacerQuitar();
  }
});

buscador.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  if (equipo.length >= 6) return UI.aviso("Tu equipo ya tiene 6 Pokémon. Quita uno para agregar otro.", "info");

  const primero = filtrarCatalogo().find(p => !estaEnEquipo(p));
  if (primero) {
    agregar(primero);
    buscador.value = "";
    mostrarCatalogo();
  }
});

buscador.addEventListener("input", mostrarCatalogo);

// Inicio
function actualizarTodo() {
  mostrarEquipo();
  mostrarEditor();
  mostrarEstadisticas();
  mostrarArquetipo();
  mostrarCatalogo();
  mostrarRequisitos();
}

function empezarDeCero() {
  equipo = [];
  seleccionado = -1;
  inputNombre.value = "";
  hayCambios = false;
  borrarBorrador();
  pintarEstado("Sin cambios");
  actualizarTodo();
}

cargarArquetipos();

if (cargarBorrador()) {
  hayCambios = true;
  pintarEstado("● Borrador recuperado, sin guardar", "pendiente");
  UI.aviso("Recuperamos el equipo que estabas armando.", "info", { texto: "Empezar de cero", alHacerClic: empezarDeCero });
}

// Pokémon que llega desde el catálogo con "?agregar=Nombre"
const pedido = buscarPokemon(new URLSearchParams(location.search).get("agregar"));
if (location.search) history.replaceState(null, "", "equipo.html");
if (pedido && estaEnEquipo(pedido)) {
  UI.aviso(`${pedido.nombre} ya está en tu equipo.`, "info");
} else if (pedido && equipo.length >= 6) {
  UI.aviso(`No se pudo agregar a ${pedido.nombre}: tu equipo ya tiene 6. Quita uno primero.`, "error");
} else if (pedido) {
  equipo.push(crearIntegrante(pedido));
  seleccionado = equipo.length - 1;
  hayCambios = true;
  guardarBorrador();
  pintarEstado("● Cambios sin guardar", "pendiente");
  UI.aviso(`${pedido.nombre} se unió al equipo (${equipo.length}/6).`, "exito");
}

actualizarTodo();
