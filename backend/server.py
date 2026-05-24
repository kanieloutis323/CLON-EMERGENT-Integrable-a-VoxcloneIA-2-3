"""VocalBiometric Studio backend.

Voice cloning training platform focused on singing: guided 40-min recording,
audio cleanup, vocal biometrics, dataset packaging, REST API for
mobile/desktop app integration.
"""
from __future__ import annotations

import io
import json
import logging
import math
import os
import secrets
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import aiofiles
from dotenv import load_dotenv
from fastapi import (APIRouter, FastAPI, File, Form, Header, HTTPException,
                     UploadFile)
from fastapi.responses import FileResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from audio_utils import basic_stats, freq_to_note
from prompts_data import PHASES, PROMPTS, TOTAL_TARGET_SECONDS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

STORAGE_DIR = ROOT_DIR / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

# MongoDB
mongo_url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017").strip()
db_name = os.environ.get("DB_NAME", "vocalbiometric_studio").strip()

if not mongo_url:
    mongo_url = "mongodb://127.0.0.1:27017"
if not db_name:
    db_name = "vocalbiometric_studio"

if "MONGO_URL" not in os.environ:
    log.warning("MONGO_URL no definido; se usará el valor por defecto local.")
if "DB_NAME" not in os.environ:
    log.warning("DB_NAME no definido; se usará el valor por defecto local.")

mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[db_name]

FAL_KEY = os.environ.get("FAL_KEY", "").strip()

app = FastAPI(title="VocalBiometric Studio")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("vocal-studio")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SessionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    artist: Optional[str] = None


class Session(BaseModel):
    id: str
    name: str
    artist: Optional[str] = None
    created_at: str
    target_seconds: int = TOTAL_TARGET_SECONDS
    total_recorded_seconds: float = 0.0
    takes_count: int = 0
    accepted_count: int = 0
    model_filename: Optional[str] = None


class Take(BaseModel):
    id: str
    session_id: str
    prompt_id: str
    filename: str
    duration: float = 0.0
    accepted: bool = True
    cleaned: bool = False
    cleaned_url: Optional[str] = None
    stats: dict[str, Any] = {}
    created_at: str


class TakeUpdate(BaseModel):
    accepted: Optional[bool] = None


class ApiKeyCreate(BaseModel):
    label: str
    session_id: Optional[str] = None


class ApiKeyOut(BaseModel):
    id: str
    key: str
    label: str
    session_id: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
def session_dir(session_id: str) -> Path:
    d = STORAGE_DIR / "sessions" / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d


async def recompute_session_progress(session_id: str) -> None:
    takes = await db.takes.find(
        {"session_id": session_id}, {"_id": 0}
    ).to_list(10000)
    total = sum((t.get("duration") or 0) for t in takes if t.get("accepted"))
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {
            "total_recorded_seconds": float(total),
            "takes_count": len(takes),
            "accepted_count": sum(1 for t in takes if t.get("accepted")),
        }},
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "VocalBiometric Studio", "status": "ok",
            "fal_configured": bool(FAL_KEY)}


# ---------------------------------------------------------------------------
# Prompts (static training script)
# ---------------------------------------------------------------------------
@api.get("/prompts")
async def get_prompts():
    return {
        "prompts": PROMPTS,
        "phases": PHASES,
        "total_target_seconds": TOTAL_TARGET_SECONDS,
    }


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
@api.post("/sessions", response_model=Session)
async def create_session(payload: SessionCreate):
    s = Session(
        id=str(uuid.uuid4()),
        name=payload.name,
        artist=payload.artist,
        created_at=now_iso(),
    )
    await db.sessions.insert_one(s.model_dump())
    session_dir(s.id)
    return s


@api.get("/sessions", response_model=list[Session])
async def list_sessions():
    docs = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Session(**d) for d in docs]


@api.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Session not found")
    return Session(**doc)


