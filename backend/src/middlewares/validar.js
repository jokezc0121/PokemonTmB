const { errores } = require("../utils/errores");

function formatearIssues(issues) {
  return issues.map((issue) => ({
    campo: issue.path.reduce((acc, parte) => (typeof parte === "number" ? `${acc}[${parte}]` : acc ? `${acc}.${parte}` : parte), ""),
    mensaje: issue.message,
  }));
}

function validar(esquema, origen = "body") {
  return (req, res, next) => {
    const resultado = esquema.safeParse(req[origen] ?? {});
    if (!resultado.success) {
      throw errores.validacion("Los datos enviados no son válidos.", formatearIssues(resultado.error.issues));
    }
    req.datos = { ...req.datos, [origen]: resultado.data };
    next();
  };
}

module.exports = { validar, formatearIssues };
