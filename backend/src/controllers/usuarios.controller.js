const usuarios = require("../services/usuarios.service");

async function obtenerPerfil(req, res) {
  res.json({ data: await usuarios.obtenerPerfil(req.usuario.id) });
}

async function actualizarPerfil(req, res) {
  res.json({ data: await usuarios.actualizarPerfil(req.usuario.id, req.datos.body) });
}

async function cambiarAvatar(req, res) {
  res.json({ data: await usuarios.cambiarAvatar(req.usuario.id, req.file) });
}

async function quitarAvatar(req, res) {
  res.json({ data: await usuarios.quitarAvatar(req.usuario.id) });
}

module.exports = { obtenerPerfil, actualizarPerfil, cambiarAvatar, quitarAvatar };
