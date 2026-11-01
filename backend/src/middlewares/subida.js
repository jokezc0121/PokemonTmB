const multer = require("multer");
const { REGLAS_ARCHIVOS } = require("../domain/archivos");

function subirArchivo(campo, categorias) {
  const maximo = Math.max(...categorias.map((c) => REGLAS_ARCHIVOS[c].maxBytes));
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maximo, files: 1, fields: 10 },
  }).single(campo);
}

module.exports = { subirArchivo };
