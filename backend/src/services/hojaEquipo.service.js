const path = require("path");
const { Resvg } = require("@resvg/resvg-js");
const { STATS } = require("../domain/estadisticas");
const { claveTipo } = require("../domain/tipos");

const COLOR_TIPO = {
  normal: "#9fa19f", fuego: "#e62829", agua: "#2980ef", electrico: "#fac000", planta: "#3fa129",
  hielo: "#3dcef3", pelea: "#ff8000", veneno: "#9141cb", tierra: "#915121", volador: "#81b9ef",
  psiquico: "#ef4179", bicho: "#91a119", roca: "#afa981", fantasma: "#704170", dragon: "#5060e1",
  siniestro: "#624d4e", acero: "#60a1b8", hada: "#ef70ef",
};

const FUENTES = (() => {
  try {
    const dir = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
    return [path.join(dir, "DejaVuSans.ttf"), path.join(dir, "DejaVuSans-Bold.ttf")];
  } catch {
    return [];
  }
})();

const sprites = new Map();

async function spriteDataUri(url) {
  if (!url) return null;
  if (sprites.has(url)) return sprites.get(url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const tipo = res.headers.get("content-type") || "image/png";
    if (!tipo.startsWith("image/")) return null;
    const uri = `data:${tipo};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    sprites.set(url, uri);
    return uri;
  } catch {
    return null;
  }
}

function esc(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recortar(texto, max) {
  const t = String(texto ?? "");
  return t.length > max ? t.slice(0, max - 1) + "..." : t;
}

const TARJETA_W = 380;
const TARJETA_H = 300;
const MARGEN = 24;
const ANCHO = 3 * TARJETA_W + 4 * MARGEN;
const ETIQUETA_STAT = { ps: "PS", atq: "Atq", def: "Def", ate: "AtE", dfe: "DfE", vel: "Vel" };
const CABECERA_H = 110;

async function tarjeta(i, x, y) {
  const forma = i.megaForma || i.pokemon;
  const sprite = await spriteDataUri(forma.sprite || i.pokemon.sprite);
  const nombre = i.apodo ? `${i.apodo} (${i.pokemon.nombreMostrar})` : i.pokemon.nombreMostrar;

  let tipos = "";
  let tx = x + 120;
  for (const t of forma.tipos) {
    const ancho = 14 + t.nombre.length * 8;
    tipos += `<rect x="${tx}" y="${y + 50}" width="${ancho}" height="22" rx="11" fill="${COLOR_TIPO[claveTipo(t.nombre)] || "#888"}"/>
      <text x="${tx + ancho / 2}" y="${y + 66}" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">${esc(t.nombre)}</text>`;
    tx += ancho + 6;
  }

  const datos = [
    ["Objeto", i.objeto?.nombre || "-"],
    ["Habilidad", i.habilidad?.nombre || "-"],
    ["Naturaleza", i.naturaleza?.nombre || "-"],
  ];
  const lineasDatos = datos
    .map(([k, v], n) => `<text x="${x + 120}" y="${y + 96 + n * 20}" font-size="13" fill="#555">${k}: <tspan fill="#111" font-weight="bold">${esc(recortar(v, 24))}</tspan></text>`)
    .join("");

  const movimientos = [0, 1, 2, 3]
    .map((n) => {
      const m = i.movimientos[n];
      const color = m?.tipo ? COLOR_TIPO[claveTipo(m.tipo.nombre)] || "#888" : "#ddd";
      return `<rect x="${x + 16}" y="${y + 166 + n * 24}" width="6" height="18" fill="${color}"/>
        <text x="${x + 30}" y="${y + 180 + n * 24}" font-size="14" fill="${m ? "#111" : "#aaa"}">${esc(m ? recortar(m.nombre, 30) : "-")}</text>`;
    })
    .join("");

  const evs = STATS.filter((s) => i.evs[s] > 0).map((s) => `${i.evs[s]} ${ETIQUETA_STAT[s]}`).join(" / ");

  return `
    <g>
      <rect x="${x}" y="${y}" width="${TARJETA_W}" height="${TARJETA_H}" rx="16" fill="#ffffff" stroke="#e3e3ea"/>
      <rect x="${x + 12}" y="${y + 14}" width="96" height="96" rx="12" fill="#f3f4f8"/>
      ${sprite ? `<image href="${sprite}" x="${x + 12}" y="${y + 14}" width="96" height="96" preserveAspectRatio="xMidYMid meet"/>` : ""}
      <text x="${x + 120}" y="${y + 38}" font-size="18" font-weight="bold" fill="#111">${esc(recortar(nombre, 26))}</text>
      ${i.esMega ? `<text x="${x + TARJETA_W - 16}" y="${y + 38}" font-size="13" font-weight="bold" fill="#c2185b" text-anchor="end">MEGA</text>` : ""}
      ${tipos}
      ${lineasDatos}
      ${movimientos}
      <text x="${x + 16}" y="${y + TARJETA_H - 14}" font-size="12" fill="#666">EVs: ${esc(evs || "sin EVs")}</text>
    </g>`;
}

async function generarPng(equipo, { autor } = {}) {
  const filas = Math.max(1, Math.ceil(equipo.integrantes.length / 3));
  const alto = CABECERA_H + filas * (TARJETA_H + MARGEN) + MARGEN + 20;

  const tarjetas = await Promise.all(
    equipo.integrantes.map((i, n) =>
      tarjeta(i, MARGEN + (n % 3) * (TARJETA_W + MARGEN), CABECERA_H + Math.floor(n / 3) * (TARJETA_H + MARGEN))
    )
  );

  const formato = equipo.formato === "doble" ? "Combate Doble" : "Combate Individual";
  const subtitulo = [formato, equipo.regulacion?.nombre, autor && `por ${autor}`].filter(Boolean).join(" - ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${alto}" viewBox="0 0 ${ANCHO} ${alto}" font-family="DejaVu Sans">
    <rect width="100%" height="100%" fill="#f5f6fa"/>
    <rect width="100%" height="88" fill="#1f2a44"/>
    <text x="${MARGEN}" y="46" font-size="30" font-weight="bold" fill="#ffffff">${esc(recortar(equipo.nombre, 50))}</text>
    <text x="${MARGEN}" y="72" font-size="15" fill="#c9d1e6">${esc(subtitulo)}</text>
    <text x="${ANCHO - MARGEN}" y="46" font-size="14" fill="#ffcb05" text-anchor="end" font-weight="bold">Pokémon Team Builder</text>
    ${tarjetas.join("")}
    <text x="${ANCHO / 2}" y="${alto - 14}" font-size="11" fill="#999" text-anchor="middle">Proyecto académico sin afiliación oficial. Pokémon es marca de Nintendo, Creatures Inc. y GAME FREAK.</text>
  </svg>`;

  const resvg = new Resvg(svg, {
    font: { fontFiles: FUENTES, loadSystemFonts: FUENTES.length === 0, defaultFontFamily: "DejaVu Sans" },
    fitTo: { mode: "original" },
  });
  return resvg.render().asPng();
}

module.exports = { generarPng };
