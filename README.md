# VocalBiometric Studio

Workspace quickstart para desarrollo local.

## Backend

1. Abrir terminal y entrar en `backend/`:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Copiar el archivo de ejemplo y ajustar variables si es necesario:
   ```bash
   cp .env.example .env
   ```
3. Ejecutar el servidor:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend

1. Abrir terminal y entrar en `frontend/`:
   ```bash
   cd frontend
   yarn install
   ```
2. Copiar el ejemplo de entorno local:
   ```bash
   cp .env.example .env.local
   ```
3. Ejecutar la app:
   ```bash
   yarn start
   ```

## Configuración mínima

- Backend:
  - `MONGO_URL` debe apuntar a un MongoDB local o remoto.
  - `DB_NAME` es el nombre de la base de datos.
  - `FAL_KEY` puede quedar vacío hoy; el limpiador devolverá 503 si no está configurado.
- Frontend:
  - `REACT_APP_BACKEND_URL` debe apuntar al backend en ejecución.

## Notas

- El backend ahora usa valores por defecto locales cuando `MONGO_URL`/`DB_NAME` no están definidos.
- El frontend espera el backend en `http://127.0.0.1:8000` por defecto.
