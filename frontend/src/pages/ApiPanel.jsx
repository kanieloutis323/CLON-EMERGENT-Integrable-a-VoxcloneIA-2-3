import { useEffect, useState } from "react";
import { Key, Trash2, Copy, Plus } from "lucide-react";
import { listApiKeys, createApiKey, revokeApiKey, listSessions } from "../lib/api";
import { toast } from "sonner";

export default function ApiPanel() {
    const [keys, setKeys] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [label, setLabel] = useState("");
    const [sessionId, setSessionId] = useState("");

    const refresh = async () => {
        const [k, s] = await Promise.all([listApiKeys(), listSessions()]);
        setKeys(k);
        setSessions(s);
    };

    useEffect(() => {
        refresh();
    }, []);

    const onCreate = async () => {
        if (!label.trim()) return toast.error("Etiqueta requerida");
        await createApiKey({ label, session_id: sessionId || null });
        setLabel("");
        setSessionId("");
        refresh();
    };

    const onRevoke = async (id) => {
        if (!window.confirm("¿Revocar API key?")) return;
        await revokeApiKey(id);
        refresh();
    };

    const copy = (txt) => {
        navigator.clipboard.writeText(txt);
        toast.success("Copiado");
    };

    return (
        <div className="space-y-8" data-testid="api-panel-page">
            <div className="border-b border-white/10 pb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                    Integraciones
                </span>
                <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
                    Panel de API
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-[#A1A1A6]">
                    Administra todas las claves para integrar el clon vocal a apps
                    Android, iOS y Windows. Cada clave queda asociada (opcional) a
                    una sesión específica.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="border border-white/10 bg-[#141414] p-6">
                    <h2 className="mb-4 font-display text-2xl font-bold">
                        Crear nueva clave
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                Etiqueta
                            </label>
                            <input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="ej. Windows desktop · v1"
                                className="w-full border border-white/15 bg-[#0a0a0a] px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white"
                                data-testid="new-key-label"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                Asociar a sesión (opcional)
                            </label>
                            <select
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                                className="w-full border border-white/15 bg-[#0a0a0a] px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white"
                                data-testid="new-key-session"
                            >
                                <option value="">— Sin sesión —</option>
                                {sessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={onCreate}
                            className="flex w-full items-center justify-center gap-2 bg-white py-3 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200"
                            data-testid="create-key-button"
                        >
                            <Plus size={14} /> Generar API key
                        </button>
                    </div>
                </section>

                <section className="border border-white/10 bg-[#141414] p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-display text-2xl font-bold">
                            Claves activas
                        </h2>
                        <span className="font-mono text-xs text-[#86868B]">
                            {keys.length}
                        </span>
                    </div>
                    <ul className="space-y-2">
                        {keys.length === 0 && (
                            <li className="border border-dashed border-white/15 p-6 text-center text-xs text-[#86868B]">
                                Sin claves todavía.
                            </li>
                        )}
                        {keys.map((k) => (
                            <li
                                key={k.id}
                                className="border border-white/10 bg-[#0a0a0a] p-3"
                                data-testid={`api-key-row-${k.id}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                                            <Key size={10} /> {k.label}
                                            {k.session_id && (
                                                <span className="text-[#34C759]">
                                                    · sesión {k.session_id.slice(0, 8)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 truncate font-mono text-xs text-white">
                                            {k.key}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => copy(k.key)}
                                        className="border border-white/15 p-2 text-[#A1A1A6] hover:text-white"
                                        data-testid={`copy-${k.id}`}
                                    >
                                        <Copy size={12} />
                                    </button>
                                    <button
                                        onClick={() => onRevoke(k.id)}
                                        className="border border-white/15 p-2 text-[#86868B] hover:text-[#FF3B30]"
                                        data-testid={`revoke-${k.id}`}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
