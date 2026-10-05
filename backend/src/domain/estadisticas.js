const STATS = ["ps", "atq", "def", "ate", "dfe", "vel"];

const NOMBRES_STATS = {
  ps: "PS",
  atq: "Ataque",
  def: "Defensa",
  ate: "Ataque Especial",
  dfe: "Defensa Especial",
  vel: "Velocidad",
};

const COLUMNA_BASE = { ps: "hp", atq: "attack", def: "defense", ate: "sp_attack", dfe: "sp_defense", vel: "speed" };

const SUFIJO_EQUIPO = { ps: "hp", atq: "attack", def: "defense", ate: "sp_attack", dfe: "sp_defense", vel: "speed" };

const ABREVIATURA_TXT = { ps: "HP", atq: "Atk", def: "Def", ate: "SpA", dfe: "SpD", vel: "Spe" };

const ALIAS_STAT = {
  ps: "ps", hp: "ps",
  atq: "atq", ataque: "atq", attack: "atq", atk: "atq",
  def: "def", defensa: "def", defense: "def",
  ate: "ate", "ataque especial": "ate", "ataque_especial": "ate", "at. esp.": "ate", sp_attack: "ate", spa: "ate",
  dfe: "dfe", "defensa especial": "dfe", "defensa_especial": "dfe", "def. esp.": "dfe", sp_defense: "dfe", spd: "dfe",
  vel: "vel", velocidad: "vel", speed: "vel", spe: "vel",
};

function normalizarStat(valor) {
  if (!valor) return null;
  return ALIAS_STAT[String(valor).trim().toLowerCase()] || null;
}

const EV_MAX_STAT = 252;
const EV_MAX_TOTAL = 510;
const IV_MAX = 31;
const NIVEL_POR_DEFECTO = 50;

module.exports = {
  STATS,
  NOMBRES_STATS,
  COLUMNA_BASE,
  SUFIJO_EQUIPO,
  ABREVIATURA_TXT,
  normalizarStat,
  EV_MAX_STAT,
  EV_MAX_TOTAL,
  IV_MAX,
  NIVEL_POR_DEFECTO,
};
