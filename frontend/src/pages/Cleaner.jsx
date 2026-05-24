import { useState } from "react";
import { Upload, Sparkles, Download, AlertCircle } from "lucide-react";
import { cleanUpload } from "../lib/api";
import { toast } from "sonner";

export default function Cleaner() {
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Selecciona un archivo de audio");
        setBusy(true);
        setResult(null);
        try {
            const r = await cleanUpload(file);
            setResult(r);
            if (r.cleaned_url) toast.success("Audio limpio listo");
            else toast.error("No se pudo limpiar el audio");
        } catch (err) {
            toast.error(
                err?.response?.data?.detail ||
                    "Error en el limpiador. ¿FAL_KEY configurada?",
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-8" data-testid="cleaner-page">
            <div className="border-b border-white/10 pb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                    Herramienta · Limpieza independiente
                </span>
                <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
                    Limpiador de audio
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-[#A1A1A6]">
                    Mejora grabaciones hechas con micrófonos pobres usando{" "}
                    <span className="text-white">DeepFilterNet3</span> vía fal.ai.
                    Reduce ruido de fondo y eleva la calidad a 48kHz manteniendo el
                    timbre vocal.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <form
                    onSubmit={onSubmit}
                    className="border border-white/10 bg-[#141414] p-6"
                    data-testid="cleaner-form"
                >
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                        01 / Sube tu archivo
                    </h3>

                    <label
                        className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-white/20 bg-[#0a0a0a] p-12 hover:border-white/40"
                        data-testid="dropzone"
                    >
                        <Upload size={28} className="text-[#A1A1A6]" />
                        <span className="text-sm text-[#A1A1A6]">
                            {file ? file.name : "Selecciona WAV, MP3, M4A, OGG..."}
                        </span>
                        <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            data-testid="file-input"
                        />
                    </label>

                    <button
                        disabled={!file || busy}
                        type="submit"
                        className="mt-6 flex w-full items-center justify-center gap-2 bg-white px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-neutral-200 disabled:opacity-50"
                        data-testid="clean-submit"
                    >
                        <Sparkles size={14} />
                        {busy ? "Procesando..." : "Limpiar audio"}
                    </button>

                    <div className="mt-4 flex items-start gap-2 text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                        <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                        <span>
                            Único punto donde el audio sale de tu entorno: solo durante
                            la limpieza vía fal.ai. El modelo de clonación corre 100%
                            local.
                        </span>
                    </div>
                </form>

                <div
                    className="border border-white/10 bg-[#141414] p-6"
                    data-testid="cleaner-result"
                >
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                        02 / Resultado
                    </h3>
                    {!result ? (
                        <div className="mt-4 flex h-64 items-center justify-center border border-dashed border-white/15">
                            <span className="text-xs text-[#86868B]">
                                Esperando audio procesado...
                            </span>
                        </div>
                    ) : result.cleaned_url ? (
                        <div className="mt-4 space-y-4">
                            <audio
                                controls
                                src={result.cleaned_url}
                                className="w-full"
                                data-testid="cleaned-audio"
                            />
                            <a
                                href={result.cleaned_url}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 border border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] hover:bg-white/5"
                                data-testid="download-cleaned"
                            >
                                <Download size={14} /> Descargar limpio
                            </a>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-[#FF3B30]">No se obtuvo URL.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
