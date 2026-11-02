// Código del perfil
const usuario = {
  nombre: "AshCali",
  correo: "ash@correo.com",
  favorito: null
};

// Código de la foto de perfil
const foto = document.getElementById("foto");
const inputFoto = document.getElementById("subir-foto");
const errorFoto = document.getElementById("error-foto");
const TIPOS_FOTO = ["image/png", "image/jpeg", "image/webp"];
const PESO_MAXIMO = 2 * 1024 * 1024;

foto.src = IMAGEN_POR_DEFECTO;

const textoPeso = bytes => (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";

function errorDeFoto(archivo) {
  if (!TIPOS_FOTO.includes(archivo.type)) {
    const extension = archivo.name.includes(".") ? archivo.name.split(".").pop().toUpperCase() : "desconocido";
    return `El archivo es ${extension}. Elige una imagen JPG, PNG o WEBP.`;
  }
  if (archivo.size > PESO_MAXIMO) {
    return `Tu imagen pesa ${textoPeso(archivo.size)} y el máximo es 2 MB. Prueba recortarla o comprimirla.`;
  }
  return "";
}

document.getElementById("cambiar-foto").addEventListener("click", () => inputFoto.click());

inputFoto.addEventListener("change", e => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  errorFoto.textContent = errorDeFoto(archivo);
  inputFoto.value = "";
  if (errorFoto.textContent) return;

  const anterior = foto.src;
  foto.src = URL.createObjectURL(archivo);
  UI.aviso("Foto de perfil actualizada.", "exito", {
    texto: "Deshacer",
    alHacerClic: () => {
      foto.src = anterior;
      UI.aviso("Se restauró tu foto anterior.", "info");
    }
  });
});


// Código del Pokémon favorito
const selectFavorito = document.getElementById("elegir-favorito");

// Mostrar la información del Pokémon seleccionado
function mostrarFavorito() {
  const pokemon = POKEMONES.find(
    p => String(p.id) === String(usuario.favorito)
  );

  if (!pokemon) return;

  const imagen = document.getElementById("favorito-img");
  imagen.src = imagenPokemon(pokemon);
  imagen.alt = pokemon.nombre;

  document.getElementById("favorito-nombre").textContent =
    pokemon.nombre;

  document.getElementById("favorito-tipos").innerHTML =
    htmlTipos(pokemon.tipos);

  document.getElementById("favorito-habilidades").textContent =
    `Habilidades: ${pokemon.habilidades.join(", ")}` +
    (pokemon.oculta ? ` · Oculta: ${pokemon.oculta}` : "");

  document.getElementById("favorito-stats").innerHTML =
    Object.keys(NOMBRES_STATS)
      .map(stat =>
        htmlBarraStat(NOMBRES_STATS[stat], pokemon.base[stat])
      )
      .join("") +
    `<div class="stat stat-total">
      <span>Total</span><div></div>
      <b>${totalBase(pokemon)}</b>
    </div>`;
}

// Cargar perfil y Pokémon desde Supabase
async function iniciarPerfil() {
  selectFavorito.disabled = true;
  selectFavorito.innerHTML =
    '<option value="">Cargando Pokémon...</option>';

  try {
    // Cargar catálogo desde Supabase
    await cargarPokemones();

    // Llenar el selector
    selectFavorito.innerHTML =
      '<option value="">Selecciona un Pokémon</option>';

    POKEMONES.forEach(pokemon => {
      const opcion = document.createElement("option");

      opcion.value = pokemon.id;
      opcion.textContent = pokemon.nombre;

      selectFavorito.appendChild(opcion);
    });

    // Obtener el favorito del usuario
    const respuesta = await api.get("/users/me");
    const perfil = respuesta.data;

    pintarDatosPerfil(perfil);

    usuario.favorito =
      perfil.pokemonFavorito?.id ??
      perfil.pokemonFavorito ??
      null;

    if (usuario.favorito !== null) {
      selectFavorito.value = String(usuario.favorito);
      mostrarFavorito();
    }

    selectFavorito.disabled = false;

  } catch (error) {
    console.error("Error al cargar perfil:", error);

    selectFavorito.innerHTML =
      '<option value="">Error al cargar Pokémon</option>';

    UI.aviso(
      `Error al cargar los Pokémon: ${error.message}`,
      "error"
    );
  }
}

