const supabase = require("../config/supabase");
const { errores, verificar } = require("../utils/errores");
const { COLUMNAS_USUARIO } = require("./auth.service");
const archivos = require("./archivos.service");
const catalogo = require("./catalogo.service");

async function favoritoDTO(id) {
  if (!id) return null;
  const cat = await catalogo.obtener();
  const p = cat.pokemon.get(id);
  return p ? catalogo.pokemonResumenDTO(cat, p) : null;
}

async function resolverFavorito(valor) {
  if (valor === null) return null;
  const cat = await catalogo.obtener();
  const id = catalogo.resolverId(cat, "pokemon", valor);
  if (!id) {
    throw errores.validacion("Revisa el Pokémon favorito.", [{ campo: "pokemonFavorito", mensaje: "Pokémon no encontrado." }]);
  }
  return id;
}

async function usuarioDTO(u) {
  let avatar = null;
  if (u.avatar_archivo_id) {
    const fila = verificar(
      await supabase.from("archivo").select("id, ruta, nombre_original").eq("id", u.avatar_archivo_id).maybeSingle(),
      "Buscando avatar"
    );
    if (fila) avatar = { id: fila.id, url: await archivos.urlFirmada(fila) };
  }
  return {
    id: u.id,
    nombreEntrenador: u.nombreUsuario,
    correo: u.correo,
    rol: u.rol,
    biografia: u.biografia,
    formatoPreferido: u.formato_preferido,
    avatar,
    pokemonFavorito: await favoritoDTO(u.pokemon_favorito_id),
    creadoEn: u.creado_en,
  };
}

async function buscar(id) {
  const u = verificar(
    await supabase.from("usuario").select(COLUMNAS_USUARIO).eq("id", id).maybeSingle(),
    "Buscando usuario"
  );
  if (!u) throw errores.noEncontrado("Usuario no encontrado.");
  return u;
}

async function obtenerPerfil(id) {
  return usuarioDTO(await buscar(id));
}

async function actualizarPerfil(id, { nombreEntrenador, biografia, formatoPreferido, pokemonFavorito }) {
  const cambios = { actualizado_en: new Date().toISOString() };
  if (nombreEntrenador !== undefined) cambios.nombreUsuario = nombreEntrenador;
  if (biografia !== undefined) cambios.biografia = biografia;
  if (formatoPreferido !== undefined) cambios.formato_preferido = formatoPreferido;
  if (pokemonFavorito !== undefined) cambios.pokemon_favorito_id = await resolverFavorito(pokemonFavorito);

  const u = verificar(
    await supabase.from("usuario").update(cambios).eq("id", id).select(COLUMNAS_USUARIO).single(),
    "Actualizando perfil"
  );
  return usuarioDTO(u);
}

async function cambiarAvatar(id, archivo) {
  const anterior = (await buscar(id)).avatar_archivo_id;
  const nuevo = await archivos.guardarSubido({ usuarioId: id, categoria: "avatar", archivo });

  verificar(
    await supabase.from("usuario").update({ avatar_archivo_id: nuevo.id, actualizado_en: new Date().toISOString() }).eq("id", id),
    "Asignando avatar"
  );
  if (anterior) await archivos.eliminar(id, anterior).catch(() => {});
  return obtenerPerfil(id);
}

async function quitarAvatar(id) {
  const anterior = (await buscar(id)).avatar_archivo_id;
  if (!anterior) throw errores.noEncontrado("No tienes foto de perfil.");
  await archivos.eliminar(id, anterior);
  return obtenerPerfil(id);
}

module.exports = { usuarioDTO, obtenerPerfil, actualizarPerfil, cambiarAvatar, quitarAvatar };
