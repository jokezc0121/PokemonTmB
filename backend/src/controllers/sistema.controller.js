const supabase = require("../config/supabase");
const env = require("../config/env");
const dashboard = require("../services/dashboard.service");

async function salud(req, res) {
  const inicio = Date.now();
  const [db, storage] = await Promise.all([
    supabase.from("tipos").select("id", { count: "exact", head: true }),
    supabase.storage.getBucket(env.bucket),
  ]);

  const estado = {
    estado: !db.error && !storage.error ? "ok" : "degradado",
    servicios: {
      baseDeDatos: db.error ? { estado: "error", detalle: db.error.message } : { estado: "ok", tiposEnCatalogo: db.count },
      almacenamiento: storage.error ? { estado: "error", detalle: storage.error.message } : { estado: "ok", bucket: env.bucket },
    },
    tiempoMs: Date.now() - inicio,
    fecha: new Date().toISOString(),
  };
  res.status(estado.estado === "ok" ? 200 : 503).json(estado);
}

async function resumenDashboard(req, res) {
  res.json({ data: await dashboard.resumen(req.usuario.id) });
}

module.exports = { salud, resumenDashboard };
