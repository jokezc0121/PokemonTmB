if (!sesionLocal.token()) {
  location.replace("login.html?volver=" + encodeURIComponent(paginaActual()));
}

const sesionLista = !sesionLocal.token()
  ? Promise.resolve(null)
  : api.get("/auth/me")
      .then(r => { sesionLocal.actualizarUsuario(r.data); return r.data; })
      .catch(() => sesionLocal.usuario());
