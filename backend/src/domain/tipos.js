
function claveTipo(nombre) {
  const clave = String(nombre || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return clave === "lucha" ? "pelea" : clave;
}

const CLAVES_TIPOS = [
  "normal", "fuego", "agua", "electrico", "planta", "hielo", "pelea", "veneno", "tierra",
  "volador", "psiquico", "bicho", "roca", "fantasma", "dragon", "siniestro", "acero", "hada",
];

const EFECTIVIDAD = {
  normal: { roca: 0.5, acero: 0.5, fantasma: 0 },
  fuego: { fuego: 0.5, agua: 0.5, planta: 2, hielo: 2, bicho: 2, roca: 0.5, dragon: 0.5, acero: 2 },
  agua: { fuego: 2, agua: 0.5, planta: 0.5, tierra: 2, roca: 2, dragon: 0.5 },
  electrico: { agua: 2, electrico: 0.5, planta: 0.5, tierra: 0, volador: 2, dragon: 0.5 },
  planta: { fuego: 0.5, agua: 2, planta: 0.5, veneno: 0.5, tierra: 2, volador: 0.5, bicho: 0.5, roca: 2, dragon: 0.5, acero: 0.5 },
  hielo: { fuego: 0.5, agua: 0.5, planta: 2, hielo: 0.5, tierra: 2, volador: 2, dragon: 2, acero: 0.5 },
  pelea: { normal: 2, hielo: 2, veneno: 0.5, volador: 0.5, psiquico: 0.5, bicho: 0.5, roca: 2, fantasma: 0, siniestro: 2, acero: 2, hada: 0.5 },
  veneno: { planta: 2, veneno: 0.5, tierra: 0.5, roca: 0.5, fantasma: 0.5, acero: 0, hada: 2 },
  tierra: { fuego: 2, electrico: 2, planta: 0.5, veneno: 2, volador: 0, bicho: 0.5, roca: 2, acero: 2 },
  volador: { electrico: 0.5, planta: 2, pelea: 2, bicho: 2, roca: 0.5, acero: 0.5 },
  psiquico: { pelea: 2, veneno: 2, psiquico: 0.5, siniestro: 0, acero: 0.5 },
  bicho: { fuego: 0.5, planta: 2, pelea: 0.5, veneno: 0.5, volador: 0.5, psiquico: 2, fantasma: 0.5, siniestro: 2, acero: 0.5, hada: 0.5 },
  roca: { fuego: 2, hielo: 2, pelea: 0.5, tierra: 0.5, volador: 2, bicho: 2, acero: 0.5 },
  fantasma: { normal: 0, psiquico: 2, fantasma: 2, siniestro: 0.5 },
  dragon: { dragon: 2, acero: 0.5, hada: 0 },
  siniestro: { pelea: 0.5, psiquico: 2, fantasma: 2, siniestro: 0.5, hada: 0.5 },
  acero: { fuego: 0.5, agua: 0.5, electrico: 0.5, hielo: 2, roca: 2, acero: 0.5, hada: 2 },
  hada: { fuego: 0.5, pelea: 2, veneno: 0.5, dragon: 2, siniestro: 2, acero: 0.5 },
};

function multiplicador(atacante, defensores) {
  const fila = EFECTIVIDAD[claveTipo(atacante)] || {};
  return defensores.reduce((total, d) => total * (fila[claveTipo(d)] ?? 1), 1);
}

module.exports = { CLAVES_TIPOS, EFECTIVIDAD, claveTipo, multiplicador };