@api.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.sessions.delete_one({"id": session_id})
    await db.takes.delete_many({"session_id": session_id})
    await db.api_keys.delete_many({"session_id": session_id})
    sdir = STORAGE_DIR / "sessions" / session_id
    if sdir.exists():
        shutil.rmtree(sdir, ignore_errors=True)
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Takes
# ---------------------------------------------------------------------------
@api.post("/sessions/{session_id}/takes", response_model=Take)
async def upload_take(
    session_id: str,
    prompt_id: str = Form(...),
    duration_hint: float = Form(0.0),
    file: UploadFile = File(...),
):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")

    take_id = str(uuid.uuid4())
    ext = (Path(file.filename or "").suffix or ".webm").lstrip(".") or "webm"
    filename = f"{take_id}.{ext}"
    fpath = session_dir(session_id) / filename
    async with aiofiles.open(fpath, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)

    stats: dict = {}
    try:
        stats = basic_stats(str(fpath))
    except Exception as e:  # noqa: BLE001
        stats = {"error": str(e)}

    duration = float(stats.get("duration") or 0.0)
    if duration <= 0 and duration_hint > 0:
        duration = duration_hint

    t = Take(
        id=take_id,
        session_id=session_id,
        prompt_id=prompt_id,
        filename=filename,
        duration=duration,
        accepted=True,
        cleaned=False,
        cleaned_url=None,
        stats=stats,
        created_at=now_iso(),
    )
    await db.takes.insert_one(t.model_dump())
    await recompute_session_progress(session_id)
    return t


@api.get("/sessions/{session_id}/takes", response_model=list[Take])
async def list_takes(session_id: str, prompt_id: Optional[str] = None):
    q: dict = {"session_id": session_id}
    if prompt_id:
        q["prompt_id"] = prompt_id
    docs = await db.takes.find(q, {"_id": 0}).sort("created_at", 1).to_list(10000)
    return [Take(**d) for d in docs]


@api.patch("/sessions/{session_id}/takes/{take_id}", response_model=Take)
async def update_take(session_id: str, take_id: str, payload: TakeUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, "Nothing to update")
    res = await db.takes.find_one_and_update(
        {"id": take_id, "session_id": session_id},
        {"$set": update},
        projection={"_id": 0},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "Take not found")
    await recompute_session_progress(session_id)
    return Take(**res)


