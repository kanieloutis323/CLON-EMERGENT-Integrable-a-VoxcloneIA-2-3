import { useEffect, useRef } from "react";

/**
 * Canvas-based live waveform. Feed it an AnalyserNode.
 * Active recording is rendered in red, idle in muted grey, processed in blue.
 */
export default function Waveform({ analyser, active, color }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const resize = () => {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
        };
        resize();

        const stroke = color || (active ? "#FF3B30" : "#A1A1A6");
        const draw = () => {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(0, 0, w, h);
            // Grid
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 24) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            if (!analyser) {
                rafRef.current = requestAnimationFrame(draw);
                return;
            }
            const buf = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(buf);

            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < buf.length; i++) {
                const x = (i / buf.length) * w;
                const y = (1 - (buf[i] + 1) / 2) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            rafRef.current = requestAnimationFrame(draw);
        };
        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [analyser, active, color]);

    return (
        <canvas
            ref={canvasRef}
            data-testid="waveform-canvas"
            className="h-28 w-full border border-white/10 bg-[#0a0a0a]"
        />
    );
}
