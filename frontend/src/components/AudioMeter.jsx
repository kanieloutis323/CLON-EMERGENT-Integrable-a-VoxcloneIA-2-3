import { useEffect, useRef } from "react";

// Vertical LED-style meter showing dB from a Web Audio AnalyserNode.
// Accepts `analyser` (AnalyserNode | null) prop and renders 18 segments.
const SEGMENTS = 20;

export default function AudioMeter({ analyser, active, label = "INPUT" }) {
    const cellsRef = useRef([]);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!analyser || !active) {
            cellsRef.current.forEach((el) => {
                if (el) el.style.background = "#1a1a1a";
            });
            return;
        }
        const buffer = new Float32Array(analyser.fftSize);
        const loop = () => {
            analyser.getFloatTimeDomainData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
            const rms = Math.sqrt(sum / buffer.length);
            // Convert to dBFS, clamp to [-60, 0]
            const db = rms > 0 ? 20 * Math.log10(rms) : -60;
            const normalized = Math.min(1, Math.max(0, (db + 60) / 60));
            const activeCount = Math.round(normalized * SEGMENTS);

            cellsRef.current.forEach((el, i) => {
                if (!el) return;
                const pos = SEGMENTS - i; // top = highest
                if (pos <= activeCount) {
                    if (pos > SEGMENTS * 0.85) el.style.background = "#FF3B30";
                    else if (pos > SEGMENTS * 0.6) el.style.background = "#FFCC00";
                    else el.style.background = "#34C759";
                } else {
                    el.style.background = "#1a1a1a";
                }
            });
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [analyser, active]);

    return (
        <div
            className="flex flex-col items-stretch border border-white/10 bg-[#141414] p-2"
            data-testid="audio-meter"
        >
            <span className="mb-2 text-center text-[9px] uppercase tracking-[0.3em] text-[#86868B]">
                {label}
            </span>
            <div className="led-strip flex flex-col-reverse gap-[2px] w-6">
                {Array.from({ length: SEGMENTS }).map((_, i) => (
                    <span key={i} ref={(el) => (cellsRef.current[i] = el)} />
                ))}
            </div>
            <span className="mt-2 text-center text-[9px] uppercase tracking-[0.2em] text-[#86868B]">
                dB
            </span>
        </div>
    );
}
