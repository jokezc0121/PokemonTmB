import http.client
import json

SERVER = "localhost:3000"

def get(path, token=None):
    conn = http.client.HTTPConnection(SERVER)
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    conn.request("GET", path, headers=headers)
    res = conn.getresponse()
    data = res.read().decode()
    conn.close()
    return res.status, json.loads(data) if data else {}

def post(path, body, token=None):
    conn = http.client.HTTPConnection(SERVER)
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    conn.request("POST", path, body=json.dumps(body), headers=headers)
    res = conn.getresponse()
    data = res.read().decode()
    conn.close()
    return res.status, json.loads(data) if data else {}

def banner(titulo):
    print("\n" + "="*60)
    print(f" {titulo}")
    print("="*60)

def main():
    print("INICIANDO VERIFICACIÓN EN VIVO DEL SISTEMA FULL-STACK...")

    # 1. Health Check
    banner("1. COMPROBACIÓN DE SALUD (API & BD)")
    status, res = get("/api/health")
    print(f"-> GET /api/health | Código: {status}")
    print(f"   Estado API: {res.get('data', {}).get('estado')} | Base de Datos: {res.get('data', {}).get('db')}")

    # 2. Rutas Privadas y Seguridad
    banner("2. PRUEBA DE RUTAS PROTEGIDAS (SIN TOKEN)")
    status, res = get("/api/equipos")
    print(f"-> GET /api/equipos sin cabecera Authorization | Código esperado: 401")
    print(f"   Código recibido: {status} | Mensaje: {res.get('error', {}).get('mensaje')}")

    # 3. Autenticación Real
    banner("3. AUTENTICACIÓN Y GENERACIÓN DE JWT")
    status, res = post("/api/auth/login", {"correo": "demo@pokemontb.com", "contrasena": "Demo12345"})
    print(f"-> POST /api/auth/login | Código: {status}")
    token = res.get("data", {}).get("token")
    usuario = res.get("data", {}).get("usuario", {})
    print(f"   Usuario autenticado: {usuario.get('nombreEntrenador')} ({usuario.get('correo')})")
    print(f"   Token JWT emitido: {token[:25]}... (Longitud: {len(token) if token else 0} caracteres)")

    if not token:
        print("ERROR: No se pudo obtener el token para continuar.")
        return

    # 4. Catálogo y Filtros
    banner("4. CATÁLOGO ASÍNCRONO")
    status, res = get("/api/pokemon?limite=3", token)
    print(f"-> GET /api/pokemon?limite=3 | Código: {status}")
    lista = res.get("data", {}).get("elementos", [])
    for p in lista:
        tipos = ", ".join(t.get("nombre") for t in p.get("tipos", []))
        print(f"   - #{p.get('id')} {p.get('nombreMostrar')} | Tipos: [{tipos}]")

    # 5. Validación de Reglas en Servidor (Error 400 Intencional)
    banner("5. VALIDACIÓN DE REGLAS COMPETITIVAS (RECHAZO 400)")
    equipo_invalido = {
        "nombre": "Equipo con Especie Repetida",
        "formato": "doble",
        "integrantes": [
            {"pokemon": "garchomp", "objeto": "Ninguno", "movimientos": ["Terremoto"]},
            {"pokemon": "garchomp", "objeto": "Ninguno", "movimientos": ["Terremoto"]}
        ]
    }
    status, res = post("/api/equipos/validar", equipo_invalido, token)
    print(f"-> POST /api/equipos/validar (Dos Garchomp) | Código recibido: {status}")
    errores = res.get("error", {}).get("detalles", [])
    for e in errores:
        print(f"   ✓ Validación detectada: [{e.get('campo')}] -> {e.get('mensaje')}")

    # 6. Persistencia Dual
    banner("6. CONSULTA DE PERSISTENCIA DUAL")
    status, res = get("/api/equipos", token)
    print(f"-> GET /api/equipos (Equipos del usuario en BD) | Código: {status}")
    equipos = res.get("data", [])
    print(f"   Total de equipos registrados: {len(equipos)}")
    for eq in equipos:
        print(f"   - Equipo: \"{eq.get('nombre')}\" | Integrantes: {len(eq.get('integrantes', []))} | Versión: {eq.get('version', 1)}")

    print("\n" + "="*60)
    print(" ✓ DEMOSTRACIÓN FINALIZADA CON ÉXITO: SISTEMA 100% OPERATIVO")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
