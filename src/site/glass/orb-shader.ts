import { animate, cancelFrame, frame, motionValue } from "motion";
import { spring } from "../motion.ts";

// The orb (SYSTEM.md §6.3, BUILD.md §6): a superellipse lens that refracts a soft studio environment, sampled
// three times with slightly different strengths so its rim splits into a thin spectrum. The coin is an SVG on top.
const VERT = `#version 300 es
in vec2 a; out vec2 v;
void main() { v = a; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform float t, dark;
uniform vec2 ptr;
const float N = 5.0;            // superellipse exponent
vec3 env(vec2 q) {               // studio light: soft top box, darker floor, a bright horizon band
  float g = smoothstep(-0.9, 0.7, q.y);
  vec3 lo = mix(vec3(0.62), vec3(0.08), dark);
  vec3 hi = mix(vec3(0.99), vec3(0.42), dark);
  vec3 c = mix(lo, hi, g);
  c += mix(0.55, 0.28, dark) * exp(-pow((q.y - 0.42) * 5.0, 2.0)) * (0.7 + 0.3 * cos(q.x * 2.4));
  c -= mix(0.18, 0.08, dark) * exp(-pow((q.y + 0.75) * 3.2, 2.0));
  return c;
}
void main() {
  vec2 p = v * 1.06;
  float wob = 0.02 * sin(t / 12.0 + atan(p.y, p.x) * 3.0);   // idle: period >= 12 s, amplitude 2 %
  vec2 a = abs(p);
  float rho = pow(pow(a.x, N) + pow(a.y, N), 1.0 / N) / (0.94 + wob);
  float edge = fwidth(rho);
  float mask = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, rho);
  if (mask <= 0.0) { o = vec4(0.0); return; }
  vec2 gdir = normalize(sign(p) * pow(a + 1e-4, vec2(N - 1.0)));
  float r = clamp(rho, 0.0, 0.985);
  float k = 6.0;
  float dz = k * pow(r, k - 1.0) / (2.0 * sqrt(1.0 - pow(r, k)));
  vec3 n = normalize(vec3(gdir * dz, 1.0));
  vec2 q = p + ptr * 0.12;
  vec3 col = vec3(env(q + n.xy * 0.60).r, env(q + n.xy * 0.66).g, env(q + n.xy * 0.72).b);
  float fres = pow(1.0 - n.z, 3.0);
  col += fres * mix(0.35, 0.20, dark);
  vec2 sp = vec2(-0.35, 0.45) + ptr * 0.35;
  col += mix(0.45, 0.25, dark) * exp(-dot(p - sp, p - sp) * 9.0) * (0.4 + 0.6 * n.z);
  o = vec4(col * mask, mask * mix(0.92, 0.85, dark));
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

export function startOrbShader(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: true });
  if (!gl) return () => {};
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
  } catch {
    return () => {}; // the CSS glass stays
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, "t");
  const uDark = gl.getUniformLocation(prog, "dark");
  const uPtr = gl.getUniformLocation(prog, "ptr");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // Pointer → highlight and tilt (portfolio TiltCard: stiffness 300, damping 30, ±6°)
  const px = motionValue(0);
  const py = motionValue(0);
  const host = canvas.parentElement as HTMLElement;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width * 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height * 2);
    const near = Math.abs(nx) < 1 && Math.abs(ny) < 1;
    animate(px, near ? Math.max(-0.5, Math.min(0.5, nx)) : 0, spring.tilt);
    animate(py, near ? Math.max(-0.5, Math.min(0.5, ny)) : 0, spring.tilt);
  };
  if (fine) window.addEventListener("pointermove", onMove, { passive: true });

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);
  let dark = 0;
  let size = 0;
  const t0 = performance.now();

  const tick = () => {
    if (!visible) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.round(canvas.clientWidth * dpr);
    if (s !== size && s > 0) {
      size = s;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    const target = document.documentElement.dataset.nav === "ink" ? 1 : 0;
    dark += (target - dark) * 0.12;
    gl.uniform1f(uT, (performance.now() - t0) / 1000);
    gl.uniform1f(uDark, dark);
    gl.uniform2f(uPtr, px.get(), -py.get());
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    host.style.transform = `perspective(600px) rotateX(${(-py.get() * 12).toFixed(2)}deg) rotateY(${(px.get() * 12).toFixed(2)}deg)`;
  };
  frame.render(tick, true);
  canvas.dataset.ready = "";

  return () => {
    cancelFrame(tick);
    io.disconnect();
    window.removeEventListener("pointermove", onMove);
    host.style.transform = "";
    delete canvas.dataset.ready;
    if (buf) gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
  };
}
