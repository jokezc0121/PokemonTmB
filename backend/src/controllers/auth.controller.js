const authService = require("../services/auth.service");
const usuarios = require("../services/usuarios.service");

async function registrar(req, res) {
  const { usuario, token, expiraEn } = await authService.registrar(req.datos.body);
  res.status(201).json({ data: { usuario: await usuarios.usuarioDTO(usuario), token, expiraEn } });
}

async function iniciarSesion(req, res) {
  const { usuario, token, expiraEn } = await authService.iniciarSesion(req.datos.body);
  res.json({ data: { usuario: await usuarios.usuarioDTO(usuario), token, expiraEn } });
}

async function cerrarSesion(req, res) {
  await authService.cerrarSesion(req.sesionId);
  res.status(204).end();
}

async function yo(req, res) {
  res.json({ data: await usuarios.obtenerPerfil(req.usuario.id) });
}

module.exports = { registrar, iniciarSesion, cerrarSesion, yo };
