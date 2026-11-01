// Código del catálogo
const tabla = document.getElementById("tabla-pokemon");
const buscador = document.getElementById("buscar");
const filtroTipo = document.getElementById("filtro-tipo");
const ordenar = document.getElementById("ordenar");
const botonLimpiar = document.getElementById("limpiar");

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

  tabla.innerHTML = lista.length
    ? lista.map(p => filaPokemon(p, orden)).join("")
    : `<tr><td colspan="13" class="vacio">No hay Pokémon que coincidan con tu búsqueda.<br>
       Revisa cómo está escrito o <button type="button" class="enlace-boton" id="limpiar-vacio">limpia los filtros</button>.</td></tr>`;
  document.getElementById("limpiar-vacio")?.addEventListener("click", limpiarFiltros);

  const hayFiltros = texto !== "" || tipo !== "";
  document.getElementById("resultados").textContent = hayFiltros
    ? `Mostrando ${lista.length} de ${POKEMONES.length} Pokémon`
    : `${POKEMONES.length} Pokémon en el catálogo`;
  botonLimpiar.hidden = !hayFiltros;

  document.querySelectorAll(".ordenable").forEach(b => {
    const activo = b.dataset.orden === orden;
    b.classList.toggle("activo", activo);
    b.parentElement.setAttribute("aria-sort", activo ? (orden === "nombre" ? "ascending" : "descending") : "none");
  });
}

function limpiarFiltros() {
  buscador.value = "";
  filtroTipo.value = "";
  mostrarCatalogo();
  buscador.focus();
}

// Ordenar con clic en los encabezados de la tabla
document.querySelectorAll(".ordenable").forEach(b =>
  b.addEventListener("click", () => {
    ordenar.value = b.dataset.orden;
    mostrarCatalogo();
  }));

buscador.addEventListener("input", mostrarCatalogo);
filtroTipo.addEventListener("change", mostrarCatalogo);
ordenar.addEventListener("change", mostrarCatalogo);
botonLimpiar.addEventListener("click", limpiarFiltros);

tabla.innerHTML = `<tr><td colspan="13" class="vacio">Cargando catálogo...</td></tr>`;

cargarPokemones()
  .catch(error => UI.aviso(`No se pudo cargar el catálogo: ${error.message}`, "error"))
  .finally(() => {
    cargarTipos();
    mostrarCatalogo();
  });
