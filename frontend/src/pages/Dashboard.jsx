import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Plus, Trash2, ChevronRight, Activity, Clock } from "lucide-react";
import { listSessions, createSession, deleteSession } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "sonner";

export default function Dashboard() {
    const [sessions, setSessions] = useState([]);
    const [name, setName] = useState("");
    const [artist, setArtist] = useState("");
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const refresh = async () => {
        try {
            const data = await listSessions();
            setSessions(data);
        } catch (e) {
            toast.error("No se pudieron cargar las sesiones");
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const onCreate = async () => {
        if (!name.trim()) return toast.error("El nombre es obligatorio");
        try {
            const s = await createSession({ name, artist });
            setOpen(false);
            setName("");
            setArtist("");
            navigate(`/studio/${s.id}`);
        } catch (e) {
            toast.error("Error al crear la sesión");
        }
    };

    const onDelete = async (id) => {
        if (!window.confirm("¿Borrar sesión y todas sus tomas?")) return;
        await deleteSession(id);
        refresh();
    };

    return (
        <div className="space-y-12">
            {/* HERO */}
            <section
                className="relative overflow-hidden border border-white/10 noise"
                data-testid="hero-section"
            >
                <div
                    className="absolute inset-0 grid-overlay opacity-50"
                    aria-hidden
                ></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent"></div>
                <img
                    src="https://images.unsplash.com/photo-1660832459346-d069f58410c1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwZGFya3xlbnwwfHx8fDE3NzgxMTQzODB8MA&ixlib=rb-4.1.0&q=85"
                    alt="Studio mic"
                    className="absolute right-0 top-0 hidden h-full w-1/2 object-cover opacity-40 md:block"
                />
                <div className="relative z-10 grid grid-cols-12 gap-6 p-8 md:p-12">
                    <div className="col-span-12 md:col-span-7">
                        <div className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#A1A1A6]">
                            <span className="h-2 w-2 animate-rec-pulse bg-[#FF3B30]"></span>
                            Voice Cloning · Music & Singing
                        </div>
                        <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl lg:text-6xl">
                            CLONA TU VOZ
                            <br />
                            <span className="text-[#FF3B30]">CANTANDO.</span>
                            <br />
                            <span className="font-serif-edit italic font-normal text-[#A1A1A6]">
                                fielmente.
                            </span>
                        </h1>
                        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#A1A1A6]">
                            Captura tu biométrico vocal completo en{" "}
                            <span className="text-white">+40 minutos guiados</span>.
                            Escalas, vibrato, belt, falsete, ranchera, rock graspy, emoción
                            cruda y respiraciones reales. Limpieza automática del audio.
                            Dataset listo para entrenar localmente — sin APIs de IA de
                            terceros para el modelo.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        className="rounded-none bg-white px-8 py-6 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200"
                                        data-testid="new-session-button"
                                    >
                                        <Plus size={14} className="mr-2" />
                                        Nueva sesión
                                    </Button>
                                </DialogTrigger>
                                <DialogContent
                                    className="rounded-none border-white/15 bg-[#0a0a0a] text-white"
                                    data-testid="new-session-dialog"
                                >
                                    <DialogHeader>
                                        <DialogTitle className="font-display text-2xl tracking-tight">
                                            Nueva sesión de entrenamiento vocal
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div>
                                            <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                                Nombre de la voz
                                            </label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="ej. Mi voz · Ranchera & Rock"
                                                className="rounded-none border-white/15 bg-[#141414] font-mono"
                                                data-testid="session-name-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                                Artista (opcional)
                                            </label>
                                            <Input
                                                value={artist}
                                                onChange={(e) => setArtist(e.target.value)}
                                                placeholder="Tu nombre artístico"
                                                className="rounded-none border-white/15 bg-[#141414] font-mono"
                                                data-testid="session-artist-input"
                                            />
                                        </div>
                                        <Button
                                            onClick={onCreate}
                                            className="w-full rounded-none bg-white py-5 text-xs font-bold uppercase tracking-[0.25em] text-black"
                                            data-testid="create-session-button"
                                        >
                                            Crear y entrar al estudio
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Link
                                to="/cleaner"
                                className="border border-white/20 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-white/5"
                                data-testid="goto-cleaner"
                            >
                                Limpiar audio
                            </Link>
                        </div>

                        <div className="mt-10 grid grid-cols-3 gap-4 text-xs">
                            {[
                                { k: "+40", v: "MIN. ENTRENAMIENTO" },
                                { k: "11", v: "FASES VOCALES" },
                                { k: "100%", v: "MODELO LOCAL" },
                            ].map((s) => (
                                <div
                                    key={s.v}
                                    className="border border-white/10 bg-[#141414] p-4"
                                >
                                    <div className="font-display text-3xl font-bold">{s.k}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                        {s.v}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SESSIONS LIST */}
            <section data-testid="sessions-section">
                <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
                    <div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            01 / Sesiones
                        </span>
                        <h2 className="font-display text-3xl font-bold tracking-tight">
                            Tus voces en entrenamiento
                        </h2>
                    </div>
                    <span className="font-mono text-xs text-[#A1A1A6]">
                        {sessions.length} sesión(es)
                    </span>
                </div>

                {sessions.length === 0 ? (
                    <div
                        className="border border-dashed border-white/15 p-16 text-center"
                        data-testid="empty-state"
                    >
                        <Mic
                            size={32}
                            className="mx-auto mb-4 text-[#A1A1A6]"
                        />
                        <p className="text-sm text-[#A1A1A6]">
                            Aún no tienes sesiones. Crea una para empezar a entrenar tu
                            clon vocal.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {sessions.map((s) => {
                            const pct = Math.min(
                                100,
                                ((s.total_recorded_seconds || 0) / s.target_seconds) * 100,
                            );
                            return (
                                <div
                                    key={s.id}
                                    className="group relative border border-white/10 bg-[#141414] p-6 transition-all hover:-translate-y-1 hover:border-white/30"
                                    data-testid={`session-card-${s.id}`}
                                >
                                    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                        <span>VOZ · {s.id.slice(0, 8)}</span>
                                        <button
                                            onClick={() => onDelete(s.id)}
                                            className="text-[#86868B] hover:text-[#FF3B30]"
                                            data-testid={`delete-session-${s.id}`}
                                            aria-label="Borrar"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <h3 className="font-display text-2xl font-bold leading-tight tracking-tight">
                                        {s.name}
                                    </h3>
                                    {s.artist && (
                                        <p className="mt-1 font-serif-edit italic text-sm text-[#A1A1A6]">
                                            por {s.artist}
                                        </p>
                                    )}

                                    <div className="mt-5 flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5 text-[#A1A1A6]">
                                            <Clock size={12} />
                                            {Math.round(s.total_recorded_seconds / 60)}/
                                            {Math.round(s.target_seconds / 60)} min
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[#A1A1A6]">
                                            <Activity size={12} />
                                            {s.takes_count} tomas
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4 h-1 w-full bg-[#0a0a0a]">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#FF3B30] via-[#FFCC00] to-[#34C759]"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                                        <span>{pct.toFixed(0)}% entrenado</span>
                                        {pct >= 100 ? (
                                            <span className="text-[#34C759]">LISTO</span>
                                        ) : (
                                            <span>EN PROGRESO</span>
                                        )}
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-1">
                                        <Link
                                            to={`/studio/${s.id}`}
                                            className="flex items-center justify-center gap-1 border border-white/15 px-2 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-white/5"
                                            data-testid={`session-studio-${s.id}`}
                                        >
                                            Estudio
                                        </Link>
                                        <Link
                                            to={`/biometrics/${s.id}`}
                                            className="flex items-center justify-center gap-1 border border-white/15 px-2 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-white/5"
                                            data-testid={`session-bio-${s.id}`}
                                        >
                                            Biométrica
                                        </Link>
                                        <Link
                                            to={`/export/${s.id}`}
                                            className="flex items-center justify-center gap-1 border border-white/15 px-2 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-white/5"
                                            data-testid={`session-export-${s.id}`}
                                        >
                                            Export <ChevronRight size={10} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
