"""
Backend API tests for VocalBiometric Studio.

Covers:
 - Health & prompts
 - Sessions CRUD
 - Takes upload (with tiny synthetic WAV) / list / patch / delete / audio stream
 - Cleaner endpoints (expected 503 because FAL_KEY empty)
 - Biometrics aggregate
 - Training package ZIP download
 - Trained-model upload
 - API keys CRUD
 - Public v1 endpoints with X-API-Key
"""
from __future__ import annotations

import io
import os
import wave
import zipfile
from typing import Generator

import numpy as np
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "http://127.0.0.1:8000",
).rstrip("/")
API = f"{BASE_URL}/api"


# --------------------------------------------------------------------------- helpers
def make_wav_bytes(duration_sec: float = 1.0, freq: float = 220.0,
                   sr: int = 16000) -> bytes:
    """Generate a small mono 16-bit PCM WAV with a sine wave."""
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
    samples = (0.4 * np.sin(2 * np.pi * freq * t) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(samples.tobytes())
    return buf.getvalue()


@pytest.fixture(scope="session")
def client() -> requests.Session:
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def session_id(client: requests.Session) -> Generator[str, None, None]:
    """Create a session used by many tests; cleaned up at end."""
    r = client.post(f"{API}/sessions",
                    json={"name": "TEST_session", "artist": "TEST_artist"})
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    yield sid
    client.delete(f"{API}/sessions/{sid}")


# --------------------------------------------------------------------------- health
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data["service"] == "VocalBiometric Studio"
        assert data["status"] == "ok"
        assert data["fal_configured"] is False  # FAL_KEY intentionally empty


# --------------------------------------------------------------------------- prompts
class TestPrompts:
    def test_prompts_list(self, client):
        r = client.get(f"{API}/prompts")
        assert r.status_code == 200
        data = r.json()
        assert len(data["prompts"]) == 45
        assert len(data["phases"]) == 11
        assert data["total_target_seconds"] == 2700
        # sanity — first prompt has Spanish fields
        p = data["prompts"][0]
        for k in ("id", "phase", "title", "instructions", "duration", "type"):
            assert k in p


# --------------------------------------------------------------------------- sessions
class TestSessions:
    def test_create_and_get_session(self, client):
        r = client.post(f"{API}/sessions",
                        json={"name": "TEST_crud", "artist": "Alice"})
        assert r.status_code == 200
        data = r.json()
        sid = data["id"]
        assert data["name"] == "TEST_crud"
        assert data["artist"] == "Alice"
        assert data["target_seconds"] == 2700
        assert data["takes_count"] == 0

        # get
        r2 = client.get(f"{API}/sessions/{sid}")
        assert r2.status_code == 200
        assert r2.json()["id"] == sid

        # list contains it
        r3 = client.get(f"{API}/sessions")
        assert r3.status_code == 200
        assert any(s["id"] == sid for s in r3.json())

        # delete
        r4 = client.delete(f"{API}/sessions/{sid}")
        assert r4.status_code == 200
        assert r4.json().get("deleted") is True

        # now 404
        r5 = client.get(f"{API}/sessions/{sid}")
        assert r5.status_code == 404

    def test_get_nonexistent(self, client):
        r = client.get(f"{API}/sessions/does-not-exist-xyz")
        assert r.status_code == 404


# --------------------------------------------------------------------------- takes
class TestTakes:
    def test_upload_list_patch_delete_take(self, client, session_id):
        wav = make_wav_bytes(duration_sec=1.0, freq=220.0)
        files = {"file": ("take.wav", wav, "audio/wav")}
        data = {"prompt_id": "w1", "duration_hint": "1.0"}
        r = client.post(f"{API}/sessions/{session_id}/takes",
                        files=files, data=data)
        assert r.status_code == 200, r.text
        t = r.json()
        take_id = t["id"]
        assert t["session_id"] == session_id
        assert t["prompt_id"] == "w1"
        assert t["accepted"] is True
        assert t["cleaned"] is False
        assert t["duration"] > 0.5  # ~1s WAV
        stats = t.get("stats") or {}
        assert stats.get("sample_rate") == 16000
        assert stats.get("duration", 0) > 0

        # list
        r2 = client.get(f"{API}/sessions/{session_id}/takes")
        assert r2.status_code == 200
        assert any(x["id"] == take_id for x in r2.json())

        # filter by prompt
        r3 = client.get(f"{API}/sessions/{session_id}/takes",
                        params={"prompt_id": "w1"})
        assert r3.status_code == 200
        assert all(x["prompt_id"] == "w1" for x in r3.json())

        # session progress updated
        r4 = client.get(f"{API}/sessions/{session_id}")
        assert r4.status_code == 200
        sess = r4.json()
        assert sess["takes_count"] >= 1
        assert sess["accepted_count"] >= 1
        assert sess["total_recorded_seconds"] > 0

        # audio stream
        r5 = client.get(f"{API}/audio/{session_id}/{t['filename']}")
        assert r5.status_code == 200
        assert len(r5.content) > 0

        # patch accepted=false
        r6 = client.patch(f"{API}/sessions/{session_id}/takes/{take_id}",
                          json={"accepted": False})
        assert r6.status_code == 200
        assert r6.json()["accepted"] is False

        # delete
        r7 = client.delete(f"{API}/sessions/{session_id}/takes/{take_id}")
        assert r7.status_code == 200
        assert r7.json().get("deleted") is True

        # audio now 404
        r8 = client.get(f"{API}/audio/{session_id}/{t['filename']}")
        assert r8.status_code == 404

    def test_upload_take_wrong_session(self, client):
        wav = make_wav_bytes(0.3)
        files = {"file": ("t.wav", wav, "audio/wav")}
        data = {"prompt_id": "w1"}
        r = client.post(f"{API}/sessions/does-not-exist/takes",
                        files=files, data=data)
        assert r.status_code == 404


# --------------------------------------------------------------------------- cleaner
class TestCleaner:
    """FAL_KEY is intentionally empty → both endpoints must return 503."""

    def test_clean_take_returns_503(self, client, session_id):
        # need a take to target
        wav = make_wav_bytes(0.5)
        files = {"file": ("c.wav", wav, "audio/wav")}
        data = {"prompt_id": "w2"}
        up = client.post(f"{API}/sessions/{session_id}/takes",
                         files=files, data=data)
        assert up.status_code == 200
        take_id = up.json()["id"]
        r = client.post(f"{API}/sessions/{session_id}/takes/{take_id}/clean")
        assert r.status_code == 503
        detail = r.json().get("detail", "")
        assert "FAL_KEY" in detail

    def test_oneoff_clean_returns_503(self, client):
        wav = make_wav_bytes(0.3)
        files = {"file": ("c.wav", wav, "audio/wav")}
        r = client.post(f"{API}/cleaner/clean", files=files)
        assert r.status_code == 503
        assert "FAL_KEY" in r.json().get("detail", "")


# --------------------------------------------------------------------------- biometrics
class TestBiometrics:
    def test_biometrics_with_zero_takes(self, client):
        r = client.post(f"{API}/sessions",
                        json={"name": "TEST_biom_empty"})
        sid = r.json()["id"]
        try:
            b = client.get(f"{API}/sessions/{sid}/biometrics")
            assert b.status_code == 200
            data = b.json()
            assert data["takes_accepted"] == 0
            assert data["total_recorded_seconds"] == 0
            assert data["target_seconds"] == 2700
            assert data["progress_pct"] == 0
            assert data["duration_by_phase"] == {}
            assert isinstance(data["phases"], list) and len(data["phases"]) == 11
        finally:
            client.delete(f"{API}/sessions/{sid}")

    def test_biometrics_with_takes(self, client, session_id):
        # upload 2 small wavs
        for prompt in ("w3", "s1"):
            files = {"file": ("b.wav", make_wav_bytes(0.8, 300), "audio/wav")}
            up = client.post(f"{API}/sessions/{session_id}/takes",
                             files=files, data={"prompt_id": prompt})
            assert up.status_code == 200
        b = client.get(f"{API}/sessions/{session_id}/biometrics")
        assert b.status_code == 200
        data = b.json()
        assert data["takes_accepted"] >= 2
        assert data["total_recorded_seconds"] > 0


# --------------------------------------------------------------------------- package
class TestPackage:
    def test_download_zip(self, client, session_id):
        r = client.get(f"{API}/sessions/{session_id}/package/download")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/zip")
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        assert "README.md" in names
        assert "prompts.json" in names
        assert "biometrics.json" in names
        assert "manifest.json" in names


# --------------------------------------------------------------------------- model upload
class TestModelUpload:
    def test_upload_fake_pth(self, client, session_id):
        fake_pth = b"PK-FAKE-MODEL-BYTES" * 100
        files = {"file": ("voice.pth", fake_pth, "application/octet-stream")}
        r = client.post(f"{API}/sessions/{session_id}/model", files=files)
        assert r.status_code == 200
        out = r.json()
        assert out["filename"].endswith(".pth")
        assert out["size_bytes"] > 0


# --------------------------------------------------------------------------- api keys
class TestApiKeys:
    def test_create_list_revoke(self, client, session_id):
        r = client.post(f"{API}/api-keys",
                        json={"label": "TEST_key", "session_id": session_id})
        assert r.status_code == 200
        k = r.json()
        assert k["key"].startswith("vbs_")
        assert k["session_id"] == session_id
        kid = k["id"]

        # list
        r2 = client.get(f"{API}/api-keys")
        assert r2.status_code == 200
        assert any(x["id"] == kid for x in r2.json())

        # filter
        r3 = client.get(f"{API}/api-keys",
                        params={"session_id": session_id})
        assert r3.status_code == 200
        assert all(x["session_id"] == session_id for x in r3.json())

        # revoke
        r4 = client.delete(f"{API}/api-keys/{kid}")
        assert r4.status_code == 200
        assert r4.json().get("revoked") is True


# --------------------------------------------------------------------------- v1 public API
class TestPublicApi:
    def test_status_requires_key(self, client):
        r = client.get(f"{API}/v1/status")
        assert r.status_code == 401

    def test_status_invalid_key(self, client):
        r = client.get(f"{API}/v1/status",
                       headers={"X-API-Key": "vbs_invalid"})
        assert r.status_code == 401

    def test_status_valid_key(self, client, session_id):
        k = client.post(f"{API}/api-keys",
                        json={"label": "TEST_v1", "session_id": session_id}).json()
        r = client.get(f"{API}/v1/status",
                       headers={"X-API-Key": k["key"]})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["session_id"] == session_id

    def test_infer_412_without_model(self, client):
        # fresh session → no model uploaded yet
        s = client.post(f"{API}/sessions",
                        json={"name": "TEST_infer_nomodel"}).json()
        sid = s["id"]
        k = client.post(f"{API}/api-keys",
                        json={"label": "TEST_nm", "session_id": sid}).json()
        try:
            r = client.post(f"{API}/v1/infer",
                            headers={"X-API-Key": k["key"]},
                            data={"text": "hola", "style": "ranchera"})
            assert r.status_code == 412
        finally:
            client.delete(f"{API}/sessions/{sid}")

    def test_infer_200_with_model(self, client):
        s = client.post(f"{API}/sessions",
                        json={"name": "TEST_infer_model"}).json()
        sid = s["id"]
        try:
            # upload fake model
            up = client.post(f"{API}/sessions/{sid}/model",
                             files={"file": ("m.pth", b"FAKEMODEL" * 50,
                                             "application/octet-stream")})
            assert up.status_code == 200
            k = client.post(f"{API}/api-keys",
                            json={"label": "TEST_m", "session_id": sid}).json()
            r = client.post(f"{API}/v1/infer",
                            headers={"X-API-Key": k["key"]},
                            data={"text": "canta conmigo", "style": "rock"})
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["status"] == "queued"
            assert data["text"] == "canta conmigo"
            assert data["style"] == "rock"
            assert data["model"].endswith(".pth")
        finally:
            client.delete(f"{API}/sessions/{sid}")
