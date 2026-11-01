require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en backend/.env. También puedes ejecutar los .sql de db/migrations en el SQL Editor de Supabase.");
    process.exit(1);
  }

  const cliente = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await cliente.connect();

  await cliente.query(`create table if not exists public.schema_migraciones (
    nombre text primary key,
    aplicada_en timestamptz not null default now()
  )`);
  await cliente.query("alter table public.schema_migraciones enable row level security");

  const carpeta = path.join(__dirname, "..", "db", "migrations");
  const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await cliente.query("select nombre from public.schema_migraciones");
  const aplicadas = new Set(rows.map((r) => r.nombre));

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) {
      console.log(`= ${archivo} (ya aplicada)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(carpeta, archivo), "utf8");
    try {
      await cliente.query("begin");
      await cliente.query(sql);
      await cliente.query("insert into public.schema_migraciones (nombre) values ($1)", [archivo]);
      await cliente.query("commit");
      console.log(`+ ${archivo}`);
    } catch (err) {
      await cliente.query("rollback");
      console.error(`x ${archivo}: ${err.message}`);
      await cliente.end();
      process.exit(1);
    }
  }

  await cliente.query("notify pgrst, 'reload schema'");
  await cliente.end();
  console.log("Migraciones al día.");
})();
