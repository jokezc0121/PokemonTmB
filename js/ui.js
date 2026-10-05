const UI = (() => {

  // Código de los avisos flotantes
  const ICONOS = { exito: "✓", error: "!", info: "i" };

  function contenedorAvisos() {
    let caja = document.getElementById("avisos");
    if (!caja) {
      caja = document.createElement("div");
      caja.id = "avisos";
      caja.className = "avisos";
      caja.setAttribute("role", "status");
      caja.setAttribute("aria-live", "polite");
      document.body.appendChild(caja);
    }
    return caja;
  }

  function aviso(mensaje, tipo = "info", accion = null, duracion = accion ? 6000 : 3500) {
    const caja = contenedorAvisos();
    const div = document.createElement("div");
    div.className = `aviso-flotante aviso-${tipo}`;
    div.innerHTML = `<span class="aviso-icono" aria-hidden="true">${ICONOS[tipo]}</span><span class="aviso-texto"></span>`;
    div.querySelector(".aviso-texto").textContent = mensaje;

    const cerrar = () => {
      clearTimeout(temporizador);
      div.classList.add("saliendo");
      setTimeout(() => div.remove(), 200);
    };

    if (accion) {
      const boton = crearBoton("aviso-accion", accion.texto, () => { accion.alHacerClic(); cerrar(); });
      div.appendChild(boton);
    }
    const x = crearBoton("aviso-cerrar", "✕", cerrar);
    x.setAttribute("aria-label", "Cerrar aviso");
    div.appendChild(x);

    caja.appendChild(div);
    while (caja.children.length > 3) caja.firstElementChild.remove();
    const temporizador = setTimeout(cerrar, duracion);
  }

  function crearBoton(clase, texto, alHacerClic) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = clase;
    boton.textContent = texto;
    boton.addEventListener("click", alHacerClic);
    return boton;
  }

  function avisoSiguientePagina(mensaje, tipo) {
    try { sessionStorage.setItem("aviso", JSON.stringify({ mensaje, tipo })); } catch (e) {}
  }

  function mostrarAvisoPendiente() {
    try {
      const guardado = JSON.parse(sessionStorage.getItem("aviso"));
      if (guardado) {
        sessionStorage.removeItem("aviso");
        aviso(guardado.mensaje, guardado.tipo);
      }
    } catch (e) {}
  }

  // Código de las ventanas de confirmación
  let ultimoFoco = null;

  function abrirModal(contenido) {
    cerrarModal();
    ultimoFoco = document.activeElement;

    const fondo = document.createElement("div");
    fondo.className = "modal-fondo";
    fondo.id = "modal";
    fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">${contenido}</div>`;
    fondo.addEventListener("click", e => { if (e.target === fondo) cerrarModal(false); });

    document.body.appendChild(fondo);
    document.body.classList.add("sin-scroll");
    (fondo.querySelector("[data-foco]") || fondo.querySelector("button"))?.focus();
    return fondo;
  }

  function cerrarModal(resultado) {
    const fondo = document.getElementById("modal");
    if (!fondo) return;
    fondo.remove();
    document.body.classList.remove("sin-scroll");
    ultimoFoco?.focus();
    fondo.alCerrar?.(resultado);
  }

  function confirmar({ titulo, mensaje, aceptar = "Aceptar", cancelar = "Cancelar", peligro = false }) {
    return new Promise(resolver => {
      const fondo = abrirModal(`
        <h2 id="modal-titulo">${titulo}</h2>
        <p>${mensaje}</p>
        <div class="modal-botones">
          <button type="button" class="boton boton-secundario" data-foco data-respuesta="no">${cancelar}</button>
          <button type="button" class="boton ${peligro ? "boton-peligro" : "boton-principal"}" data-respuesta="si">${aceptar}</button>
        </div>`);
      fondo.alCerrar = r => resolver(r === true);
      fondo.querySelectorAll("[data-respuesta]").forEach(b =>
        b.addEventListener("click", () => cerrarModal(b.dataset.respuesta === "si")));
    });
  }

  // Código de los atajos de teclado
  const ATAJOS = [
    ["/", "Ir al buscador de la página"],
    ["?", "Ver esta lista de atajos"],
    ["Esc", "Cerrar ventanas y avisos"],
    ["Ctrl + S", "Guardar el equipo (en Crear equipo)"],
    ["Enter en el buscador", "Agregar el primer resultado (en Crear equipo)"],
    ["Ctrl + Z", "Deshacer el último Pokémon quitado (en Crear equipo)"]
  ];

  function mostrarAtajos() {
    const filas = ATAJOS.map(([tecla, accion]) => `<tr><td><kbd>${tecla}</kbd></td><td>${accion}</td></tr>`).join("");
    const fondo = abrirModal(`
      <h2 id="modal-titulo">Atajos de teclado</h2>
      <table class="tabla-atajos">${filas}</table>
      <p>¿Necesitas más ayuda? Visita la <a href="ayuda.html">guía de uso</a>.</p>
      <div class="modal-botones"><button type="button" class="boton boton-principal" data-foco>Entendido</button></div>`);
    fondo.querySelector("button").addEventListener("click", () => cerrarModal());
  }

  const escribiendo = el => ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (document.getElementById("modal")) cerrarModal(false);
      else document.querySelectorAll(".aviso-flotante").forEach(a => a.remove());
      return;
    }
    if (document.getElementById("modal") || escribiendo(e.target)) return;

    if (e.key === "/") {
      const buscador = document.querySelector("[data-atajo-buscar]");
      if (buscador) { e.preventDefault(); buscador.focus(); buscador.select(); }
    }
    if (e.key === "?") {
      e.preventDefault();
      mostrarAtajos();
    }
  });

  // Código de la navegación y el cierre de sesión
  function marcarPaginaActual() {
    const actual = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar nav a").forEach(a => {
      if (a.getAttribute("href").split("#")[0] === actual) {
        a.classList.add("actual");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  function conectarCerrarSesion() {
    document.querySelectorAll("[data-accion='salir']").forEach(enlace =>
      enlace.addEventListener("click", async e => {
        e.preventDefault();
        const si = await confirmar({
          titulo: "¿Cerrar sesión?",
          mensaje: "Tendrás que volver a escribir tu correo y contraseña para entrar.",
          aceptar: "Cerrar sesión",
          cancelar: "Seguir aquí"
        });
        if (!si) return;
        window.salidaConfirmada = true;
        if (typeof api !== "undefined") {
          try { await api.post("/auth/logout"); } catch (e) {}
          sesionLocal.borrar();
        }
        avisoSiguientePagina("Cerraste sesión. ¡Hasta pronto!", "exito");
        location.href = "login.html";
      }));

    document.querySelectorAll("[data-accion='atajos']").forEach(b =>
      b.addEventListener("click", e => { e.preventDefault(); mostrarAtajos(); }));
  }

  // Código de las imágenes que no cargan
  const IMAGEN_RESPALDO = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
    "<circle cx='16' cy='16' r='14' fill='#141259' stroke='#F2CD5C' stroke-width='2'/>" +
    "<line x1='2' y1='16' x2='30' y2='16' stroke='#F2CD5C' stroke-width='2'/>" +
    "<circle cx='16' cy='16' r='4' fill='#010626' stroke='#F2CD5C' stroke-width='2'/></svg>");

  document.addEventListener("error", e => {
    const img = e.target;
    if (img.tagName === "IMG" && img.src !== IMAGEN_RESPALDO) {
      img.src = IMAGEN_RESPALDO;
      img.title = "No se pudo cargar la imagen. Revisa tu conexión.";
    }
  }, true);

  // Código del botón mostrar / ocultar contraseña
  function conectarVerClave() {
    document.querySelectorAll("[data-ver-clave]").forEach(boton => {
      const input = document.getElementById(boton.dataset.verClave);
      boton.addEventListener("click", () => {
        const oculta = input.type === "password";
        input.type = oculta ? "text" : "password";
        boton.textContent = oculta ? "Ocultar" : "Mostrar";
        boton.setAttribute("aria-pressed", oculta);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    marcarPaginaActual();
    conectarCerrarSesion();
    conectarVerClave();
    mostrarAvisoPendiente();
  });

  return { aviso, avisoSiguientePagina, confirmar, cerrarModal, mostrarAtajos };
})();