@api.delete("/sessions/{session_id}/takes/{take_id}")
async def delete_take(session_id: str, take_id: str):
    doc = await db.takes.find_one({"id": take_id, "session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Take not found")
    fpath = session_dir(session_id) / doc["filename"]
    if fpath.exists():
        fpath.unlink()
    await db.takes.delete_one({"id": take_id})
    await recompute_session_progress(session_id)
    return {"deleted": True}


@api.get("/audio/{session_id}/{filename}")
async def stream_audio(session_id: str, filename: str):
    path = session_dir(session_id) / filename
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(path, media_type="audio/webm")


# ---------------------------------------------------------------------------
# Audio cleaner (fal.ai DeepFilterNet3)
# ---------------------------------------------------------------------------
def _run_fal_cleanup(local_path: str) -> dict:
    if not FAL_KEY:
        raise HTTPException(503, "FAL_KEY no configurada en backend/.env")
    import fal_client  # noqa: WPS433
    import httpx
    os.environ["FAL_KEY"] = FAL_KEY
    try:
        audio_url = fal_client.upload_file(local_path)
        result = fal_client.subscribe(
            "fal-ai/deepfilternet3",
            arguments={"audio_url": audio_url},
            with_logs=False,
        )
        return result
    except httpx.HTTPStatusError as e:
        body = ""
        try:
            body = e.response.text
        except Exception:  # noqa: BLE001
            pass
        if e.response.status_code == 403 and "balance" in body.lower():
            raise HTTPException(
                402,
                "Cuenta fal.ai sin saldo. Recarga en fal.ai/dashboard/billing y reintenta.",
            )
        raise HTTPException(
            e.response.status_code,
            f"fal.ai error: {body or str(e)}",
        )
    except Exception as e:  # noqa: BLE001
        log.exception("fal.ai cleanup failed")
        raise HTTPException(502, f"Error al limpiar audio: {e}")


def _extract_cleaned_url(result: dict) -> Optional[str]:
    if not result:
        return None
    for k in ("audio", "audio_file", "output"):
        v = result.get(k)
        if isinstance(v, dict) and v.get("url"):
            return v["url"]
    return result.get("audio_url") or result.get("url")


@api.post("/sessions/{session_id}/takes/{take_id}/clean")
async def clean_take(session_id: str, take_id: str):
    doc = await db.takes.find_one({"id": take_id, "session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Take not found")
    fpath = session_dir(session_id) / doc["filename"]
    result = _run_fal_cleanup(str(fpath))
    cleaned_url = _extract_cleaned_url(result)
    await db.takes.update_one(
        {"id": take_id},
        {"$set": {"cleaned": True, "cleaned_url": cleaned_url}},
    )
    return {"cleaned_url": cleaned_url}


@api.post("/cleaner/clean")
async def one_off_clean(file: UploadFile = File(...)):
    tmp_id = uuid.uuid4().hex
    ext = (Path(file.filename or "").suffix or ".wav").lstrip(".") or "wav"
    tmp_dir = STORAGE_DIR / "cleaner"
    tmp_dir.mkdir(exist_ok=True)
    tmp_path = tmp_dir / f"{tmp_id}.{ext}"
    async with aiofiles.open(tmp_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)
    result = _run_fal_cleanup(str(tmp_path))
    cleaned_url = _extract_cleaned_url(result)
    return {"cleaned_url": cleaned_url}


# ---------------------------------------------------------------------------
# Biometrics
# ---------------------------------------------------------------------------
@api.get("/sessions/{session_id}/biometrics")
async def biometrics(session_id: str):
    takes = await db.takes.find(
        {"session_id": session_id, "accepted": True}, {"_id": 0}
    ).to_list(10000)

    total_duration = 0.0
    f0_mins, f0_maxs, f0_means, peaks, rmss = [], [], [], [], []
    by_phase: dict[str, float] = {}
    prompt_phase = {p["id"]: p["phase"] for p in PROMPTS}

    for t in takes:
        dur = float(t.get("duration") or 0)
        total_duration += dur
        phase = prompt_phase.get(t.get("prompt_id"), "Otro")
        by_phase[phase] = by_phase.get(phase, 0.0) + dur
        st = t.get("stats") or {}
        if st.get("f0_min"):
            f0_mins.append(st["f0_min"])
        if st.get("f0_max"):
            f0_maxs.append(st["f0_max"])
        if st.get("f0_mean"):
            f0_means.append(st["f0_mean"])
        if st.get("peak") is not None:
            peaks.append(st["peak"])
        if st.get("rms") is not None:
            rmss.append(st["rms"])

    def _avg(xs):
        return float(sum(xs) / len(xs)) if xs else 0.0

    f0_min = min(f0_mins) if f0_mins else 0.0
    f0_max = max(f0_maxs) if f0_maxs else 0.0
    range_semitones = (
        round(12 * math.log2(f0_max / f0_min)) if (f0_min > 0 and f0_max > 0 and f0_max > f0_min) else 0
    )

    return {
        "total_recorded_seconds": total_duration,
        "target_seconds": TOTAL_TARGET_SECONDS,
        "progress_pct": min(100.0, (total_duration / TOTAL_TARGET_SECONDS) * 100)
        if TOTAL_TARGET_SECONDS else 0,
        "takes_accepted": len(takes),
        "f0_min_hz": round(f0_min, 1),
        "f0_max_hz": round(f0_max, 1),
        "f0_mean_hz": round(_avg(f0_means), 1),
        "note_lowest": freq_to_note(f0_min) if f0_min else None,
        "note_highest": freq_to_note(f0_max) if f0_max else None,
        "range_semitones": range_semitones,
        "avg_peak": round(_avg(peaks), 4),
        "avg_rms": round(_avg(rmss), 4),
        "duration_by_phase": by_phase,
        "phases": PHASES,
    }


# ---------------------------------------------------------------------------
# Training package export
# ---------------------------------------------------------------------------
TRAIN_README = """# Paquete de entrenamiento — VocalBiometric Studio

Dataset vocal (limpio y aceptado) listo para entrenar un modelo de
clonación de voz cantada 100% local, sin depender de APIs de terceros.

## Entrenamiento recomendado: RVC v2

Requisitos: Python 3.10, GPU NVIDIA con CUDA (>= 6 GB VRAM).
Repo oficial: https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI

Pasos:
1. Clona el repo y crea el entorno (ver README oficial).
2. Coloca la carpeta `dataset/` dentro de `logs/<mi_voz>/0_gt_wavs/`.
3. Preprocesa: `python infer-web.py` y sigue el pipeline.
4. Entrena 200-500 épocas. Vigila sobreajuste.
5. Sube el `.pth` y `.index` resultantes desde la sección Export del estudio.

## Alternativa: So-VITS-SVC 4.x (mejor canto expresivo)

Repo: https://github.com/svc-develop-team/so-vits-svc
Coloca `dataset/` como `dataset_raw/<mi_voz>/`.

## Archivos
- dataset/*.wav     tomas aceptadas (limpias si pasaste por el limpiador)
- manifest.json     metadatos de cada toma (prompt, fase, duración, F0)
- biometrics.json   perfil biométrico vocal agregado
- prompts.json      script completo de entrenamiento

## Integración móvil/escritorio
- El `.pth` resultante se exporta a ONNX para Android/iOS.
- En Windows, carga directamente con PyTorch.
- Consume la API REST de este estudio con tu X-API-Key (sección /api-panel).
"""


@api.get("/sessions/{session_id}/package/download")
async def download_package(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    takes = await db.takes.find(
        {"session_id": session_id, "accepted": True}, {"_id": 0}
    ).sort("created_at", 1).to_list(10000)

    mem = io.BytesIO()
    with zipfile.ZipFile(mem, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.md", TRAIN_README)
        zf.writestr("prompts.json", json.dumps(PROMPTS, indent=2, ensure_ascii=False))
        zf.writestr(
            "biometrics.json",
            json.dumps({"session": session, "takes_count": len(takes)},
                       indent=2, ensure_ascii=False, default=str),
        )
        manifest = []
        for t in takes:
            fpath = session_dir(session_id) / t["filename"]
            if fpath.exists():
                zf.write(fpath, arcname=f"dataset/{t['filename']}")
                manifest.append({
                    "file": f"dataset/{t['filename']}",
                    "prompt_id": t["prompt_id"],
                    "duration": t.get("duration"),
                    "stats": t.get("stats"),
                    "cleaned": t.get("cleaned"),
                })
        zf.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))

    mem.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=training_{session_id}.zip"}
    return StreamingResponse(mem, media_type="application/zip", headers=headers)


# ---------------------------------------------------------------------------
# Trained-model upload + inference stub
# ---------------------------------------------------------------------------
@api.post("/sessions/{session_id}/model")
async def upload_trained_model(session_id: str, file: UploadFile = File(...)):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    mdir = session_dir(session_id) / "model"
    mdir.mkdir(exist_ok=True)
    path = mdir / (file.filename or "model.pth")
    async with aiofiles.open(path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"model_filename": path.name, "model_uploaded_at": now_iso()}},
    )
    return {"filename": path.name, "size_bytes": path.stat().st_size}


