const supabase = require("../config/supabase");
const { verificar } = require("../utils/errores");
const catalogo = require("./catalogo.service");
const equipos = require("./equipos.service");
const archivos = require("./archivos.service");
const { promedios, statMasBaja } = require("./recomendaciones.service");
const { NOMBRES_STATS } = require("../domain/estadisticas");

async function resumen(usuarioId) {
  const [filasEquipos, ultimosArchivos, cat] = await Promise.all([
    supabase
      .from("equipo")
      .select("*, pokemon_equipo(*, pokemon_equipo_movimientos(movimiento_id, slot))")
      .eq("usuario_id", usuarioId)
      .order("actualizado_en", { ascending: false }),
    archivos.listar(usuarioId, { limite: 5 }),
    catalogo.obtener(),
  ]);

  const lista = verificar(filasEquipos, "Leyendo equipos").map((f) => equipos.equipoResuelto(cat, f));

  const conteoFormatos = lista.reduce((acc, e) => ({ ...acc, [e.formato]: (acc[e.formato] || 0) + 1 }), {});
  const formatoMasUsado = Object.entries(conteoFormatos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const reciente = lista.find((e) => e.integrantes.length > 0);
  let statMasBajaReciente = null;
  if (reciente) {
    const prom = promedios(cat, reciente.integrantes);
    const clave = statMasBaja(prom);
    statMasBajaReciente = {
      equipoId: reciente.id,
      equipo: reciente.nombre,
      clave,
      nombre: NOMBRES_STATS[clave],
      promedio: prom[clave],
    };
  }

  return {
    totalEquipos: lista.length,
    equiposPublicos: lista.filter((e) => e.esPublico).length,
    formatos: conteoFormatos,
    formatoMasUsado,
    statMasBajaEquipoReciente: statMasBajaReciente,
    equiposRecientes: lista.slice(0, 5).map((e) => equipos.resumenDTO(cat, e)),
    ultimosArchivos,
  };
}

module.exports = { resumen };
