// Código de "Mis equipos": muestra los equipos del usuario guardados en la base de datos
const listaEquipos = document.getElementById("lista-equipos");
const estadoLista = document.getElementById("estado-lista");
const totalEquipos = document.getElementById("total-equipos");

const FORMATOS = { individual: "Combate Individual", doble: "Combate Doble" };

const fechaCorta = iso => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

// Sprites de los Pokémon del equipo (máximo 6)
function htmlSprites(integrantes) {
  if (!integrantes.length) return '<li class="sin-pokemon">Sin Pokémon</li>';
  return integrantes.slice(0, 6).map(i => {
    const nombre = escapar(i.apodo || i.nombreMostrar);
    return `<li><img class="sprite" src="${escapar(i.sprite || IMAGEN_POR_DEFECTO)}" alt="${nombre}" title="${nombre}" loading="lazy"></li>`;
  }).join("");
}

function tarjetaEquipo(equipo) {
  const li = document.createElement("li");
  li.className = "tarjeta-equipo";
  li.innerHTML = `
    <h2 class="tarjeta-equipo-nombre"></h2>
    <p class="tarjeta-equipo-meta">${FORMATOS[equipo.formato] || escapar(equipo.formato)} · ${equipo.integrantes.length}/6 Pokémon</p>
    <ul class="sprites-equipo" aria-label="Pokémon del equipo">${htmlSprites(equipo.integrantes)}</ul>
    <p class="tarjeta-equipo-fecha">Creado el <time datetime="${escapar(equipo.creadoEn)}">${fechaCorta(equipo.creadoEn)}</time></p>
    <a class="boton-mini tarjeta-equipo-editar" href="equipo.html?id=${equipo.id}">Editar</a>`;
  // textContent evita inyectar HTML desde el nombre que escribió el usuario
  li.querySelector(".tarjeta-equipo-nombre").textContent = equipo.nombre;
  li.querySelector(".tarjeta-equipo-editar").setAttribute("aria-label", `Editar ${equipo.nombre}`);
  return li;
}

function mostrarEquipos(equipos) {
  totalEquipos.textContent = equipos.length ? `(${equipos.length})` : "";
  listaEquipos.innerHTML = "";

  if (equipos.length === 0) {
    estadoLista.innerHTML = `
      <div class="panel estado-vacio">
        <p class="estado-vacio-titulo">Aún no tienes equipos</p>
        <p>Arma tu primer equipo y aparecerá aquí.</p>
        <a href="equipo.html" class="boton boton-principal">Crear equipo</a>
      </div>`;
    return;
  }

  estadoLista.innerHTML = "";
  equipos.forEach(equipo => listaEquipos.appendChild(tarjetaEquipo(equipo)));
}

async function cargarEquipos() {
  estadoLista.innerHTML = '<p class="ayuda"><span class="cargando" aria-hidden="true"></span>Cargando tus equipos...</p>';
  listaEquipos.innerHTML = "";
  try {
    const respuesta = await api.get("/teams");
    mostrarEquipos(respuesta.data);
  } catch (error) {
    totalEquipos.textContent = "";
    estadoLista.innerHTML = `
      <div class="panel caja-error" role="alert">
        <p><strong>No se pudieron cargar tus equipos.</strong> <span id="motivo-error"></span></p>
        <button type="button" class="boton-mini" id="reintentar">Reintentar</button>
      </div>`;
    document.getElementById("motivo-error").textContent = error.message;
    document.getElementById("reintentar").addEventListener("click", cargarEquipos);
  }
}

cargarEquipos();
