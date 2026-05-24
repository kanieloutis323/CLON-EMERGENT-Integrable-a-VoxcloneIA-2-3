import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Upload, Key, Trash2, Copy } from "lucide-react";
import {
    getSession,
    downloadPackageUrl,
    uploadModel,
    listApiKeys,
    createApiKey,
    revokeApiKey,
} from "../lib/api";
import { toast } from "sonner";

export default function ExportPage() {
    const { sessionId } = useParams();
    const [session, setSession] = useState(null);
    const [keys, setKeys] = useState([]);
    const [label, setLabel] = useState("");
    const [model, setModel] = useState(null);
    const [busy, setBusy] = useState(false);

    const refresh = async () => {
        const [s, k] = await Promise.all([
            getSession(sessionId),
            listApiKeys(sessionId),
        ]);
        setSession(s);
        setKeys(k);
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const onUploadModel = async () => {
        if (!model) return toast.error("Selecciona un archivo .pth");
        setBusy(true);
        try {
            await uploadModel(sessionId, model);
            toast.success("Modelo subido");
            await refresh();
        } catch (e) {
            toast.error("Error subiendo modelo");
        } finally {
            setBusy(false);
        }
    };

    const onCreateKey = async () => {
        if (!label.trim()) return toast.error("Etiqueta requerida");
        await createApiKey({ label, session_id: sessionId });
        setLabel("");
        await refresh();
    };

    const onRevoke = async (id) => {
        if (!window.confirm("¿Revocar API key?")) return;
        await revokeApiKey(id);
        await refresh();
    };

    const copy = (txt) => {
        navigator.clipboard.writeText(txt);
        toast.success("Copiado al portapapeles");
    };

    if (!session)
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#86868B]">
                Cargando...
            </div>
        );

    const backendBase = process.env.REACT_APP_BACKEND_URL;

    return (
        <div className="space-y-10" data-testid="export-page">
            <div className="flex items-end justify-between border-b border-white/10 pb-6">
                <div>
                    <Link
                        to={`/biometrics/${sessionId}`}
                        className="text-[10px] uppercase tracking-[0.3em] text-[#86868B] hover:text-white"
                    >
                        ← Biométrica
                    </Link>
                    <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">
                        Exportar y desplegar
                    </h1>
                    <p className="mt-2 font-serif-edit italic text-sm text-[#A1A1A6]">
                        {session.name}
                    </p>
                </div>
                <div className="text-right font-mono text-xs text-[#86868B]">
                    Sesión: {session.id.slice(0, 12)}...
                </div>
            </div>

            {/* STEP 1 — DOWNLOAD PACKAGE */}
            <section
                className="border border-white/10 bg-[#141414] p-6"
                data-testid="export-package"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            01 / Dataset de entrenamiento
                        </span>
                        <h2 className="mt-1 font-display text-2xl font-bold">
                            Descargar paquete (RVC / So-VITS)
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-[#A1A1A6]">
                            ZIP con tomas aceptadas, manifest, prompts y guía de
                            entrenamiento. Entrena localmente en tu GPU sin enviar
                            datos a APIs de terceros.
                        </p>
                    </div>
                    <a
                        href={downloadPackageUrl(sessionId)}
                        className="flex items-center gap-2 bg-white px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200"
                        data-testid="download-package"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Download size={14} /> Descargar ZIP
                    </a>
                </div>
            </section>

            {/* STEP 2 — UPLOAD TRAINED MODEL */}
            <section
                className="border border-white/10 bg-[#141414] p-6"
                data-testid="upload-model"
            >
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                    02 / Modelo entrenado
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold">
                    Subir modelo (.pth, .index)
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[#A1A1A6]">
                    Cuando tu GPU termine el entrenamiento, sube los archivos del
                    modelo aquí para habilitar inferencia desde la API REST.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 border border-dashed border-white/20 px-4 py-3 text-xs uppercase tracking-[0.2em] hover:border-white/40">
                        <Upload size={14} />
                        {model ? model.name : "Seleccionar archivo"}
                        <input
                            type="file"
                            className="hidden"
                            onChange={(e) => setModel(e.target.files?.[0] || null)}
                            data-testid="model-input"
                        />
                    </label>
                    <button
                        disabled={!model || busy}
                        onClick={onUploadModel}
                        className="bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200 disabled:opacity-50"
                        data-testid="upload-model-button"
                    >
                        {busy ? "Subiendo..." : "Subir modelo"}
                    </button>
                    {session.model_filename && (
                        <span className="font-mono text-[11px] text-[#34C759]">
                            ✓ Modelo cargado: {session.model_filename}
                        </span>
                    )}
                </div>
            </section>

            {/* STEP 3 — API KEYS */}
            <section
                className="border border-white/10 bg-[#141414] p-6"
                data-testid="api-keys-section"
            >
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                            03 / Integración móvil & escritorio
                        </span>
                        <h2 className="mt-1 font-display text-2xl font-bold">
                            API keys
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-[#A1A1A6]">
                            Genera claves para consumir el clon vocal desde tu app
                            Android, iOS o Windows.
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex gap-2">
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Etiqueta (ej. App Windows v1)"
                        className="flex-1 border border-white/15 bg-[#0a0a0a] px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white"
                        data-testid="api-key-label"
                    />
                    <button
                        onClick={onCreateKey}
                        className="bg-white px-6 py-2 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200"
                        data-testid="create-api-key"
                    >
                        <Key size={14} className="mr-1 inline" /> Generar
                    </button>
                </div>

                <ul className="mt-5 space-y-2">
                    {keys.length === 0 && (
                        <li className="border border-dashed border-white/15 p-6 text-center text-xs text-[#86868B]">
                            Aún no hay claves generadas.
                        </li>
                    )}
                    {keys.map((k) => (
                        <li
                            key={k.id}
                            className="flex items-center justify-between gap-3 border border-white/10 bg-[#0a0a0a] p-3"
                            data-testid={`api-key-${k.id}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                                    {k.label}
                                </div>
                                <div className="mt-1 truncate font-mono text-xs text-white">
                                    {k.key}
                                </div>
                            </div>
                            <button
                                onClick={() => copy(k.key)}
                                className="border border-white/15 p-2 text-[#A1A1A6] hover:text-white"
                                title="Copiar"
                                data-testid={`copy-key-${k.id}`}
                            >
                                <Copy size={12} />
                            </button>
                            <button
                                onClick={() => onRevoke(k.id)}
                                className="border border-white/15 p-2 text-[#86868B] hover:text-[#FF3B30]"
                                title="Revocar"
                                data-testid={`revoke-key-${k.id}`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </li>
                    ))}
                </ul>

                {/* DOCS */}
                <div
                    className="mt-8 border border-white/10 bg-[#0a0a0a] p-5 text-xs leading-relaxed"
                    data-testid="api-docs"
                >
                    <h3 className="mb-3 font-display text-lg font-bold tracking-tight">
                        Endpoints públicos
                    </h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[#A1A1A6]">
{`# 1. Verificar clave
curl -H "X-API-Key: <TU_KEY>" \\
  ${backendBase}/api/v1/status

# 2. Inferencia (texto → canto con tu voz clonada)
curl -X POST \\
  -H "X-API-Key: <TU_KEY>" \\
  -F "text=Hoy por ti, mañana por mí" \\
  -F "style=ranchera" \\
  ${backendBase}/api/v1/infer
`}
                    </pre>
                </div>
            </section>
        </div>
    );
}
