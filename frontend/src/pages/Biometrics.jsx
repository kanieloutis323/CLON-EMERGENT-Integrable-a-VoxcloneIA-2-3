import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBiometrics, getSession } from "../lib/api";
import { Activity, Clock, Music, Mic, Volume2 } from "lucide-react";

const fmt = (s) =>
    `${Math.floor(s / 60)
        .toString()
        .padStart(2, "0")}:${Math.floor(s % 60)
        .toString()
        .padStart(2, "0")}`;

export default function Biometrics() {
    const { sessionId } = useParams();
    const [bio, setBio] = useState(null);
    const [session, setSession] = useState(null);

    useEffect(() => {
        (async () => {
            const [b, s] = await Promise.all([
                getBiometrics(sessionId),
                getSession(sessionId),
            ]);
            setBio(b);
            setSession(s);
        })();
    }, [sessionId]);

    if (!bio || !session)
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#86868B]">
                Calculando biométrica...
            </div>
        );

    const stats = [
        {
            icon: Clock,
            label: "Duración total",
            value: fmt(bio.total_recorded_seconds),
            sub: `objetivo ${fmt(bio.target_seconds)}`,
        },
        {
            icon: Activity,
            label: "Tomas aceptadas",
            value: bio.takes_accepted,
            sub: "samples",
        },
        {
            icon: Music,
            label: "Nota más grave",
            value: bio.note_lowest || "—",
            sub: bio.f0_min_hz ? `${bio.f0_min_hz} Hz` : "sin datos",
        },
        {
            icon: Music,
            label: "Nota más aguda",
            value: bio.note_highest || "—",
            sub: bio.f0_max_hz ? `${bio.f0_max_hz} Hz` : "sin datos",
        },
        {
            icon: Mic,
            label: "Frecuencia media",
            value: bio.f0_mean_hz ? `${bio.f0_mean_hz} Hz` : "—",
            sub: "F0 promedio",
        },
        {
            icon: Volume2,
            label: "Rango tonal",
            value: bio.range_semitones ? `${bio.range_semitones}` : "—",
            sub: "semitonos",
        },
    ];

    return (
        <div className="space-y-8" data-testid="biometrics-page">
            <div className="flex items-end justify-between border-b border-white/10 pb-6">
                <div>
                    <Link
                        to={`/studio/${sessionId}`}
                        className="text-[10px] uppercase tracking-[0.3em] text-[#86868B] hover:text-white"
                    >
                        ← Volver al estudio
                    </Link>
                    <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">
                        Biométrica vocal
                    </h1>
                    <p className="mt-2 font-serif-edit italic text-sm text-[#A1A1A6]">
                        {session.name}
                    </p>
                </div>
                <div className="text-right">
                    <div className="font-mono text-3xl font-bold">
                        {bio.progress_pct.toFixed(1)}%
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                        ENTRENADO
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-[#141414]">
                <div
                    className="h-full bg-gradient-to-r from-[#FF3B30] via-[#FFCC00] to-[#34C759]"
                    style={{ width: `${bio.progress_pct}%` }}
                />
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="bg-[#141414] p-6"
                        data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                {s.label}
                            </span>
                            <s.icon size={14} className="text-[#86868B]" />
                        </div>
                        <div className="mt-3 font-display text-4xl font-bold tabular-nums">
                            {s.value}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#A1A1A6]">
                            {s.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* Phase coverage */}
            <section data-testid="phase-coverage">
                <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">
                    Cobertura por fase
                </h2>
                <div className="space-y-2">
                    {bio.phases.map((p) => {
                        const sec = bio.duration_by_phase[p.name] || 0;
                        const target = p.target_min * 60;
                        const pct = Math.min(100, (sec / target) * 100);
                        return (
                            <div
                                key={p.name}
                                className="border border-white/10 bg-[#141414] p-4"
                                data-testid={`phase-${p.name}`}
                            >
                                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
                                    <span className="text-white">{p.name}</span>
                                    <span className="text-[#86868B]">
                                        {fmt(sec)} / {fmt(target)} · {pct.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="mt-2 h-1 bg-[#0a0a0a]">
                                    <div
                                        className={`h-full ${pct >= 100 ? "bg-[#34C759]" : pct >= 50 ? "bg-[#FFCC00]" : "bg-[#FF3B30]"}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="flex gap-3">
                <Link
                    to={`/studio/${sessionId}`}
                    className="border border-white/20 px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] hover:bg-white/5"
                >
                    ← Estudio
                </Link>
                <Link
                    to={`/export/${sessionId}`}
                    className="bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200"
                    data-testid="goto-export"
                >
                    Exportar paquete →
                </Link>
            </div>
        </div>
    );
}
