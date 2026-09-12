import { useRef, type CSSProperties, type HTMLAttributes, type PointerEvent } from "react";
import "./reactBits.css";

interface BorderGlowProps extends HTMLAttributes<HTMLDivElement> {
  glowColor?: string;
  edgeSensitivity?: number;
  borderRadius?: number;
}

type GlowStyle = CSSProperties & {
  "--glow-color": string;
  "--glow-radius": string;
  "--glow-x": string;
  "--glow-y": string;
  "--glow-opacity": number;
};

export function BorderGlow({
  children,
  className = "",
  glowColor = "105 232 211",
  edgeSensitivity = 54,
  borderRadius = 18,
  style,
  ...rest
}: BorderGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const updateGlow = (event: PointerEvent<HTMLDivElement>) => {
    const host = ref.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = Math.min(x, y, rect.width - x, rect.height - y);
    const intensity = Math.max(.16, 1 - edge / edgeSensitivity);
    host.style.setProperty("--glow-x", `${x}px`);
    host.style.setProperty("--glow-y", `${y}px`);
    host.style.setProperty("--glow-opacity", String(intensity));
  };

  const initialStyle: GlowStyle = {
    ...style,
    "--glow-color": glowColor,
    "--glow-radius": `${borderRadius}px`,
    "--glow-x": "50%",
    "--glow-y": "50%",
    "--glow-opacity": 0
  };

  return (
    <div
      ref={ref}
      className={`border-glow ${className}`}
      style={initialStyle}
      onPointerMove={updateGlow}
      onPointerLeave={() => ref.current?.style.setProperty("--glow-opacity", "0")}
      {...rest}
    >
      <div className="border-glow-content">{children}</div>
    </div>
  );
}