// Guardar favorito en Supabase
selectFavorito.addEventListener("change", async () => {
  const anterior = usuario.favorito;

  const nuevo = selectFavorito.value
    ? Number(selectFavorito.value)
    : null;

  selectFavorito.disabled = true;

  try {
    const respuesta = await api.put("/users/me", {
      pokemonFavorito: nuevo
    });

    usuario.favorito =
      respuesta.data.pokemonFavorito?.id ?? nuevo;

    if (usuario.favorito !== null) {
      mostrarFavorito();
    }

    UI.aviso(
      "Pokémon favorito guardado correctamente.",
      "exito"
    );

  } catch (error) {
    usuario.favorito = anterior;
    selectFavorito.value = anterior ?? "";

    UI.aviso(
      `No se pudo guardar el favorito: ${error.message}`,
      "error"
    );
  } finally {
    selectFavorito.disabled = false;
  }
});

// Código para editar el perfil (nombre, biografía y formato favorito)
const formPerfil = document.getElementById("form-perfil");
const campoNombre = document.getElementById("editar-nombre");
const campoBio = document.getElementById("editar-biografia");
const campoFormato = document.getElementById("editar-formato");
const botonActualizar = document.getElementById("actualizar-perfil");
const botonDescartar = document.getElementById("descartar-perfil");
const mensajePerfil = document.getElementById("mensaje-perfil");
const contadorBio = document.getElementById("contador-biografia");

const MAX_BIO = 300;
const NOMBRES_FORMATO = { individual: "Individual", doble: "Doble" };

// Lo último que está guardado en la base de datos, para saber si hay cambios
let perfilGuardado = null;

const valoresFormulario = () => ({
  nombreEntrenador: campoNombre.value.trim(),
  biografia: campoBio.value.trim(),
  formatoPreferido: campoFormato.value
});

// Muestra los datos en la tarjeta de arriba y los carga en el formulario
function pintarDatosPerfil(perfil) {
  perfilGuardado = {
    nombreEntrenador: perfil.nombreEntrenador || "",
    biografia: perfil.biografia || "",
    formatoPreferido: perfil.formatoPreferido || ""
  };

  document.getElementById("nombre-entrenador").textContent = perfil.nombreEntrenador;
  document.getElementById("correo-entrenador").textContent = perfil.correo;
  document.getElementById("bio-entrenador").textContent = perfil.biografia || "Sin biografía";
  document.getElementById("resumen-formato").textContent =
    NOMBRES_FORMATO[perfil.formatoPreferido] || "—";

  campoNombre.value = perfilGuardado.nombreEntrenador;
  campoBio.value = perfilGuardado.biografia;
  campoFormato.value = perfilGuardado.formatoPreferido;
  ["editar-nombre", "editar-biografia", "editar-formato"].forEach(id => errorCampoPerfil(id, ""));
  revisarCambios();
}

function errorCampoPerfil(id, texto) {
  const input = document.getElementById(id);
  document.getElementById("error-" + id).textContent = texto;
  input.classList.toggle("invalido", texto !== "");
  if (texto) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
  return texto === "";
}

function validarNombrePerfil() {
  const nombre = campoNombre.value.trim();
  let texto = "";
  if (nombre === "") texto = "Escribe tu nombre de entrenador.";
  else if (nombre.length < 3) texto = `Te faltan ${3 - nombre.length} caracteres (mínimo 3).`;
  else if (nombre.length > 30) texto = "Máximo 30 caracteres.";
  return errorCampoPerfil("editar-nombre", texto);
}

function validarBioPerfil() {
  const largo = campoBio.value.trim().length;
  return errorCampoPerfil("editar-biografia", largo > MAX_BIO ? `Máximo ${MAX_BIO} caracteres (tienes ${largo}).` : "");
}

