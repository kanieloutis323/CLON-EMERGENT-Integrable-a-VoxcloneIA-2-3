# Product Requirements Document — VocalBiometric Studio

**Original Problem (verbatim, Spanish):**
> NECESITO UN MODELO DE CLONVOICE IA 100% DIRIGIDO A MUSICA Y CANTO, QUE PUEDA GENERAR VOZ A PARTIR DEL ANALISIS METICULOSO (ENTRENADO) DE LA BIOMETRICA VOCAL DE UN USUARIO A PARTIR DE MINIMO 40 MINS DE GRABACION.
> 1.- Grabación con instrucciones para entrenar correctamente al clon.
> 2.- Limpiador de audio (mejorar audio si el micrófono no es bueno).
> 3.- Que pueda ser adaptado a una aplicación móvil/escritorio Windows al concluir.
> 4.- Modelo IA totalmente fiel a la biometría vocal del usuario, capaz de imaginarlo cantando rancheras o graspy en rock.

**User-imposed constraints:**
- Sin APIs de terceros para el modelo de clonación (debe ser open-source local: RVC / So-VITS-SVC).
- Limpiador de audio sí puede usar fal.ai (única excepción).
- Sin sistema de login.
- API propia para integración móvil/escritorio.

## Personas
- Cantante profesional/aficionado que quiere preservar y proyectar su voz.
- Productor que necesita una voz cantada digital fiel a su artista.
- Desarrollador que integra la voz clonada a una app móvil/Windows.

## Architecture
- **Frontend**: React 19 SPA (brutalist dark studio theme, Clash Display + JetBrains Mono).
- **Backend**: FastAPI + Motor (MongoDB).
- **Storage**: Local filesystem at `/app/backend/storage/sessions/{id}/` for tomas; modelo entrenado en `/model/`.
- **Audio cleaner**: fal.ai DeepFilterNet3 (requires `FAL_KEY` env).
- **Voice model**: dataset packaging para RVC/So-VITS-SVC (entrenamiento y inferencia ocurren localmente en GPU del usuario).

## Implemented (2026-02)
- 45 prompts estructurados en 11 fases (45 min total) en español: calentamiento, escalas, intervalos, dinámica, vibrato, registros, emoción, ranchera, rock graspy, fonética, improvisación.
- Sesiones CRUD + cards con progreso visual.
- Estudio de grabación guiada con MediaRecorder, waveform en vivo, LED meter (Web Audio API), timer, navegación entre prompts.
- Take library con play/accept/reject/clean/delete por toma.
- Limpiador independiente (`/cleaner`) y limpieza por toma vía fal.ai DeepFilterNet3.
- Biométrica vocal: F0 min/max/mean, nota más grave/aguda (notación española), rango en semitonos, RMS, peak, cobertura por fase.
- Export: descarga ZIP con dataset, manifest, prompts, biometrics y README de entrenamiento RVC/So-VITS.
- Upload de modelo entrenado (.pth/.index).
- API Key management (UI + endpoints).
- Endpoints públicos `/api/v1/status` y `/api/v1/infer` con autenticación X-API-Key (infer es stub conectado a modelo local pendiente).

## Backlog
- **P0**: Configurar `FAL_KEY` real (placeholder vacío hoy → cleanup retorna 503).
- **P1**: Inference runner local (cargar `.pth`, generar audio cantado real desde texto + estilo).
- **P1**: Slicer automático de tomas largas en chunks de 6-10s para mejor entrenamiento RVC.
- **P2**: Integración fal.ai voice isolation para separar voz de fondo en grabaciones móviles.
- **P2**: Export ONNX/TFLite del modelo entrenado para Android/iOS.
- **P2**: Métricas avanzadas: vibrato rate, breathiness index, jitter/shimmer.
- **P2**: Versionado de modelos por sesión.

## Next Tasks
1. Cuando el usuario provea `FAL_KEY`, cargarla en `/app/backend/.env` y probar limpieza end-to-end.
2. Implementar inference runner local en backend con RVC.
3. Generar SDK ejemplo (Python + TypeScript) para integración rápida.
