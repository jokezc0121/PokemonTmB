// Código del estado del equipo
let equipo = [];
let seleccionado = -1;
let hayCambios = false;
let ultimoQuitado = null;
let equipoId = null;       // id del equipo en la BD (null = equipo nuevo)
let guardadoEnBd = false;  // true cuando lo que se ve en pantalla ya está guardado (habilita Exportar TXT)

const listaCatalogo = document.getElementById("catalogo");
const listaRanuras = document.getElementById("ranuras");
const buscador = document.getElementById("buscar");
const inputNombre = document.getElementById("nombre-equipo");
const estadoGuardado = document.getElementById("estado-guardado");
const CLAVE_BORRADOR = "borrador-equipo";

// Naturaleza inicial: "Fuerte" si existe en la BD; si no, la primera neutra o la primera de la lista
const naturalezaPorDefecto = () =>
  (NATURALEZAS.find(n => n.nombre === "Fuerte") || NATURALEZAS.find(n => !n.sube) || NATURALEZAS[0])?.nombre || "";

const crearIntegrante = pokemon => ({
  pokemon,
  apodo: "",
  habilidad: pokemon.habilidades[0] || pokemon.oculta || "",
  objeto: "Ninguno",
  naturaleza: naturalezaPorDefecto(),
  movimientos: ["", "", "", ""],
  evs: { ps: 0, atq: 0, def: 0, ate: 0, dfe: 0, vel: 0 },
  ivs: { ps: 31, atq: 31, def: 31, ate: 31, dfe: 31, vel: 31 },
  nivel: NIVEL
});

// El listado del catálogo no trae los movimientos: se piden a la API (GET /pokemon/:id) al agregar el Pokémon
async function conMovimientos(pokemon) {
  if (pokemon.movimientosCargados) return pokemon;
  const respuesta = await api.get(`/pokemon/${pokemon.id}`);
  Object.assign(pokemon, aPokemonFront(respuesta.data), { movimientosCargados: true });
  return pokemon;
}

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
  guardadoEnBd = false;
  pintarEstado("● Cambios sin guardar", "pendiente");
  guardarBorrador();
  mostrarRequisitos();
  mostrarExportar();
  programarDebilidades();
}

// El borrador local solo se usa para equipos nuevos; un equipo ya guardado se recupera de la BD
function guardarBorrador() {
  if (equipoId) return;
  try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datosDelEquipo())); } catch (e) {}
}

function borrarBorrador() {
  try { localStorage.removeItem(CLAVE_BORRADOR); } catch (e) {}
}

