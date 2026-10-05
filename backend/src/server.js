const app = require("./app");
const env = require("./config/env");
const catalogo = require("./services/catalogo.service");

app.listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port}/api (${env.nodeEnv})`);

  catalogo
    .obtener()
    .then((cat) => console.log(`Catálogo cargado: ${cat.pokemon.size} Pokémon, ${cat.regulaciones.size} regulaciones.`))
    .catch((err) => console.error("No se pudo precargar el catálogo:", err.message));
});
