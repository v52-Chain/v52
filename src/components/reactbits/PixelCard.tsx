import { useEffect, useRef, type ReactNode } from "react";
import "./reactBits.css";

type PixelVariant = "cyan" | "violet" | "amber";

interface PixelCardProps {
  children: ReactNode;
  variant?: PixelVariant;
  className?: string;
}

const COLORS: Record<PixelVariant, string[]> = {
  cyan: ["#7af0dc", "#3bcab5", "#4aa9c5"],
  violet: ["#c1b3ff", "#806ee9", "#4f418f"],
  amber: ["#ffd3a8", "#f29b72", "#a55349"]
};

interface PixelPoint { x: number; y: number; size: number; phase: number; color: string }

export function PixelCard({ children, variant = "cyan", className = "" }: PixelCardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(false);
  const animationRef = useRef(0);
  const pointsRef = useRef<PixelPoint[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visibility = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const palette = COLORS[variant];
      const points: PixelPoint[] = [];
      for (let x = 5; x < rect.width; x += 9) {
        for (let y = 5; y < rect.height; y += 9) {
          if (Math.random() > .57) continue;
          points.push({ x, y, size: .7 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2, color: palette[Math.floor(Math.random() * palette.length)] });
        }
      }
      pointsRef.current = points;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const draw = (time: number) => {
      animationRef.current = requestAnimationFrame(draw);
      const target = activeRef.current ? 1 : 0;
      visibility += (target - visibility) * (reduced ? 1 : .085);
      const rect = host.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      if (visibility < .01) return;
      for (const point of pointsRef.current) {
        const shimmer = .55 + Math.sin(time * .0024 + point.phase) * .45;
        context.globalAlpha = visibility * (.2 + shimmer * .55);
        context.fillStyle = point.color;
        const size = point.size * Math.min(1, visibility * 1.8);
        context.fillRect(point.x, point.y, size, size);
      }
      context.globalAlpha = 1;
    };
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
      observer.disconnect();
    };
  }, [variant]);

  return (
    <div
      ref={hostRef}
      className={`pixel-card v52-pixel-card pixel-${variant} ${className}`}
      tabIndex={0}
      onMouseEnter={() => { activeRef.current = true; }}
      onMouseLeave={() => { activeRef.current = false; }}
      onFocus={() => { activeRef.current = true; }}
      onBlur={() => { activeRef.current = false; }}
    >
      <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
      <div className="pixel-card-content">{children}</div>
    </div>
  );
}
