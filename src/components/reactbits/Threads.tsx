import { useEffect, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import "./reactBits.css";

interface ThreadsProps {
  color?: [number, number, number];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
  className?: string;
}

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentShader = `
precision highp float;
uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;
const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
  vec2 Pi = floor(P);
  vec4 Pf = P.xyxy - vec4(Pi, Pi + 1.0);
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 gx = fract(Pt * (1.0 / 951.135664)) - 0.49999;
  vec4 gy = fract(Pt * (1.0 / 642.949883)) - 0.49999;
  vec4 gr = inversesqrt(gx * gx + gy * gy) * (gx * Pf.xzxz + gy * Pf.yyww);
  gr *= 1.4142135623730950;
  vec2 blend = Pf.xy * Pf.xy * Pf.xy * (Pf.xy * (Pf.xy * 6.0 - 15.0) + 10.0);
  vec4 blend2 = vec4(blend, vec2(1.0 - blend));
  return dot(gr, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) { return (1.0 / max(resolution.x, resolution.y)) * count; }

float lineFn(vec2 st, float width, float perc, vec2 mouse, float time, float amplitude, float distance) {
  float splitPoint = 0.1 + perc * 0.4;
  float amplitudeNormal = smoothstep(splitPoint, 0.7, st.x);
  float finalAmplitude = amplitudeNormal * 0.5 * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);
  float timeScaled = time / 10.0 + (mouse.x - 0.5);
  float blur = smoothstep(splitPoint, splitPoint + 0.05, st.x) * perc;
  float xnoise = mix(
    Perlin2D(vec2(timeScaled, st.x + perc) * 2.5),
    Perlin2D(vec2(timeScaled, st.x + timeScaled) * 3.5) / 1.5,
    st.x * 0.3
  );
  float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;
  float start = smoothstep(y + width / 2.0 + u_line_blur * pixel(1.0, iResolution.xy) * blur, y, st.y);
  float end = smoothstep(y, y - width / 2.0 - u_line_blur * pixel(1.0, iResolution.xy) * blur, st.y);
  return clamp((start - end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))), 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float strength = 1.0;
  for (int i = 0; i < u_line_count; i++) {
    float p = float(i) / float(u_line_count);
    strength *= 1.0 - lineFn(uv, u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p), p, uMouse, iTime, uAmplitude, uDistance);
  }
  float value = 1.0 - strength;
  gl_FragColor = vec4(uColor * value, value);
}
`;

export function Threads({
  color = [1, 1, 1],
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
  className = ""
}: ThreadsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrame = useRef(0);
  const propsRef = useRef({ color, amplitude, distance, enableMouseInteraction });
  propsRef.current = { color, amplitude, distance, enableMouseInteraction };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Color(gl.canvas.width, gl.canvas.height, 1) },
        uColor: { value: new Color(...propsRef.current.color) },
        uAmplitude: { value: propsRef.current.amplitude },
        uDistance: { value: propsRef.current.distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const baseDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const longest = Math.max(container.clientWidth, container.clientHeight) * baseDpr;
      renderer.dpr = longest > 1600 ? baseDpr * 1600 / longest : baseDpr;
      renderer.setSize(container.clientWidth, container.clientHeight);
      program.uniforms.iResolution.value.r = gl.canvas.width;
      program.uniforms.iResolution.value.g = gl.canvas.height;
      program.uniforms.iResolution.value.b = gl.canvas.width / gl.canvas.height;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];
    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouse = [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height];
    };
    const onMouseLeave = () => { targetMouse = [0.5, 0.5]; };
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(container);
    const update = (time: number) => {
      animationFrame.current = requestAnimationFrame(update);
      if (!visible || document.hidden) return;
      const latest = propsRef.current;
      program.uniforms.uColor.value.set(...latest.color);
      program.uniforms.uAmplitude.value = latest.amplitude;
      program.uniforms.uDistance.value = latest.distance;
      if (latest.enableMouseInteraction) {
        currentMouse[0] += .05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += .05 * (targetMouse[1] - currentMouse[1]);
      }
      program.uniforms.uMouse.value[0] = latest.enableMouseInteraction ? currentMouse[0] : .5;
      program.uniforms.uMouse.value[1] = latest.enableMouseInteraction ? currentMouse[1] : .5;
      program.uniforms.iTime.value = time * .001;
      renderer.render({ scene: mesh });
    };
    animationFrame.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      resizeObserver.disconnect();
      observer.disconnect();
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={containerRef} className={`threads-container ${className}`} aria-hidden="true" />;
}
