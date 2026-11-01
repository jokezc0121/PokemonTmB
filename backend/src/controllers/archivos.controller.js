const archivos = require("../services/archivos.service");

async function listar(req, res) {
  const { categoria, equipo, limite } = req.datos.query;
  res.json({ data: await archivos.listar(req.usuario.id, { categoria, equipoId: equipo, limite }) });
}

async function obtener(req, res) {
  res.json({ data: await archivos.obtener(req.usuario.id, req.datos.params.id, req.datos.query) });
}

async function eliminar(req, res) {
  await archivos.eliminar(req.usuario.id, req.datos.params.id);
  res.status(204).end();
}

module.exports = { listar, obtener, eliminar };
