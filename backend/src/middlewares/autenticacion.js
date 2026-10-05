const authService = require("../services/auth.service");
const { errores } = require("../utils/errores");

async function requiereSesion(req, res, next) {
  const cabecera = req.headers.authorization || "";
  const [esquema, token] = cabecera.split(" ");
  if (esquema !== "Bearer" || !token) {
    throw errores.noAutenticado();
  }

  const sesion = await authService.verificarToken(token);
  req.usuario = { id: sesion.usuarioId };
  req.sesionId = sesion.sesionId;
  next();
}

module.exports = { requiereSesion };
