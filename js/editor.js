// Código del editor de un integrante (habilidad, objeto, naturaleza, movimientos y EV)
const editor = document.getElementById("editor-integrante");

// Crea las <option>; si "deshabilitar" devuelve un texto, la opción queda bloqueada y lo muestra
const opciones = (lista, actual, deshabilitar = () => "") => lista.map(valor => {
  const motivo = deshabilitar(valor);
  return `<option value="${valor}"${valor === actual ? " selected" : ""}${motivo ? " disabled" : ""}>` +
    `${motivo ? `${valor} (${motivo})` : valor}</option>`;
}).join("");

const buscarNaturaleza = nombre => NATURALEZAS.find(n => n.nombre === nombre);

const textoNaturaleza = n => n.sube
  ? `${n.nombre} (+${NOMBRES_STATS[n.sube]} -${NOMBRES_STATS[n.baja]})`
  : `${n.nombre} (neutra, no cambia nada)`;

const totalEvs = integrante => Object.values(integrante.evs).reduce((a, b) => a + b, 0);

// Fórmula de la estadística final a nivel 50 con IV 31
function calcularStat(clave, base, ev, naturaleza) {
  const parte = Math.floor((2 * base + 31 + Math.floor(ev / 4)) * NIVEL / 100);
  if (clave === "ps") return parte + NIVEL + 10;
  const multiplicador = naturaleza.sube === clave ? 1.1 : naturaleza.baja === clave ? 0.9 : 1;
  return Math.floor((parte + 5) * multiplicador);
}

function duenoDelObjeto(objeto, integrante) {
  if (objeto === "Ninguno") return "";
  const otro = equipo.find(i => i !== integrante && i.objeto === objeto);
  return otro ? `lo lleva ${nombreDe(otro)}` : "";
}

const opcionesMovimiento = (integrante, pos) =>
  `<option value="">— Movimiento ${pos + 1} —</option>` +
  opciones(integrante.pokemon.movimientos, integrante.movimientos[pos],
    mov => integrante.movimientos.some((m, i) => i !== pos && m === mov) ? "ya elegido" : "");

function mostrarEditor() {
  const integrante = equipo[seleccionado];
  if (!integrante) {
    editor.innerHTML = '<p class="ayuda">Agrega un Pokémon desde el catálogo para empezar.</p>';
    return;
  }

  const p = integrante.pokemon;
  const opcionesNaturaleza = NATURALEZAS.map(n =>
    `<option value="${n.nombre}"${n.nombre === integrante.naturaleza ? " selected" : ""}>${textoNaturaleza(n)}</option>`).join("");
  const opcionesHabilidad = todasLasHabilidades(p).map(h =>
    `<option value="${h}"${h === integrante.habilidad ? " selected" : ""}>${h === p.oculta ? `${h} (oculta)` : h}</option>`).join("");
  const movimientos = [0, 1, 2, 3].map(m =>
    `<select class="movimiento" data-pos="${m}" aria-label="Movimiento ${m + 1}">${opcionesMovimiento(integrante, m)}</select>`).join("");
  const filasStats = Object.keys(NOMBRES_STATS).map(c => `
    <tr>
      <td id="nombre-${c}">${NOMBRES_STATS[c]}</td>
      <td>${p.base[c]}</td>
      <td class="celda-ev">` +
        `<input type="number" class="ev" data-stat="${c}" min="0" max="${EV_MAX_STAT}" step="4" value="${integrante.evs[c]}" inputmode="numeric" aria-label="Puntos de esfuerzo de ${NOMBRES_STATS[c]}">` +
        `<button type="button" class="boton-ev" data-stat="${c}" data-valor="max" title="Poner el máximo posible">Máx</button>` +
        `<button type="button" class="boton-ev" data-stat="${c}" data-valor="0" title="Volver a 0">0</button>` +
      `</td>
      <td class="total" id="total-${c}"></td>
    </tr>`).join("");

  editor.innerHTML = `
    <div class="editor-titulo">${htmlImagen(p)}<h2>Editando: <span>${escapar(nombreDe(integrante))}</span></h2></div>

    <div class="fila-datos">
      <div class="campo"><label for="apodo">Apodo</label>
        <input type="text" id="apodo" maxlength="12" placeholder="Opcional, máx. 12" value="${escapar(integrante.apodo)}"></div>
      <div class="campo"><label for="habilidad">Habilidad</label>
        <select id="habilidad">${opcionesHabilidad}</select></div>
      <div class="campo"><label for="objeto">Objeto</label>
        <select id="objeto">${opciones(OBJETOS, integrante.objeto, o => duenoDelObjeto(o, integrante))}</select>
        <small class="pista">Cada objeto solo puede usarlo un Pokémon del equipo.</small></div>
      <div class="campo"><label for="naturaleza">Naturaleza <a href="ayuda.html#naturaleza" class="info" title="¿Qué es la naturaleza?" aria-label="¿Qué es la naturaleza?">?</a></label>
        <select id="naturaleza">${opcionesNaturaleza}</select></div>
    </div>

    <h2>Movimientos</h2>
    <p class="pista">Elige hasta 4. Los que ya elegiste no se pueden repetir.</p>
    <div class="movimientos">${movimientos}</div>

    <h2>Estadísticas a nivel ${NIVEL}</h2>
    <div class="tabla-scroll"><table class="tabla-stats">
      <thead><tr>
        <th scope="col">Estadística</th><th scope="col">Base</th>
        <th scope="col"><abbr title="Puntos de esfuerzo: entrenamiento extra que sube una estadística">EV</abbr>
          <a href="ayuda.html#ev" class="info" title="¿Qué son los EV?" aria-label="¿Qué son los EV?">?</a></th>
        <th scope="col">Final</th>
      </tr></thead>
      <tbody>${filasStats}</tbody>
    </table></div>
    <div class="ev-medidor" aria-hidden="true"><i id="ev-barra"></i></div>
    <p class="ev-restantes" id="ev-restantes" aria-live="polite"></p>`;

  conectarEventosEditor(integrante);
  actualizarStatsEditor(integrante);
}

