// Código del perfil
const usuario = {
  nombre: "AshCali",
  correo: "ash@correo.com",
  favorito: "Garchomp"
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

function mostrarFavorito() {
  const p = buscarPokemon(usuario.favorito);
  const img = document.getElementById("favorito-img");
  img.src = imagenPokemon(p);
  img.alt = `Tu Pokémon favorito: ${p.nombre}`;

  document.getElementById("favorito-nombre").textContent = p.nombre;
  document.getElementById("favorito-tipos").innerHTML = htmlTipos(p.tipos);
  document.getElementById("favorito-habilidades").textContent =
    `Habilidades: ${p.habilidades.join(", ")}` + (p.oculta ? ` · Oculta: ${p.oculta}` : "");

  document.getElementById("favorito-stats").innerHTML =
    Object.keys(NOMBRES_STATS).map(c => htmlBarraStat(NOMBRES_STATS[c], p.base[c])).join("") +
    `<div class="stat stat-total"><span>Total</span><div></div><b>${totalBase(p)}</b></div>`;
}

selectFavorito.innerHTML = POKEMONES
  .map(p => `<option value="${p.nombre}"${p.nombre === usuario.favorito ? " selected" : ""}>${p.nombre}</option>`)
  .join("");

selectFavorito.addEventListener("change", () => {
  const anterior = usuario.favorito;
  usuario.favorito = selectFavorito.value;
  mostrarFavorito();
  UI.aviso(`Ahora tu favorito es ${usuario.favorito}.`, "exito", {
    texto: "Deshacer",
    alHacerClic: () => {
      usuario.favorito = anterior;
      selectFavorito.value = anterior;
      mostrarFavorito();
    }
  });
});

// Inicio
document.getElementById("nombre-entrenador").textContent = "";
document.getElementById("correo-entrenador").textContent = "";
document.getElementById("bio-entrenador").textContent = "";
mostrarFavorito();

sesionLista.then(u => {
  if (!u) return;
  document.getElementById("nombre-entrenador").textContent = u.nombreEntrenador;
  document.getElementById("correo-entrenador").textContent = u.correo;
  document.getElementById("bio-entrenador").textContent = u.biografia || "";
  if (u.avatar) foto.src = u.avatar.url;
});
