// Funciones compartidas por el login y el registro
const $ = id => document.getElementById(id);

function mostrarError(id, texto) {
  const input = $(id);
  $("error-" + id).textContent = texto;
  input.classList.toggle("invalido", texto !== "");
  input.classList.toggle("valido", texto === "" && input.value !== "");
  if (texto) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
  return texto === "";
}

function errorCorreo(correo) {
  if (correo === "") return "Escribe tu correo.";
  if (/\s/.test(correo)) return "El correo no puede tener espacios.";
  if (!correo.includes("@")) return "Al correo le falta la @. Ejemplo: entrenador@correo.com";
  const [usuario, dominio = ""] = correo.split("@");
  if (usuario === "") return "Falta lo que va antes de la @. Ejemplo: entrenador@correo.com";
  if (!/^[^@]+\.[^@]+$/.test(dominio)) return "Revisa lo que va después de la @. Ejemplo: @correo.com";
  return "";
}

const reglasClave = clave => ({
  largo: clave.length >= 8,
  numero: /\d/.test(clave),
  letra: /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(clave)
});

function errorClaveNueva(clave) {
  if (clave === "") return "Escribe una contraseña.";
  const r = reglasClave(clave);
  if (!r.largo) return `Tu contraseña tiene ${clave.length} caracteres; necesita al menos 8.`;
  if (!r.numero) return "Agrega al menos un número (0-9).";
  if (!r.letra) return "Agrega al menos una letra.";
  return "";
}

function enviando(boton, texto) {
  boton.disabled = true;
  boton.innerHTML = `<span class="cargando" aria-hidden="true"></span>${texto}`;
}

const enfocarPrimerError = form => form.querySelector(".invalido")?.focus();

const CAMPOS_FORM = { correo: "correo", contrasena: "clave", nombreEntrenador: "nombre" };

function paginaDestino() {
  const volver = new URLSearchParams(location.search).get("volver");
  return volver && /^[\w-]+\.html(\?.*)?$/.test(volver) ? volver : "index.html#menu";
}

function mostrarErroresServidor(form, error) {
  error.detalles.forEach(d => { if (CAMPOS_FORM[d.campo]) mostrarError(CAMPOS_FORM[d.campo], d.mensaje); });
  $("mensaje").className = "mensaje mensaje-error";
  $("mensaje").textContent = error.message;
  enfocarPrimerError(form);
}

function restaurarBoton(boton, texto) {
  boton.disabled = false;
  boton.textContent = texto;
}

// Valida al salir del campo y, si ya tenía error, mientras escribe
function validarAlSalir(id, validador) {
  const input = $(id);
  input.addEventListener("blur", () => { if (input.value !== "") validador(); });
  input.addEventListener("input", () => { if (input.classList.contains("invalido")) validador(); });
}

// Código del login
const formLogin = $("form-login");

if (formLogin) {
  const validarCorreo = () => mostrarError("correo", errorCorreo($("correo").value.trim()));
  const validarClave = () => mostrarError("clave", $("clave").value === "" ? "Escribe tu contraseña." : "");

  validarAlSalir("correo", validarCorreo);
  validarAlSalir("clave", validarClave);

  formLogin.addEventListener("submit", async e => {
    e.preventDefault();
    const mensaje = $("mensaje");
    mensaje.textContent = "";
    mensaje.className = "mensaje";

    const correoOk = validarCorreo();
    const claveOk = validarClave();
    if (!correoOk || !claveOk) return enfocarPrimerError(formLogin);

    const textoBoton = $("enviar").textContent;
    enviando($("enviar"), "Entrando...");
    try {
      const r = await api.post("/auth/login", { correo: $("correo").value.trim(), contrasena: $("clave").value });
      sesionLocal.guardar(r.data.token, r.data.usuario);
      mensaje.className = "mensaje mensaje-exito";
      mensaje.textContent = "¡Bienvenido! Te llevamos al menú...";
      UI.avisoSiguientePagina("Iniciaste sesión correctamente.", "exito");
      location.href = paginaDestino();
    } catch (error) {
      mostrarErroresServidor(formLogin, error);
      restaurarBoton($("enviar"), textoBoton);
    }
  });
}

// Código del registro
const formRegistro = $("form-registro");

if (formRegistro) {
  const validarNombre = () => {
    const nombre = $("nombre").value.trim();
    const faltan = 3 - nombre.length;
    let texto = "";
    if (nombre === "") texto = "Escribe tu nombre de entrenador.";
    else if (faltan > 0) texto = `Te ${faltan === 1 ? "falta 1 carácter" : `faltan ${faltan} caracteres`} (mínimo 3).`;
    else if (nombre.length > 20) texto = "Máximo 20 caracteres.";
    return mostrarError("nombre", texto);
  };
  const validarCorreo = () => mostrarError("correo", errorCorreo($("correo").value.trim()));
  const validarClave = () => mostrarError("clave", errorClaveNueva($("clave").value));
  const validarConfirmar = () => {
    const c = $("confirmar").value;
    let texto = "";
    if (c === "") texto = "Repite la contraseña para confirmarla.";
    else if (c !== $("clave").value) texto = "No coincide con la contraseña de arriba. Usa «Mostrar» para revisarlas.";
    return mostrarError("confirmar", texto);
  };

  validarAlSalir("nombre", validarNombre);
  validarAlSalir("correo", validarCorreo);
  validarAlSalir("clave", validarClave);
  validarAlSalir("confirmar", validarConfirmar);

  $("clave").addEventListener("input", () => {
    const r = reglasClave($("clave").value);
    document.querySelectorAll("#requisitos-clave li").forEach(li => li.classList.toggle("cumple", r[li.dataset.regla]));
    if ($("confirmar").value !== "") validarConfirmar();
  });

  formRegistro.addEventListener("submit", async e => {
    e.preventDefault();
    const mensaje = $("mensaje");
    const resultados = [validarNombre(), validarCorreo(), validarClave(), validarConfirmar()];

    if (resultados.includes(false)) {
      mensaje.className = "mensaje mensaje-error";
      mensaje.textContent = "Revisa los campos marcados en rosa.";
      return enfocarPrimerError(formRegistro);
    }

    mensaje.textContent = "";
    const textoBoton = $("enviar").textContent;
    enviando($("enviar"), "Creando cuenta...");
    try {
      await api.post("/auth/register", {
        nombreEntrenador: $("nombre").value.trim(),
        correo: $("correo").value.trim(),
        contrasena: $("clave").value
      });
      UI.avisoSiguientePagina("¡Cuenta creada! Ahora inicia sesión con tu correo.", "exito");
      location.href = "login.html";
    } catch (error) {
      mostrarErroresServidor(formRegistro, error);
      restaurarBoton($("enviar"), textoBoton);
    }
  });
}
