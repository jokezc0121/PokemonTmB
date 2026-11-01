const multer = require("multer");
const { HttpError } = require("../utils/errores");
const env = require("../config/env");

function rutaNoEncontrada(req, res) {
  res.status(404).json({
    error: { codigo: "NO_ENCONTRADO", mensaje: `No existe la ruta ${req.method} ${req.originalUrl}` },
  });
}

function manejarErrores(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { codigo: err.codigo, mensaje: err.message, ...(err.detalles && { detalles: err.detalles }) },
    });
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const mensaje =
      err.code === "LIMIT_FILE_SIZE" ? "El archivo supera el tamaño máximo permitido." : `Error en la subida: ${err.message}`;
    return res.status(status).json({ error: { codigo: err.code, mensaje } });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { codigo: "JSON_INVALIDO", mensaje: "El cuerpo de la petición no es JSON válido." } });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({
    error: {
      codigo: "ERROR_INTERNO",
      mensaje: "Ocurrió un error inesperado en el servidor.",
      ...(env.nodeEnv !== "production" && { depuracion: err.message }),
    },
  });
}

module.exports = { rutaNoEncontrada, manejarErrores };
