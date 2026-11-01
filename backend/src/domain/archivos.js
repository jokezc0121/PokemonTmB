const MB = 1024 * 1024;

const REGLAS_ARCHIVOS = {
  avatar: {
    extensiones: ["jpg", "jpeg", "png", "webp"],
    mimes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 2 * MB,
    descripcion: "Foto de perfil (JPG, PNG o WEBP, máx. 2 MB)",
  },
  captura: {
    extensiones: ["jpg", "jpeg", "png"],
    mimes: ["image/jpeg", "image/png"],
    maxBytes: 5 * MB,
    descripcion: "Captura de combate (JPG o PNG, máx. 5 MB)",
  },
  notas_pdf: {
    extensiones: ["pdf"],
    mimes: ["application/pdf"],
    maxBytes: 10 * MB,
    descripcion: "Notas de estrategia (PDF, máx. 10 MB)",
  },
  importacion_txt: {
    extensiones: ["txt"],
    mimes: ["text/plain"],
    maxBytes: 100 * 1024,
    descripcion: "Equipo en texto (TXT, máx. 100 KB)",
  },
  exportacion_txt: { extensiones: ["txt"], mimes: ["text/plain"], maxBytes: 100 * 1024 },
  hoja_png: { extensiones: ["png"], mimes: ["image/png"], maxBytes: 5 * MB },
};

const FIRMAS = {
  "image/png": (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  "application/pdf": (b) => b.length > 5 && b.toString("ascii", 0, 5) === "%PDF-",
  "text/plain": (b) => !b.includes(0x00) && Buffer.from(b.toString("utf8"), "utf8").equals(b),
};

const MIME_POR_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
};

module.exports = { REGLAS_ARCHIVOS, FIRMAS, MIME_POR_EXTENSION };
