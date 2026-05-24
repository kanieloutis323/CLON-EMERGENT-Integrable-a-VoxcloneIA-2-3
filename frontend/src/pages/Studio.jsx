import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Mic,
    Square,
    Play,
    Pause,
    Trash2,
    SkipBack,
    SkipForward,
    Wand2,
    CheckCircle2,
    XCircle,
    Sparkles,
    Activity,
} from "lucide-react";
import {
    fetchPrompts,
    getSession,
    listTakes,
    uploadTake,
    updateTake,
    deleteTake,
    audioUrl,
    cleanTake,
} from "../lib/api";
import AudioMeter from "../components/AudioMeter";
import Waveform from "../components/Waveform";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const fmt = (s) =>
    `${Math.floor(s / 60)
        .toString()
        .padStart(2, "0")}:${Math.floor(s % 60)
        .toString()
        .padStart(2, "0")}`;

export default function Studio() {
    const { sessionId } = useParams();
    const [data, setData] = useState({ prompts: [], phases: [] });
    const [session, setSession] = useState(null);
    const [idx, setIdx] = useState(0);
    const [takes, setTakes] = useState([]);
    const [allTakeCount, setAllTakeCount] = useState(0);

    // Recording state
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const startedAtRef = useRef(null);
    const tickRef = useRef(null);

    const prompt = data.prompts[idx];

    useEffect(() => {
        (async () => {
            const [p, s] = await Promise.all([
                fetchPrompts(),
                getSession(sessionId),
            ]);
            setData(p);
            setSession(s);
        })().catch(() => toast.error("Error cargando estudio"));
        return () => stopMic();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    useEffect(() => {
        if (!prompt) return;
        loadTakes(prompt.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt?.id]);

    const loadTakes = async (promptId) => {
        const all = await listTakes(sessionId);
        setAllTakeCount(all.length);
        setTakes(all.filter((t) => t.prompt_id === promptId));
    };

    const setupMic = async () => {
        if (streamRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            streamRef.current = stream;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            src.connect(analyser);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
        } catch (e) {
            toast.error("No se pudo acceder al micrófono");
        }
    };

    const stopMic = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }
        analyserRef.current = null;
    };

    const startRec = async () => {
        await setupMic();
        if (!streamRef.current) return;
        chunksRef.current = [];
        const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
        mr.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.onstop = onStopRec;
        mr.start();
        recorderRef.current = mr;
        startedAtRef.current = Date.now();
        setElapsed(0);
        setRecording(true);
        tickRef.current = setInterval(() => {
            setElapsed((Date.now() - startedAtRef.current) / 1000);
        }, 100);
    };

    const stopRec = () => {
        if (!recorderRef.current) return;
        recorderRef.current.stop();
        clearInterval(tickRef.current);
        setRecording(false);
    };

    const onStopRec = async () => {
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
            await uploadTake(sessionId, prompt.id, blob, `take_${Date.now()}.webm`);
            toast.success("Toma guardada");
            await loadTakes(prompt.id);
        } catch (e) {
            toast.error("Error al subir la toma");
        }
        // refresh session for progress
        const s = await getSession(sessionId);
        setSession(s);
    };

    const onAccept = async (take, accepted) => {
        await updateTake(sessionId, take.id, { accepted });
        await loadTakes(prompt.id);
        const s = await getSession(sessionId);
        setSession(s);
    };

    const onDeleteTake = async (take) => {
        if (!window.confirm("¿Eliminar esta toma?")) return;
        await deleteTake(sessionId, take.id);
        await loadTakes(prompt.id);
        const s = await getSession(sessionId);
        setSession(s);
    };

    const onClean = async (take) => {
        toast("Enviando a limpiador (fal.ai DeepFilterNet3)...");
        try {
            const r = await cleanTake(sessionId, take.id);
            if (r.cleaned_url) {
                toast.success("Audio limpio listo");
                await loadTakes(prompt.id);
            } else {
                toast.error("No se pudo limpiar");
            }
        } catch (e) {
            toast.error(
                e?.response?.data?.detail || "Error en el limpiador. ¿FAL_KEY configurada?",
            );
        }
    };

    const progress = useMemo(() => {
        if (!session || !data.prompts.length)
            return { pct: 0, sec: 0, target: 1 };
        const target = data.total_target_seconds || 2700;
        return {
            pct: Math.min(100, ((session.total_recorded_seconds || 0) / target) * 100),
            sec: session.total_recorded_seconds || 0,
            target,
        };
    }, [session, data.total_target_seconds, data.prompts.length]);

    if (!prompt || !session)
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#86868B]">
                Cargando estudio...
            </div>
        );

    return (
        <div className="space-y-6" data-testid="studio-page">
            {/* HEADER STRIP */}
            <div className="flex items-center justify-between border border-white/10 bg-[#141414] px-6 py-4">
                <div>
                    <Link
                        to="/"
                        className="text-[10px] uppercase tracking-[0.3em] text-[#86868B] hover:text-white"
                    >
                        ← Volver
                    </Link>
                    <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
                        {session.name}
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="font-mono text-2xl font-bold">
                            {fmt(progress.sec)}{" "}
                            <span className="text-sm text-[#86868B]">/ {fmt(progress.target)}</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            DATASET TOTAL
                        </div>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="text-right">
                        <div className="font-mono text-2xl font-bold">
                            {progress.pct.toFixed(1)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            BIOMÉTRICA
                        </div>
                    </div>
                </div>
            </div>

            {/* GLOBAL PROGRESS */}
            <div className="h-1 w-full bg-[#141414]">
                <div
                    className="h-full bg-gradient-to-r from-[#FF3B30] via-[#FFCC00] to-[#34C759]"
                    style={{ width: `${progress.pct}%` }}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* LEFT: phase list */}
                <aside
                    className="border border-white/10 bg-[#141414] p-3 lg:col-span-3"
                    data-testid="phase-sidebar"
                >
                    <h3 className="px-2 pb-3 text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                        Fases
                    </h3>
                    <ul className="max-h-[60vh] space-y-px overflow-y-auto">
                        {data.prompts.map((p, i) => {
                            const isActive = i === idx;
                            return (
                                <li
                                    key={p.id}
                                    onClick={() => setIdx(i)}
                                    className={`cursor-pointer border-l-2 px-3 py-2 transition-all ${
                                        isActive
                                            ? "border-[#FF3B30] bg-white/5"
                                            : "border-transparent hover:bg-white/5"
                                    }`}
                                    data-testid={`prompt-item-${p.id}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                                            {String(i + 1).padStart(2, "0")} · {p.phase}
                                        </span>
                                        <span className="font-mono text-[10px] text-[#86868B]">
                                            {p.duration}s
                                        </span>
                                    </div>
                                    <div
                                        className={`mt-1 text-sm ${isActive ? "text-white" : "text-[#A1A1A6]"}`}
                                    >
                                        {p.title}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                {/* CENTER: prompt + recorder */}
                <section
                    className="border border-white/10 bg-[#141414] p-6 lg:col-span-6"
                    data-testid="recorder-panel"
                >
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                        <span>FASE {idx + 1} / {data.prompts.length}</span>
                        <span className="text-[#FF3B30]">·</span>
                        <span>{prompt.phase}</span>
                    </div>
                    <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
                        {prompt.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A1A1A6]">
                        {prompt.instructions}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                        <span>OBJETIVO {prompt.duration}s</span>
                        <span>·</span>
                        <span>{takes.length} TOMAS GUARDADAS</span>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <div className="flex-1">
                            <Waveform
                                analyser={analyserRef.current}
                                active={recording}
                                color={recording ? "#FF3B30" : "#A1A1A6"}
                            />
                            <div className="mt-3 flex items-center justify-between border border-white/10 bg-[#0a0a0a] px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {recording ? (
                                        <button
                                            onClick={stopRec}
                                            className="flex items-center gap-2 bg-[#FF3B30] px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white"
                                            data-testid="stop-record-button"
                                        >
                                            <Square size={14} fill="currentColor" /> Detener
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startRec}
                                            className="flex items-center gap-2 border border-[#FF3B30] bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white"
                                            data-testid="start-record-button"
                                        >
                                            <Mic size={14} /> Grabar toma
                                        </button>
                                    )}
                                    <span className="font-mono text-2xl font-bold tabular-nums">
                                        {fmt(elapsed)}
                                    </span>
                                    {recording && (
                                        <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-[#FF3B30]">
                                            <span className="h-2 w-2 animate-rec-pulse bg-[#FF3B30]"></span>
                                            REC
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIdx((i) => Math.max(0, i - 1))}
                                        className="border border-white/15 px-3 py-2 hover:bg-white/5"
                                        data-testid="prev-prompt"
                                    >
                                        <SkipBack size={14} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setIdx((i) => Math.min(data.prompts.length - 1, i + 1))
                                        }
                                        className="border border-white/15 px-3 py-2 hover:bg-white/5"
                                        data-testid="next-prompt"
                                    >
                                        <SkipForward size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <AudioMeter analyser={analyserRef.current} active={recording} />
                    </div>
                </section>

                {/* RIGHT: takes for current prompt */}
                <aside
                    className="border border-white/10 bg-[#141414] p-4 lg:col-span-3"
                    data-testid="takes-panel"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            Tomas
                        </h3>
                        <span className="font-mono text-[10px] text-[#86868B]">
                            {takes.length}
                        </span>
                    </div>
                    {takes.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs text-[#86868B]">
                            Sin tomas para este prompt todavía.
                        </p>
                    ) : (
                        <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
                            {takes.map((t, i) => (
                                <li
                                    key={t.id}
                                    className="border border-white/10 bg-[#0a0a0a] p-3"
                                    data-testid={`take-${t.id}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                                            TAKE {String(i + 1).padStart(2, "0")} · {fmt(t.duration)}
                                        </span>
                                        {t.cleaned && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-[#34C759]">
                                                <Sparkles size={10} /> CLEAN
                                            </span>
                                        )}
                                    </div>
                                    <audio
                                        controls
                                        src={
                                            t.cleaned_url || audioUrl(t.session_id, t.filename)
                                        }
                                        className="mt-2 h-8 w-full"
                                    />
                                    <div className="mt-2 grid grid-cols-4 gap-1">
                                        <button
                                            onClick={() => onAccept(t, true)}
                                            className={`flex items-center justify-center border px-1 py-1.5 text-[10px] ${
                                                t.accepted
                                                    ? "border-[#34C759] text-[#34C759]"
                                                    : "border-white/15 text-[#86868B] hover:text-white"
                                            }`}
                                            data-testid={`accept-${t.id}`}
                                            title="Aceptar"
                                        >
                                            <CheckCircle2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => onAccept(t, false)}
                                            className={`flex items-center justify-center border px-1 py-1.5 text-[10px] ${
                                                !t.accepted
                                                    ? "border-[#FF3B30] text-[#FF3B30]"
                                                    : "border-white/15 text-[#86868B] hover:text-white"
                                            }`}
                                            data-testid={`reject-${t.id}`}
                                            title="Rechazar"
                                        >
                                            <XCircle size={12} />
                                        </button>
                                        <button
                                            onClick={() => onClean(t)}
                                            className="flex items-center justify-center border border-white/15 px-1 py-1.5 text-[10px] text-[#A1A1A6] hover:bg-white/5"
                                            data-testid={`clean-${t.id}`}
                                            title="Limpiar audio"
                                        >
                                            <Wand2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteTake(t)}
                                            className="flex items-center justify-center border border-white/15 px-1 py-1.5 text-[10px] text-[#86868B] hover:text-[#FF3B30]"
                                            data-testid={`delete-${t.id}`}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>

            {/* FOOTER QUICK LINKS */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Link
                    to={`/biometrics/${sessionId}`}
                    className="flex items-center justify-between border border-white/10 bg-[#141414] p-4 hover:border-white/30"
                    data-testid="link-biometrics"
                >
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            02
                        </div>
                        <div className="mt-1 font-display text-xl font-bold">
                            Biométrica vocal
                        </div>
                    </div>
                    <Activity size={18} />
                </Link>
                <Link
                    to={`/export/${sessionId}`}
                    className="flex items-center justify-between border border-white/10 bg-[#141414] p-4 hover:border-white/30"
                    data-testid="link-export"
                >
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            03
                        </div>
                        <div className="mt-1 font-display text-xl font-bold">
                            Exportar dataset
                        </div>
                    </div>
                    <Sparkles size={18} />
                </Link>
                <Link
                    to="/cleaner"
                    className="flex items-center justify-between border border-white/10 bg-[#141414] p-4 hover:border-white/30"
                    data-testid="link-cleaner"
                >
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            04
                        </div>
                        <div className="mt-1 font-display text-xl font-bold">
                            Limpiador de audio
                        </div>
                    </div>
                    <Wand2 size={18} />
                </Link>
            </div>
        </div>
    );
}