// Activa los botones solo cuando algo cambió respecto a lo guardado
function revisarCambios() {
  contadorBio.textContent = `${campoBio.value.length} / ${MAX_BIO} caracteres`;
  const actual = valoresFormulario();
  const hayCambios = !!perfilGuardado &&
    Object.keys(actual).some(clave => actual[clave] !== perfilGuardado[clave]);
  botonActualizar.disabled = !hayCambios;
  botonDescartar.disabled = !hayCambios;
  if (hayCambios) {
    mensajePerfil.className = "mensaje";
    mensajePerfil.textContent = "Tienes cambios sin guardar.";
  } else if (mensajePerfil.textContent === "Tienes cambios sin guardar.") {
    mensajePerfil.textContent = "";
  }
  return hayCambios;
}

campoNombre.addEventListener("input", () => {
  if (campoNombre.classList.contains("invalido")) validarNombrePerfil();
  revisarCambios();
});
campoNombre.addEventListener("blur", validarNombrePerfil);
campoBio.addEventListener("input", () => { validarBioPerfil(); revisarCambios(); });
campoFormato.addEventListener("change", revisarCambios);

botonDescartar.addEventListener("click", () => {
  campoNombre.value = perfilGuardado.nombreEntrenador;
  campoBio.value = perfilGuardado.biografia;
  campoFormato.value = perfilGuardado.formatoPreferido;
  ["editar-nombre", "editar-biografia", "editar-formato"].forEach(id => errorCampoPerfil(id, ""));
  revisarCambios();
  UI.aviso("Se descartaron los cambios.", "info");
});

// Campos que devuelve el servidor en los errores 400 → id del input
const CAMPOS_PERFIL = {
  nombreEntrenador: "editar-nombre",
  biografia: "editar-biografia",
  formatoPreferido: "editar-formato"
};

formPerfil.addEventListener("submit", async e => {
  e.preventDefault();
  const nombreOk = validarNombrePerfil();
  const bioOk = validarBioPerfil();
  if (!nombreOk || !bioOk) {
    mensajePerfil.className = "mensaje mensaje-error";
    mensajePerfil.textContent = "Revisa los campos marcados en rosa.";
    formPerfil.querySelector(".invalido")?.focus();
    return;
  }
  if (!revisarCambios()) return;

  // Solo se envían los campos que cambiaron
  const actual = valoresFormulario();
  const cambios = {};
  Object.keys(actual).forEach(clave => {
    if (actual[clave] !== perfilGuardado[clave]) cambios[clave] = actual[clave] === "" ? null : actual[clave];
  });

  const textoBoton = botonActualizar.textContent;
  botonActualizar.disabled = true;
  botonDescartar.disabled = true;
  botonActualizar.innerHTML = '<span class="cargando" aria-hidden="true"></span>Guardando...';
  mensajePerfil.className = "mensaje";
  mensajePerfil.textContent = "";

  try {
    const respuesta = await api.put("/users/me", cambios);
    pintarDatosPerfil(respuesta.data);
    // Actualiza el nombre de la esquina derecha de la barra
    sesionLocal.actualizarUsuario(respuesta.data);
    mensajePerfil.className = "mensaje mensaje-exito";
    mensajePerfil.textContent = "Perfil actualizado.";
    UI.aviso("Tu perfil se actualizó correctamente.", "exito");
  } catch (error) {
    revisarCambios();
    error.detalles.forEach(d => { if (CAMPOS_PERFIL[d.campo]) errorCampoPerfil(CAMPOS_PERFIL[d.campo], d.mensaje); });
    mensajePerfil.className = "mensaje mensaje-error";
    mensajePerfil.textContent = `No se pudo actualizar: ${error.message}`;
    formPerfil.querySelector(".invalido")?.focus();
  } finally {
    botonActualizar.textContent = textoBoton;
  }
});

// Inicializar página
iniciarPerfil();