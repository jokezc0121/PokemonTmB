const catalogo = require("../services/catalogo.service");
const { errores } = require("../utils/errores");

async function buscarPokemon(req, res) {
  res.json(await catalogo.buscarPokemon(req.datos.query));
}

async function obtenerPokemon(req, res) {
  const pokemon = await catalogo.obtenerPokemon(req.params.id);
  if (!pokemon) throw errores.noEncontrado("Pokémon no encontrado.");
  res.json({ data: pokemon });
}

async function listarTipos(req, res) {
  res.json({ data: await catalogo.listarTipos() });
}

async function listarNaturalezas(req, res) {
  res.json({ data: await catalogo.listarNaturalezas() });
}

async function listarObjetos(req, res) {
  res.json({ data: await catalogo.listarObjetos() });
}

async function listarRegulaciones(req, res) {
  res.json({ data: await catalogo.listarRegulaciones() });
}

module.exports = { buscarPokemon, obtenerPokemon, listarTipos, listarNaturalezas, listarObjetos, listarRegulaciones };
