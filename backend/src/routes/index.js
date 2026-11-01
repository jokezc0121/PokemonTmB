const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { requiereSesion } = require("../middlewares/autenticacion");
const { validar } = require("../middlewares/validar");
const { subirArchivo } = require("../middlewares/subida");
const s = require("../schemas");

const auth = require("../controllers/auth.controller");
const usuarios = require("../controllers/usuarios.controller");
const catalogo = require("../controllers/catalogo.controller");
const equipos = require("../controllers/equipos.controller");
const archivos = require("../controllers/archivos.controller");
const sistema = require("../controllers/sistema.controller");

const router = Router();

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { codigo: "DEMASIADOS_INTENTOS", mensaje: "Demasiados intentos. Espera unos minutos." } },
});

router.get("/health", sistema.salud);

router.post("/auth/register", limiteAuth, validar(s.registro), auth.registrar);
router.post("/auth/login", limiteAuth, validar(s.login), auth.iniciarSesion);

router.get("/public/teams/:enlace", equipos.obtenerPublico);

router.use(["/auth/logout", "/auth/me", "/dashboard", "/users", "/pokemon", "/catalog", "/teams", "/files"], requiereSesion);

router.post("/auth/logout", auth.cerrarSesion);
router.get("/auth/me", auth.yo);

router.get("/dashboard", sistema.resumenDashboard);

router.get("/users/me", usuarios.obtenerPerfil);
router.put("/users/me", validar(s.perfil), usuarios.actualizarPerfil);
router.put("/users/me/avatar", subirArchivo("avatar", ["avatar"]), usuarios.cambiarAvatar);
router.delete("/users/me/avatar", usuarios.quitarAvatar);

router.get("/pokemon", validar(s.busquedaPokemon, "query"), catalogo.buscarPokemon);
router.get("/pokemon/:id", catalogo.obtenerPokemon);
router.get("/catalog/types", catalogo.listarTipos);
router.get("/catalog/natures", catalogo.listarNaturalezas);
router.get("/catalog/items", catalogo.listarObjetos);
router.get("/catalog/regulations", catalogo.listarRegulaciones);

router.get("/teams", validar(s.busquedaEquipos, "query"), equipos.listar);
router.post("/teams", validar(s.equipo), equipos.crear);
router.post("/teams/preview", validar(s.equipo), validar(s.recomendaciones, "query"), equipos.previsualizar);
router.post(
  "/teams/import",
  subirArchivo("archivo", ["importacion_txt"]),
  validar(s.importar),
  equipos.importar
);
router.get("/teams/:id", validar(s.id, "params"), equipos.obtener);
router.put("/teams/:id", validar(s.id, "params"), validar(s.equipo), equipos.actualizar);
router.delete("/teams/:id", validar(s.id, "params"), equipos.eliminar);
router.post("/teams/:id/duplicate", validar(s.id, "params"), equipos.duplicar);

router.get("/teams/:id/analysis", validar(s.id, "params"), equipos.analizar);
router.get("/teams/:id/recommendations", validar(s.id, "params"), validar(s.recomendaciones, "query"), equipos.recomendar);

router.get("/teams/:id/versions", validar(s.id, "params"), equipos.listarVersiones);
router.get("/teams/:id/versions/:numero", validar(s.idVersion, "params"), equipos.obtenerVersion);
router.post("/teams/:id/versions/:numero/restore", validar(s.idVersion, "params"), equipos.restaurarVersion);

router.patch("/teams/:id/share", validar(s.id, "params"), validar(s.compartir), equipos.compartir);
router.post("/teams/:id/exports", validar(s.id, "params"), validar(s.exportar), equipos.exportar);

router.get("/teams/:id/files", validar(s.id, "params"), equipos.listarArchivos);
router.post(
  "/teams/:id/files",
  validar(s.id, "params"),
  subirArchivo("archivo", ["captura", "notas_pdf"]),
  validar(s.subidaEquipo),
  equipos.subirAdjunto
);

router.get("/files", validar(s.listaArchivos, "query"), archivos.listar);
router.get("/files/:id", validar(s.uuid, "params"), validar(s.descarga, "query"), archivos.obtener);
router.delete("/files/:id", validar(s.uuid, "params"), archivos.eliminar);

module.exports = router;
