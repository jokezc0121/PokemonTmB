// Código del catálogo
const tabla = document.getElementById("tabla-pokemon");
const buscador = document.getElementById("buscar");
const filtroTipo = document.getElementById("filtro-tipo");
const ordenar = document.getElementById("ordenar");
const botonLimpiar = document.getElementById("limpiar");
const botonMas = document.getElementById("mostrar-mas");

// Cuántos Pokémon se muestran por tanda
const POR_PAGINA = 10;
let visibles = POR_PAGINA;

function cargarTipos() {
  const tipos = [...new Set(POKEMONES.flatMap(p => p.tipos))].sort();
  filtroTipo.innerHTML += tipos.map(t => `<option value="${t}">${t}</option>`).join("");
}

function ordenarLista(lista, orden) {
  return lista.sort((a, b) => {
    if (orden === "nombre") return a.nombre.localeCompare(b.nombre);
    if (orden === "total") return totalBase(b) - totalBase(a);
    return b.base[orden] - a.base[orden];
  });
}

function filaPokemon(p, orden) {
  const celda = (clave, valor, clase = "") =>
    `<td class="${clase} ${clave === orden ? "columna-activa" : ""}">${valor}</td>`;
  const stats = ["ps", "atq", "def", "ate", "dfe", "vel"].map(c => celda(c, p.base[c])).join("");

  return `<tr>
    <td>${htmlImagen(p)}</td>
    <td class="nombre">${p.nombre}</td>
    <td>${htmlTipos(p.tipos)}</td>
    <td class="habilidad">${p.habilidades.join("<br>")}</td>
    <td class="habilidad">${p.oculta || '<span title="Este Pokémon no tiene habilidad oculta">Ninguna</span>'}</td>
    ${stats}
    ${celda("total", totalBase(p), "total")}
    <td><a class="boton-mini" href="equipo.html?agregar=${encodeURIComponent(p.nombre)}" aria-label="Agregar ${p.nombre} a mi equipo">+ Agregar</a></td>
  </tr>`;
}

function mostrarCatalogo() {
  const texto = buscador.value.trim();
  const tipo = filtroTipo.value;
  const orden = ordenar.value;

  const lista = ordenarLista(
    POKEMONES.filter(p => coincideBusqueda(p, texto) && (tipo === "" || p.tipos.includes(tipo))),
    orden
  );

  const pagina = lista.slice(0, visibles);
  tabla.innerHTML = lista.length
    ? pagina.map(p => filaPokemon(p, orden)).join("")
    : `<tr><td colspan="13" class="vacio">No hay Pokémon que coincidan con tu búsqueda.<br>
       Revisa cómo está escrito o <button type="button" class="enlace-boton" id="limpiar-vacio">limpia los filtros</button>.</td></tr>`;
  document.getElementById("limpiar-vacio")?.addEventListener("click", limpiarFiltros);

  const hayFiltros = texto !== "" || tipo !== "";
  document.getElementById("resultados").textContent = hayFiltros
    ? `Mostrando ${lista.length} de ${POKEMONES.length} Pokémon`
    : `${POKEMONES.length} Pokémon en el catálogo`;
  botonLimpiar.hidden = !hayFiltros;

  // Botón "Mostrar más": solo aparece si quedan Pokémon por ver
  const restantes = lista.length - pagina.length;
  document.getElementById("paginacion").hidden = lista.length === 0;
  document.getElementById("contador-visibles").textContent = `Viendo ${pagina.length} de ${lista.length}`;
  botonMas.hidden = restantes <= 0;
  botonMas.textContent = `Mostrar ${Math.min(POR_PAGINA, restantes)} más`;

  document.querySelectorAll(".ordenable").forEach(b => {
    const activo = b.dataset.orden === orden;
    b.classList.toggle("activo", activo);
    b.parentElement.setAttribute("aria-sort", activo ? (orden === "nombre" ? "ascending" : "descending") : "none");
  });
}

// Al cambiar la búsqueda, el filtro o el orden se vuelve a empezar desde los primeros 10
function reiniciarCatalogo() {
  visibles = POR_PAGINA;
  mostrarCatalogo();
}

function limpiarFiltros() {
  buscador.value = "";
  filtroTipo.value = "";
  reiniciarCatalogo();
  buscador.focus();
}

// Ordenar con clic en los encabezados de la tabla
document.querySelectorAll(".ordenable").forEach(b =>
  b.addEventListener("click", () => {
    ordenar.value = b.dataset.orden;
    reiniciarCatalogo();
  }));

buscador.addEventListener("input", reiniciarCatalogo);
filtroTipo.addEventListener("change", reiniciarCatalogo);
ordenar.addEventListener("change", reiniciarCatalogo);
botonLimpiar.addEventListener("click", limpiarFiltros);

botonMas.addEventListener("click", () => {
  const primeraNueva = visibles;
  visibles += POR_PAGINA;
  mostrarCatalogo();
  // Lleva el foco a la primera fila nueva para quien navega con teclado
  tabla.rows[primeraNueva]?.querySelector("a")?.focus({ preventScroll: true });
});

tabla.innerHTML = `<tr><td colspan="13" class="vacio">Cargando catálogo...</td></tr>`;

cargarPokemones()
  .catch(error => UI.aviso(`No se pudo cargar el catálogo: ${error.message}`, "error"))
  .finally(() => {
    cargarTipos();
    mostrarCatalogo();
  });