function conectarEventosEditor(integrante) {
  const al = (id, evento, fn) => document.getElementById(id).addEventListener(evento, e => { fn(e.target.value); marcarCambios(); });

  al("apodo", "input", valor => {
    integrante.apodo = valor.trim();
    editor.querySelector(".editor-titulo span").textContent = nombreDe(integrante);
    mostrarEquipo();
  });
  al("habilidad", "change", valor => { integrante.habilidad = valor; mostrarArquetipo(); });
  al("objeto", "change", valor => { integrante.objeto = valor; mostrarEquipo(); mostrarArquetipo(); });
  al("naturaleza", "change", valor => { integrante.naturaleza = valor; actualizarStatsEditor(integrante); });

  editor.querySelectorAll(".movimiento").forEach(select =>
    select.addEventListener("change", () => {
      integrante.movimientos[Number(select.dataset.pos)] = select.value;
      editor.querySelectorAll(".movimiento").forEach(s => s.innerHTML = opcionesMovimiento(integrante, Number(s.dataset.pos)));
      mostrarEquipo();
      mostrarArquetipo();
      marcarCambios();
    }));

  editor.querySelectorAll(".ev").forEach(input =>
    input.addEventListener("change", () => ponerEv(integrante, input.dataset.stat, parseInt(input.value, 10) || 0)));

  editor.querySelectorAll(".boton-ev").forEach(boton =>
    boton.addEventListener("click", () =>
      ponerEv(integrante, boton.dataset.stat, boton.dataset.valor === "max" ? EV_MAX_STAT : 0)));
}

// Ajusta el EV a los límites (252 por estadística, 510 en total) y explica el ajuste
function ponerEv(integrante, clave, pedido) {
  const disponible = EV_MAX_TOTAL - (totalEvs(integrante) - integrante.evs[clave]);
  let valor = Math.max(0, pedido);
  let explicacion = "";

  if (valor > EV_MAX_STAT) {
    valor = EV_MAX_STAT;
    explicacion = `Se ajustó a ${EV_MAX_STAT}: es el máximo por estadística.`;
  }
  if (valor > disponible) {
    valor = disponible;
    explicacion = `Se ajustó a ${disponible}: solo te quedaban ${disponible} EV. Baja otra estadística si quieres poner más aquí.`;
  }

  integrante.evs[clave] = valor;
  editor.querySelector(`.ev[data-stat="${clave}"]`).value = valor;
  actualizarStatsEditor(integrante);
  marcarCambios();
  if (explicacion) UI.aviso(explicacion, "info");
}

function actualizarStatsEditor(integrante) {
  const naturaleza = buscarNaturaleza(integrante.naturaleza);

  Object.keys(NOMBRES_STATS).forEach(c => {
    document.getElementById("total-" + c).textContent =
      calcularStat(c, integrante.pokemon.base[c], integrante.evs[c], naturaleza);
    const nombre = document.getElementById("nombre-" + c);
    nombre.className = naturaleza.sube === c ? "sube" : naturaleza.baja === c ? "baja" : "";
    nombre.title = naturaleza.sube === c ? "La naturaleza la sube un 10%" : naturaleza.baja === c ? "La naturaleza la baja un 10%" : "";
  });

  const usados = totalEvs(integrante);
  const restantes = EV_MAX_TOTAL - usados;
  document.getElementById("ev-barra").style.width = `${usados / EV_MAX_TOTAL * 100}%`;
  document.getElementById("ev-restantes").textContent =
    `EV usados: ${usados} / ${EV_MAX_TOTAL} · ${restantes > 0 ? `te quedan ${restantes}` : "¡completo!"}`;
}
