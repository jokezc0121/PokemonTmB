# INSTRUCCIONES RÁPIDAS PARA LA SUSTENTACIÓN ORAL (3 PASOS)

Con solo estos 3 archivos en la carpeta `demo/` demuestran todo lo que exige la rúbrica de la UAO de forma inmediata:

---

## 📁 LOS 3 ARCHIVOS DE LA CARPETA `demo/`

1. **`GUIA_PRESENTACION.md`** (este archivo):
   El guion exacto de 10 minutos con qué decir y qué mostrar por pantalla en cada minuto.

2. **`equipo_ejemplo.txt`**:
   Archivo de texto con formato de equipo competitivo listo para mostrar la función de **"Importar equipo desde TXT"** y **persistencia dual** en vivo con un solo clic.

3. **`demo_rapida.py`**:
   Script automático que ejecuta en terminal todas las peticiones a la API REST (Health, Token JWT, Protección 401, Validación de reglas 400 y Persistencia de equipos). Sirve como respaldo técnico inmediato por si el profesor pide ver las respuestas directas de la API.

---

## ⏱️ GUION PASO A PASO (10 MINUTOS EN VIVO)

### Minuto 0:00 - 3:00 | ARQUITECTURA Y PERSISTENCIA DUAL
- **Qué decir:**
  1. *Arquitectura desacoplada:* Frontend en Vanilla Web moderno (HTML5/CSS3/JS modular) sin frameworks pesados, conectado por peticiones asíncronas JSON a una API REST en Express 5.
  2. *Autenticación:* Stateless mediante tokens JWT. Las rutas privadas están custodiadas en backend y frontend.
  3. *Persistencia Dual (Rúbrica):* PostgreSQL en Supabase almacena las relaciones estructuradas (usuarios, 363 Pokémon, equipos, versiones e histórico) y **los metadatos de los archivos** (nombre original, UUID, peso, mime, fecha). Supabase Storage almacena los **archivos binarios físicos** en el bucket `archivos`.

---

### Minuto 3:00 - 8:00 | DEMOSTRACIÓN EN VIVO (LIVE DEMO)

#### 1. Rutas Públicas vs Privadas (30 seg)
- Abre el navegador en `index.html`.
- Muestra que sin iniciar sesión solo aparece "Iniciar sesión" y "Crear cuenta".
- Intenta abrir `mis-equipos.html` escribiéndolo en la barra: el sistema redirige automáticamente a `login.html`.

#### 2. Inicio de Sesión Real (30 seg)
- Inicia sesión con:
  - **Correo:** `demo@pokemontb.com`
  - **Contraseña:** `Demo12345`
- Muestra cómo la barra de navegación se actualiza reactivamente a privada mostrando *"Mis equipos"* y *"Mi perfil"*.

#### 3. Importación y Persistencia Dual en Vivo (1 min)
- Entra a **"Crear equipo"** (`equipo.html`).
- Haz clic en **"Importar TXT"**, selecciona el archivo `demo/equipo_ejemplo.txt` y dale aceptar.
- **¡Magia en vivo!** El equipo se carga automáticamente con Charizard (Mega Y), Garchomp e Incineroar con sus EVs, naturalezas y movimientos.

#### 4. Validación del Servidor y Análisis Competitivo (1 min 30 seg)
- En el editor, intenta agregar otro **Garchomp** (especie duplicada):
  - El servidor responderá con **HTTP 400 Bad Request** y el frontend resaltará el error en el integrante.
- Muestra la **matriz de 18 tipos elementales**: calcula debilidades y resistencias en tiempo real.
- Muestra la **tarjeta de recomendaciones**: calcula matemáticamente la estadística promedio más baja del equipo y sugiere Pokémon que la compensan.

#### 5. Gestión y Perfil (1 min)
- Ve a **"Mis equipos"** (`mis-equipos.html`): muestra los equipos guardados en la BD con opciones de editar, duplicar y eliminar.
- Ve a **"Mi perfil"** (`perfil.html`): muestra la edición de datos y cómo el avatar se guarda de forma dual (archivo físico en Storage y metadatos en PostgreSQL).

---

### Minuto 8:00 - 10:00 | PREGUNTAS TÉCNICAS
- Si el profesor pide ver el backend o la API directamente, abres una terminal y ejecutas:
  ```bash
  python demo/demo_rapida.py
  ```
  Esto ejecutará todas las pruebas contra la API en 3 segundos en pantalla.
- Si pide ver las pruebas unitarias:
  ```bash
  cd backend
  npm test
  ```
  Mostrará los 12 tests en verde.
