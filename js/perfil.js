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

    document.getElementById("nombre-entrenador").textContent =
      perfil.nombreEntrenador;

    document.getElementById("correo-entrenador").textContent =
      perfil.correo;

    document.getElementById("bio-entrenador").textContent =
      perfil.biografia || "Sin biografía";

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

// Inicializar página
iniciarPerfil();
