const equipos = require("../services/equipos.service");

const uid = (req) => req.usuario.id;
const eid = (req) => req.datos.params.id;

function respuestaGuardado(resultado) {
  const { equipo, ...meta } = resultado;
  return { data: equipo, meta };
}

async function listar(req, res) {
  res.json({ data: await equipos.listar(uid(req), req.datos.query) });
}

async function obtener(req, res) {
  res.json({ data: await equipos.obtener(uid(req), eid(req)) });
}

async function crear(req, res) {
  const resultado = await equipos.crear(uid(req), req.datos.body);
  res.status(201).location(`/api/teams/${resultado.equipo.id}`).json(respuestaGuardado(resultado));
}

async function actualizar(req, res) {
  res.json(respuestaGuardado(await equipos.actualizar(uid(req), eid(req), req.datos.body)));
}

async function eliminar(req, res) {
  await equipos.eliminar(uid(req), eid(req));
  res.status(204).end();
}

async function duplicar(req, res) {
  const resultado = await equipos.duplicar(uid(req), eid(req));
  res.status(201).location(`/api/teams/${resultado.equipo.id}`).json(respuestaGuardado(resultado));
}

async function previsualizar(req, res) {
  res.json({ data: await equipos.previsualizar(req.datos.body, req.datos.query.stat) });
}

async function analizar(req, res) {
  res.json({ data: await equipos.analizar(uid(req), eid(req)) });
}

async function recomendar(req, res) {
  res.json({ data: await equipos.recomendar(uid(req), eid(req), req.datos.query.stat) });
}

async function listarVersiones(req, res) {
  res.json({ data: await equipos.listarVersiones(uid(req), eid(req)) });
}

async function obtenerVersion(req, res) {
  const { id, numero } = req.datos.params;
  res.json({ data: await equipos.obtenerVersion(uid(req), id, numero) });
}

async function restaurarVersion(req, res) {
  const { id, numero } = req.datos.params;
  res.json(respuestaGuardado(await equipos.restaurarVersion(uid(req), id, numero)));
}

async function compartir(req, res) {
  res.json({ data: await equipos.compartir(uid(req), eid(req), req.datos.body.publico) });
}

async function exportar(req, res) {
  res.status(201).json({ data: await equipos.exportar(uid(req), eid(req), req.datos.body.formato) });
}

async function importar(req, res) {
  const resultado = await equipos.importar(uid(req), req.file, req.datos.body);
  res.status(201).location(`/api/teams/${resultado.equipo.id}`).json(respuestaGuardado(resultado));
}

async function subirAdjunto(req, res) {
  res.status(201).json({ data: await equipos.subirAdjunto(uid(req), eid(req), req.file, req.datos.body.categoria) });
}

async function listarArchivos(req, res) {
  res.json({ data: await equipos.listarArchivos(uid(req), eid(req)) });
}

async function obtenerPublico(req, res) {
  res.json({ data: await equipos.obtenerPublico(req.params.enlace) });
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  duplicar,
  previsualizar,
  analizar,
  recomendar,
  listarVersiones,
  obtenerVersion,
  restaurarVersion,
  compartir,
  exportar,
  importar,
  subirAdjunto,
  listarArchivos,
  obtenerPublico,
};