# ---------------------------------------------------------------------------
# API Keys (mobile/desktop integration)
# ---------------------------------------------------------------------------
@api.post("/api-keys", response_model=ApiKeyOut)
async def create_api_key(payload: ApiKeyCreate):
    k = ApiKeyOut(
        id=str(uuid.uuid4()),
        key="vbs_" + secrets.token_urlsafe(32),
        label=payload.label,
        session_id=payload.session_id,
        created_at=now_iso(),
    )
    await db.api_keys.insert_one(k.model_dump())
    return k


@api.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(session_id: Optional[str] = None):
    q = {"session_id": session_id} if session_id else {}
    docs = await db.api_keys.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ApiKeyOut(**d) for d in docs]


@api.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: str):
    await db.api_keys.delete_one({"id": key_id})
    return {"revoked": True}


async def _require_api_key(x_api_key: Optional[str]) -> dict:
    if not x_api_key:
        raise HTTPException(401, "Falta X-API-Key")
    doc = await db.api_keys.find_one({"key": x_api_key}, {"_id": 0})
    if not doc:
        raise HTTPException(401, "API key inválida")
    return doc


@api.get("/v1/status")
async def public_status(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")):
    k = await _require_api_key(x_api_key)
    return {"ok": True, "session_id": k.get("session_id"), "label": k.get("label")}


@api.post("/v1/infer")
async def public_infer(
    text: str = Form(...),
    style: str = Form("ranchera"),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    """Public inference endpoint for mobile/Windows apps."""
    k = await _require_api_key(x_api_key)
    session_id = k.get("session_id")
    if not session_id:
        raise HTTPException(400, "API key no asociada a sesión")
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Sesión no encontrada")
    model_name = session.get("model_filename")
    if not model_name:
        raise HTTPException(
            412,
            "No hay modelo entrenado subido. Entrena localmente con el paquete "
            "exportado y súbelo desde Export.",
        )
    return {
        "status": "queued",
        "text": text,
        "style": style,
        "model": model_name,
        "note": "Inference runner local pendiente de conexión",
    }


# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    mongo_client.close()
