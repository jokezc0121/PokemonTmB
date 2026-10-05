const { z } = require("zod");
const { STATS, EV_MAX_STAT, IV_MAX } = require("../domain/estadisticas");
const { ROLES } = require("../services/catalogo.service");


const formato = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const t = v.toLowerCase();
  if (t.includes("individual") || t === "single" || t === "singles") return "individual";
  if (t.includes("doble") || t === "double" || t === "doubles") return "doble";
  return t;
}, z.enum(["individual", "doble"], { error: "El formato debe ser 'individual' o 'doble'." }));

const idONombre = z.union([z.number().int().positive(), z.string().trim().min(1).max(80)]);

const objetoOpcional = z.preprocess(
  (v) => (v === "" || v === null || (typeof v === "string" && v.trim().toLowerCase() === "ninguno") ? null : v),
  idONombre.nullable().optional()
);

function bloqueStats(maximo, porDefecto) {
  const campos = Object.fromEntries(
    STATS.map((s) => [
      s,
      z.number({ error: `Debe ser un número entre 0 y ${maximo}.` }).int().min(0).max(maximo).default(porDefecto),
    ])
  );
  return z.object(campos).default(Object.fromEntries(STATS.map((s) => [s, porDefecto])));
}

const textoOpcional = (max) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());


const contrasena = z
  .string({ error: "La contraseña es obligatoria." })
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/[A-Za-z]/, "La contraseña debe tener al menos una letra.")
  .regex(/\d/, "La contraseña debe tener al menos un número.");

const correo = z
  .string({ error: "El correo es obligatorio." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresa un correo válido.").max(120));

const nombreEntrenador = z
  .string({ error: "El nombre de entrenador es obligatorio." })
  .trim()
  .min(3, "El nombre de entrenador debe tener al menos 3 caracteres.")
  .max(30, "El nombre de entrenador no puede superar 30 caracteres.");

const registro = z.object({ nombreEntrenador, correo, contrasena });

const login = z.object({
  correo,
  contrasena: z.string({ error: "La contraseña es obligatoria." }).min(1, "La contraseña es obligatoria."),
});

const perfil = z
  .object({
    nombreEntrenador: nombreEntrenador.optional(),
    biografia: textoOpcional(300),
    formatoPreferido: formato.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Envía al menos un campo para actualizar.");


const integrante = z.object({
  pokemon: idONombre,
  apodo: textoOpcional(20),
  habilidad: idONombre.nullable().optional(),
  objeto: objetoOpcional,
  naturaleza: idONombre.nullable().optional(),
  movimientos: z.array(z.preprocess((v) => (v === "" ? undefined : v), idONombre.optional())).max(4, "Máximo 4 movimientos.").default([]),
  evs: bloqueStats(EV_MAX_STAT, 0),
  ivs: bloqueStats(IV_MAX, IV_MAX),
  nivel: z.number().int().min(1).max(100).default(50),
  esMega: z.boolean().default(false),
});

const equipo = z.object({
  nombre: z.string({ error: "Ponle un nombre al equipo." }).trim().min(1, "Ponle un nombre al equipo.").max(60),
  formato,
  regulacion: idONombre.optional(),
  descripcion: textoOpcional(2000),
  arquetipo: textoOpcional(80),
  integrantes: z.array(integrante).max(6, "Un equipo tiene como máximo 6 integrantes.").default([]),
});

const compartir = z.object({ publico: z.boolean({ error: "Indica publico: true o false." }) });

const exportar = z.object({ formato: z.enum(["txt", "png"], { error: "El formato debe ser 'txt' o 'png'." }) });

const importar = z.object({
  nombre: textoOpcional(60),
  formato: formato.optional(),
  regulacion: z.string().trim().max(40).optional(),
});

const subidaEquipo = z.object({ categoria: z.enum(["captura", "notas_pdf"]).optional() });


const id = z.object({ id: z.coerce.number({ error: "ID inválido." }).int().positive("ID inválido.") });

const idVersion = id.extend({ numero: z.coerce.number().int().positive("Número de versión inválido.") });

const uuid = z.object({ id: z.uuid("ID de archivo inválido.") });

const busquedaPokemon = z.object({
  nombre: z.string().trim().max(40).optional(),
  tipo: z.string().trim().max(20).optional(),
  rol: z.enum(ROLES).optional(),
  regulacion: z.string().trim().max(40).optional(),
  incluirMegas: z.stringbool().default(false),
  orden: z.enum(["nombre", "pokedex", "total", ...STATS]).default("pokedex"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(400).default(50),
});

const busquedaEquipos = z.object({
  nombre: z.string().trim().max(60).optional(),
  formato: formato.optional(),
});

const recomendaciones = z.object({
  stat: z.enum(STATS, { error: `La estadística debe ser una de: ${STATS.join(", ")}.` }).optional(),
});

const listaArchivos = z.object({
  categoria: z.enum(["avatar", "exportacion_txt", "hoja_png", "importacion_txt", "captura", "notas_pdf"]).optional(),
  equipo: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});

const descarga = z.object({ descargar: z.stringbool().default(false) });

module.exports = {
  registro,
  login,
  perfil,
  equipo,
  integrante,
  compartir,
  exportar,
  importar,
  subidaEquipo,
  id,
  idVersion,
  uuid,
  busquedaPokemon,
  busquedaEquipos,
  recomendaciones,
  listaArchivos,
  descarga,
};
