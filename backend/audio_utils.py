"""Audio analysis helpers for vocal biometrics."""
from __future__ import annotations
import io
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf


def read_audio(path: str) -> tuple[np.ndarray, int]:
    data, sr = sf.read(path, always_2d=False)
    if data.ndim > 1:
        data = data.mean(axis=1)
    return data.astype(np.float32), sr


def basic_stats(path: str) -> dict:
    """Compute duration, peak, RMS, estimated fundamental freq range.
    F0 estimated via naive autocorrelation on frames (fast, no librosa)."""
    try:
        audio, sr = read_audio(path)
    except Exception as e:
        return {"error": str(e), "duration": 0.0}

    if len(audio) == 0:
        return {"duration": 0.0, "rms": 0.0, "peak": 0.0, "sample_rate": sr}

    duration = len(audio) / sr
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio ** 2)))

    f0_values = estimate_f0_frames(audio, sr)
    if len(f0_values) > 0:
        f0_min = float(np.percentile(f0_values, 5))
        f0_max = float(np.percentile(f0_values, 95))
        f0_mean = float(np.mean(f0_values))
    else:
        f0_min = f0_max = f0_mean = 0.0

    return {
        "duration": float(duration),
        "sample_rate": int(sr),
        "peak": peak,
        "rms": rms,
        "f0_min": f0_min,
        "f0_max": f0_max,
        "f0_mean": f0_mean,
        "note_lowest": freq_to_note(f0_min) if f0_min > 0 else None,
        "note_highest": freq_to_note(f0_max) if f0_max > 0 else None,
    }


def estimate_f0_frames(audio: np.ndarray, sr: int,
                       frame_ms: int = 40, hop_ms: int = 20,
                       f_min: float = 70.0, f_max: float = 1000.0,
                       rms_threshold: float = 0.02) -> np.ndarray:
    """Simple autocorrelation-based F0 estimation per frame. Returns array of Hz."""
    frame_len = int(sr * frame_ms / 1000)
    hop_len = int(sr * hop_ms / 1000)
    if frame_len < 2 or len(audio) < frame_len:
        return np.array([])

    min_lag = int(sr / f_max)
    max_lag = int(sr / f_min)

    results = []
    for start in range(0, len(audio) - frame_len, hop_len):
        frame = audio[start:start + frame_len]
        frame_rms = np.sqrt(np.mean(frame ** 2))
        if frame_rms < rms_threshold:
            continue
        frame = frame - np.mean(frame)
        # Autocorrelation
        corr = np.correlate(frame, frame, mode="full")
        corr = corr[len(corr) // 2:]
        if max_lag >= len(corr):
            continue
        segment = corr[min_lag:max_lag]
        if len(segment) == 0:
            continue
        peak_lag = np.argmax(segment) + min_lag
        if peak_lag > 0 and corr[peak_lag] > 0.3 * corr[0]:
            f0 = sr / peak_lag
            if f_min <= f0 <= f_max:
                results.append(f0)
    return np.array(results)


NOTE_NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"]


def freq_to_note(freq: float) -> Optional[str]:
    if freq <= 0:
        return None
    # A4 = 440 Hz = MIDI 69
    midi = int(round(69 + 12 * np.log2(freq / 440.0)))
    octave = midi // 12 - 1
    name = NOTE_NAMES[midi % 12]
    return f"{name}{octave}"
