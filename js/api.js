const API_URL = window.API_URL || "http://localhost:3000/api";

const CLAVE_TOKEN = "ptb_token";
const CLAVE_USUARIO = "ptb_usuario";

class ErrorApi extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles || [];
  }
}

const sesionLocal = {
  token: () => localStorage.getItem(CLAVE_TOKEN),
  usuario: () => {
    try { return JSON.parse(localStorage.getItem(CLAVE_USUARIO)); } catch (e) { return null; }
  },
  guardar: (token, usuario) => {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  },
  actualizarUsuario: usuario => localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario)),
  borrar: () => {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
  }
};

const paginaActual = () => location.pathname.split("/").pop() + location.search;

async function peticion(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  const token = sesionLocal.token();
  if (token) opciones.headers.Authorization = "Bearer " + token;

  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo;
  } else if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, opciones);
  } catch (e) {
    throw new ErrorApi(0, "SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  try { datos = await respuesta.json(); } catch (e) {}

  if (!respuesta.ok) {
    const error = (datos && datos.error) || {};
    if (respuesta.status === 401 && token) {
      sesionLocal.borrar();
      if (!/login\.html$/.test(location.pathname)) {
        location.href = "login.html?volver=" + encodeURIComponent(paginaActual());
      }
    }
    throw new ErrorApi(respuesta.status, error.codigo || "ERROR", error.mensaje || "Ocurrió un error en el servidor.", error.detalles);
  }
  return datos;
}

const api = {
  get: ruta => peticion("GET", ruta),
  post: (ruta, cuerpo) => peticion("POST", ruta, cuerpo),
  put: (ruta, cuerpo) => peticion("PUT", ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion("PATCH", ruta, cuerpo),
  delete: ruta => peticion("DELETE", ruta),
  subir: (ruta, campo, archivo, metodo = "POST") => {
    const formulario = new FormData();
    formulario.append(campo, archivo);
    return peticion(metodo, ruta, formulario);
  }
};