async function cargarBorrador() {
  let datos = null;
  try { datos = JSON.parse(localStorage.getItem(CLAVE_BORRADOR)); } catch (e) {}
  if (!datos?.integrantes?.length) return false;

  inputNombre.value = datos.nombre || "";
  selectFormato.value = datos.formato || "Combate Individual";
  cargarArquetipos();
  selectArquetipo.value = datos.arquetipo === "Libre" ? "" : (datos.arquetipo || "");

  const guardados = datos.integrantes.filter(d => buscarPokemon(d.pokemon));
  await Promise.all(guardados.map(d => conMovimientos(buscarPokemon(d.pokemon)).catch(() => null)));
  equipo = guardados
    .map(d => ({
      ...crearIntegrante(buscarPokemon(d.pokemon)),
      apodo: d.apodo || "",
      habilidad: d.habilidad || buscarPokemon(d.pokemon).habilidades[0],
      objeto: d.objeto || "Ninguno",
      naturaleza: d.naturaleza || naturalezaPorDefecto(),
      movimientos: [...(d.movimientos || []), "", "", "", ""].slice(0, 4),
      evs: { ps: 0, atq: 0, def: 0, ate: 0, dfe: 0, vel: 0, ...d.evs },
      ivs: { ps: 31, atq: 31, def: 31, ate: 31, dfe: 31, vel: 31, ...d.ivs },
      nivel: d.nivel || NIVEL
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
    li.querySelector("button").addEventListener("click", e => agregar(p, e.currentTarget));
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
async function agregar(pokemon, boton) {
  if (equipo.length >= 6 || estaEnEquipo(pokemon)) return;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '<span class="cargando" aria-hidden="true"></span>Cargando';
  }
  try {
    await conMovimientos(pokemon);
  } catch (error) {
    UI.aviso(`No se pudieron cargar los movimientos de ${pokemon.nombre}: ${error.message}`, "error");
    mostrarCatalogo();
    return;
  }
  if (equipo.length >= 6 || estaEnEquipo(pokemon)) return mostrarCatalogo();
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
    evs: i.evs,
    ivs: i.ivs,
    nivel: i.nivel
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

// Lo que se envía a la API: los nombres vienen del catálogo de la BD y el backend los vuelve a validar
const datosParaApi = () => ({
  nombre: inputNombre.value.trim(),
  formato: FORMATO_TXT[selectFormato.value] || "individual",
  arquetipo: selectArquetipo.value || null,
  integrantes: equipo.map(i => ({
    pokemon: i.pokemon.id,
    apodo: i.apodo || null,
    habilidad: i.habilidad || null,
    objeto: i.objeto === "Ninguno" ? null : i.objeto,
    naturaleza: i.naturaleza || null,
    movimientos: i.movimientos.filter(m => m !== ""),
    evs: i.evs,
    ivs: i.ivs,
    nivel: i.nivel
  }))
});

// Errores del servidor (400/422): se muestran con el nombre del Pokémon afectado
function mostrarErroresServidor(error) {
  const lista = document.getElementById("mensaje");
  lista.innerHTML = "";
  const detalles = error.detalles.length ? error.detalles : [{ campo: null, mensaje: error.message }];
  detalles.forEach(d => {
    const m = /^integrantes\[(\d+)\]/.exec(d.campo || "");
    const integrante = m ? equipo[Number(m[1])] : null;
    const li = document.createElement("li");
    li.className = "mal";
    li.innerHTML = '<span></span>' + (integrante ? ' <button type="button" class="enlace-boton">Corregir →</button>' : "");
    li.querySelector("span").textContent = (integrante ? `${nombreDe(integrante)}: ` : "") + d.mensaje;
    li.querySelector("button")?.addEventListener("click", () => seleccionar(Number(m[1])));
    lista.appendChild(li);
  });
}

function pintarTitulo() {
  const titulo = equipoId ? "Editar equipo" : "Crear equipo";
  document.getElementById("titulo-pagina").textContent = titulo;
  document.title = `${titulo} - Pokémon Team Builder`;
}

async function guardar() {
  const boton = document.getElementById("guardar");
  if (boton.disabled) return;
  const pendientes = requisitos().filter(r => !r.ok);
  if (pendientes.length) return mostrarErrores(pendientes);

  const datos = datosParaApi();
  boton.disabled = true;
  boton.innerHTML = '<span class="cargando" aria-hidden="true"></span>Guardando...';
  pintarEstado("Guardando...", "pendiente");
  document.getElementById("mensaje").innerHTML = "";

  try {
    // Equipo nuevo → POST; equipo que ya existe (abierto desde Mis equipos) → PUT
    const respuesta = equipoId
      ? await api.put(`/teams/${equipoId}`, datos)
      : await api.post("/teams", datos);

    borrarBorrador();
    hayCambios = false;
    guardadoEnBd = true;
    if (!equipoId) {
      equipoId = respuesta.data.id;
      history.replaceState(null, "", `equipo.html?id=${equipoId}`);
      pintarTitulo();
    }
    const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    pintarEstado(`✓ Guardado a las ${hora}`, "guardado");
    document.getElementById("mensaje").innerHTML =
      `<li class="bien">¡Equipo «${escapar(datos.nombre)}» guardado! <a href="mis-equipos.html">Ver en Mis equipos →</a></li>`;
    UI.aviso(`Equipo «${datos.nombre}» guardado en tu cuenta.`, "exito");
  } catch (error) {
    pintarEstado("● No se guardó", "pendiente");
    mostrarErroresServidor(error);
    UI.aviso(`No se pudo guardar: ${error.message}`, "error");
  } finally {
    boton.disabled = false;
    boton.innerHTML = TEXTO_GUARDAR;
    mostrarExportar();
  }
}

// Código de Exportar TXT: aparece al guardar y descarga lo que quedó guardado
function mostrarExportar() {
  const zona = document.getElementById("zona-exportar");
  zona.hidden = !equipoId;
  document.getElementById("exportar-txt").disabled = !guardadoEnBd;
  document.getElementById("pista-exportar").textContent = guardadoEnBd
    ? "Descarga el equipo guardado en un archivo .txt que luego puedes importar."
    : "Guarda los cambios para poder exportar el equipo.";
}

document.getElementById("exportar-txt").addEventListener("click", () => {
  if (!guardadoEnBd) return;
  const datos = datosDelEquipo();
  const texto = exportarTxt({ ...datos, integrantes: equipo });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
  enlace.download = `${datos.nombre.replace(/[\\/:*?"<>|]/g, "_") || "equipo"}.txt`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  UI.aviso(`Se descargó «${enlace.download}».`, "exito");
});

// Código de Importar TXT: carga el equipo en el editor (no se guarda hasta pulsar Guardar)
const resultadoImportar = document.getElementById("resultado-importar");

function mostrarCartel(titulo, explicacion, detalles) {
  resultadoImportar.innerHTML = `
    <div class="cartel-error" role="alert">
      <p class="cartel-titulo"></p><p class="cartel-texto"></p><ul class="cartel-lista"></ul>
    </div>`;
  resultadoImportar.querySelector(".cartel-titulo").textContent = titulo;
  resultadoImportar.querySelector(".cartel-texto").textContent = explicacion;
  detalles.forEach(d => {
    const li = document.createElement("li");
    li.textContent = d;
    resultadoImportar.querySelector(".cartel-lista").appendChild(li);
  });
}

document.getElementById("importar-txt").addEventListener("change", async e => {
  const archivo = e.target.files[0];
  e.target.value = "";
  resultadoImportar.innerHTML = "";
  if (!archivo) return;
  if (!/\.txt$/i.test(archivo.name) || archivo.size > 100 * 1024) {
    return mostrarCartel("Archivo no válido", "Elige un archivo .txt de máximo 100 KB.", []);
  }
  if (equipo.length && !(await UI.confirmar({
    titulo: "¿Reemplazar el equipo actual?",
    mensaje: "El equipo importado ocupará el lugar del que tienes en el editor.",
    aceptar: "Sí, importar",
    cancelar: "No, cancelar"
  }))) return;

  try {
    const leido = leerTxt(await archivo.text());
    const integrantes = await resolverTxt(leido, conMovimientos);
    // Un equipo importado es nuevo: se guarda con POST como un equipo distinto
    equipoId = null;
    history.replaceState(null, "", "equipo.html");
    pintarTitulo();
    inputNombre.value = (leido.nombre || archivo.name.replace(/\.txt$/i, "")).slice(0, 30);
    selectFormato.value = leido.formato;
    cargarArquetipos();
    equipo = integrantes;
    seleccionado = 0;
    actualizarTodo();
    marcarCambios();
    UI.aviso(`Se importaron ${equipo.length} Pokémon. Revisa el equipo y pulsa Guardar.`, "exito");
  } catch (error) {
    if (error instanceof ErrorTxt && error.tipo === "formato") {
      mostrarCartel("Formato no válido", "El archivo no tiene el formato de un equipo exportado:", error.detalles);
    } else if (error instanceof ErrorTxt) {
      mostrarCartel("Equipo no compatible", "No se cargó el equipo. Esto no existe en el catálogo:", error.detalles);
    } else {
      mostrarCartel("No se pudo importar", error.message, []);
    }
  }
});

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
    buscador.value = "";
    agregar(primero);
  }
});

buscador.addEventListener("input", mostrarCatalogo);

// Inicio
function actualizarTodo() {
  mostrarDebilidades();
  mostrarExportar();
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

// Convierte un equipo guardado (GET /api/teams/:id) al formato del editor
async function cargarEquipoGuardado(id) {
  const { data } = await api.get(`/teams/${id}`);
  const integrantes = [];
  for (const i of data.integrantes) {
    const pokemon = buscarPokemon(i.pokemon.id) || POKEMONES.find(p => p.slug === i.pokemon.nombre);
    if (!pokemon) continue;
    await conMovimientos(pokemon);
    integrantes.push({
      ...crearIntegrante(pokemon),
      apodo: i.apodo || "",
      habilidad: i.habilidad?.nombre || "",
      objeto: i.objeto?.nombre || "Ninguno",
      naturaleza: i.naturaleza?.nombre || "",
      movimientos: [...i.movimientos.map(m => m.nombre), "", "", "", ""].slice(0, 4),
      evs: i.evs,
      ivs: i.ivs,
      nivel: i.nivel
    });
  }
  equipoId = data.id;
  inputNombre.value = data.nombre;
  selectFormato.value = FORMATO_SELECT[data.formato] || "Combate Individual";
  cargarArquetipos();
  selectArquetipo.value = data.arquetipo || "";
  equipo = integrantes;
  seleccionado = equipo.length ? 0 : -1;
  guardadoEnBd = true;
  pintarTitulo();
  pintarEstado("✓ Guardado", "guardado");
}

// Carga el catálogo completo (Pokémon, objetos y naturalezas) desde la BD antes de mostrar el editor
async function iniciar() {
  cargarArquetipos();
  const errorCarga = document.getElementById("error-carga");
  errorCarga.hidden = true;
  listaCatalogo.innerHTML = '<li class="vacio"><span class="cargando" aria-hidden="true"></span>Cargando Pokémon desde la base de datos...</li>';
  const parametros = new URLSearchParams(location.search);
  const idPedido = Number(parametros.get("id")) || null;

  try {
    const [, objetos, naturalezas] = await Promise.all([
      cargarPokemones(),
      api.get("/catalog/items"),
      api.get("/catalog/natures")
    ]);
    OBJETOS.splice(0, OBJETOS.length, "Ninguno", ...objetos.data.map(o => o.nombre));
    NATURALEZAS.splice(0, NATURALEZAS.length,
      ...naturalezas.data.map(n => ({ nombre: n.nombre, sube: n.sube || null, baja: n.baja || null })));
    if (idPedido) await cargarEquipoGuardado(idPedido);
  } catch (error) {
    const motivo = error.status === 404 ? "Ese equipo no existe o no es tuyo."
      : `No se pudo conectar con la base de datos: ${error.message}`;
    errorCarga.innerHTML = '<p><strong>No se pudo cargar el editor.</strong> <span></span></p>' +
      '<button type="button" class="boton-mini" id="reintentar-carga">Reintentar</button> ' +
      '<a class="boton-mini" href="mis-equipos.html">Ir a Mis equipos</a>';
    errorCarga.querySelector("span").textContent = motivo;
    errorCarga.hidden = false;
    document.getElementById("reintentar-carga").addEventListener("click", iniciar);
    listaCatalogo.innerHTML = '<li class="vacio">Catálogo no disponible.</li>';
    pintarEstado("Sin conexión", "pendiente");
    return;
  }

  if (!idPedido && await cargarBorrador()) {
    hayCambios = true;
    pintarEstado("● Borrador recuperado, sin guardar", "pendiente");
    UI.aviso("Recuperamos el equipo que estabas armando.", "info", { texto: "Empezar de cero", alHacerClic: empezarDeCero });
  }

  actualizarTodo();

  // Pokémon que llega desde el catálogo con "?agregar=Nombre"
  const pedido = buscarPokemon(parametros.get("agregar"));
  if (parametros.has("agregar")) history.replaceState(null, "", equipoId ? `equipo.html?id=${equipoId}` : "equipo.html");
  if (pedido && estaEnEquipo(pedido)) {
    UI.aviso(`${pedido.nombre} ya está en tu equipo.`, "info");
  } else if (pedido && equipo.length >= 6) {
    UI.aviso(`No se pudo agregar a ${pedido.nombre}: tu equipo ya tiene 6. Quita uno primero.`, "error");
  } else if (pedido) {
    await agregar(pedido);
  }

  // Desde el menú "Importar equipo" (equipo.html#importar): lleva al botón Importar TXT
  if (location.hash === "#importar") {
    document.getElementById("importar").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("importar-txt").focus({ preventScroll: true });
  }
}

iniciar();
