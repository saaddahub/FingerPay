// Ink in water: a GPU stable-fluids simulation (Stam 1999, after Pavel Dobryakov's WebGL port).
// The pointer stirs the water and drops blue ink; vorticity confinement keeps the eddies curling, a Jacobi
// pressure solve keeps the water incompressible, and the dye is stored as absorbance so the page can
// composite it with `mix-blend-mode: multiply` (white paper turns blue, black type stays black).

const SIM_RES = 128; // velocity / pressure grid (short side)
const DYE_RES = 512; // ink texture (short side)
const PRESSURE_ITERATIONS = 20;
const PRESSURE_DECAY = 0.8;
const CURL = 24; // vorticity confinement: how hard eddies spin up
const VELOCITY_DISSIPATION = 0.18; // water keeps moving a while after the cursor stops
const DYE_DISSIPATION = 0.38; // ink half-life ~1.8 s
const SPLAT_RADIUS = 0.0022;
const SPLAT_FORCE = 5200;
const IDLE_MS = 15000; // stop stepping once the ink has fully faded

// Absorbance (per RGB channel) of three blue inks; exp(-a) is the colour they leave on white paper.
const INKS: [number, number, number][] = [
  [1.0, 0.62, 0.12], // cobalt
  [0.95, 0.36, 0.1], // cerulean
  [0.74, 0.84, 0.1], // ultramarine
];

const VERT = `#version 300 es
precision highp float;
in vec2 a;
uniform vec2 texel;
out vec2 vUv, vL, vR, vT, vB;
void main() {
  vUv = a * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(a, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB;
out vec4 o;
`;

const SPLAT = HEAD + `
uniform sampler2D uTarget; uniform float aspect, radius; uniform vec3 color; uniform vec2 point;
void main() {
  vec2 p = vUv - point; p.x *= aspect;
  o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / radius) * color, 1.0);
}`;

const ADVECT = HEAD + `
uniform sampler2D uVelocity, uSource; uniform vec2 texel; uniform float dt, dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texel;
  o = texture(uSource, coord) / (1.0 + dissipation * dt);
}`;

const CURL_FS = HEAD + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = HEAD + `
uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f = f / (length(f) + 1e-4) * curl * C; f.y *= -1.0;
  o = vec4(clamp(texture(uVelocity, vUv).xy + f * dt, -1000.0, 1000.0), 0.0, 1.0);
}`;

const DIVERGENCE = HEAD + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;   // walls reflect
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const SCALE = HEAD + `
uniform sampler2D uTexture; uniform float value;
void main() { o = value * texture(uTexture, vUv); }`;

const PRESSURE = HEAD + `
uniform sampler2D uPressure, uDivergence;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = HEAD + `
uniform sampler2D uPressure, uVelocity;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`;

// Beer–Lambert: transmitted light = exp(-absorbance). A soft shoulder keeps dense ink from going muddy, and the
// density gradient darkens the rims slightly, the way ink tendrils read in a glass of water.
const DISPLAY = HEAD + `
uniform sampler2D uDye;
void main() {
  vec3 a = texture(uDye, vUv).rgb;
  float edge = length(vec2(
    dot(texture(uDye, vR).rgb - texture(uDye, vL).rgb, vec3(0.33)),
    dot(texture(uDye, vT).rgb - texture(uDye, vB).rgb, vec3(0.33))));
  a = 2.2 * a / (2.2 + a) + edge * 0.6 * normalize(vec3(1.0, 0.6, 0.12));
  o = vec4(exp(-max(a, 0.0)), 1.0);
}`;

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type FBO = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number; attach: (unit: number) => number };
type Double = { read: FBO; write: FBO; swap: () => void };

export function startInk(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) return () => {};
  if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return () => {};

  const shader = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "ink shader");
    return sh;
  };
  let vs: WebGLShader;
  const programs: Prog[] = [];
  const make = (fs: string): Prog => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "a");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "ink link");
    const u: Prog["u"] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i)!.name;
      u[name] = gl.getUniformLocation(p, name);
    }
    const prog = { p, u };
    programs.push(prog);
    return prog;
  };

  let splatP: Prog, advectP: Prog, curlP: Prog, vortP: Prog, divP: Prog, scaleP: Prog, presP: Prog, gradP: Prog, dispP: Prog;
  try {
    vs = shader(gl.VERTEX_SHADER, VERT);
    splatP = make(SPLAT);
    advectP = make(ADVECT);
    curlP = make(CURL_FS);
    vortP = make(VORTICITY);
    divP = make(DIVERGENCE);
    scaleP = make(SCALE);
    presP = make(PRESSURE);
    gradP = make(GRADIENT);
    dispP = make(DISPLAY);
  } catch {
    return () => {};
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);

  const fbo = (w: number, h: number, filter: number): FBO => {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex, fb, w, h,
      attach(unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        return unit;
      },
    };
  };
  const double = (w: number, h: number, filter: number): Double => {
    const d = { read: fbo(w, h, filter), write: fbo(w, h, filter), swap() { [d.read, d.write] = [d.write, d.read]; } };
    return d;
  };
  const free = (f: FBO) => { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); };
  const res = (r: number) => {
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const long = Math.round(r * Math.max(aspect, 1 / aspect));
    return aspect >= 1 ? { w: long, h: r } : { w: r, h: long };
  };

  let velocity!: Double, dye!: Double, pressure!: Double, divergence!: FBO, curl!: FBO;
  let built = false;
  const build = () => {
    if (built) [velocity.read, velocity.write, dye.read, dye.write, pressure.read, pressure.write, divergence, curl].forEach(free);
    const s = res(SIM_RES), d = res(DYE_RES);
    velocity = double(s.w, s.h, gl.LINEAR);
    dye = double(d.w, d.h, gl.LINEAR);
    pressure = double(s.w, s.h, gl.NEAREST);
    divergence = fbo(s.w, s.h, gl.NEAREST);
    curl = fbo(s.w, s.h, gl.NEAREST);
    built = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === canvas.width && h === canvas.height && built) return;
    canvas.width = w;
    canvas.height = h;
    build();
  };
  resize();
  if (!built) return () => {};

  const bind = (prog: Prog, texel: [number, number]) => {
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.texel, texel[0], texel[1]);
  };
  const tx = (f: FBO): [number, number] => [1 / f.w, 1 / f.h];
  const blit = (target: FBO | null) => {
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const step = (dt: number) => {
    const t = tx(velocity.read);
    bind(curlP, t);
    gl.uniform1i(curlP.u.uVelocity, velocity.read.attach(0));
    blit(curl);

    bind(vortP, t);
    gl.uniform1i(vortP.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vortP.u.uCurl, curl.attach(1));
    gl.uniform1f(vortP.u.curl, CURL);
    gl.uniform1f(vortP.u.dt, dt);
    blit(velocity.write);
    velocity.swap();

    bind(divP, t);
    gl.uniform1i(divP.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    bind(scaleP, t);
    gl.uniform1i(scaleP.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(scaleP.u.value, PRESSURE_DECAY);
    blit(pressure.write);
    pressure.swap();

    bind(presP, t);
    gl.uniform1i(presP.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(presP.u.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    bind(gradP, t);
    gl.uniform1i(gradP.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradP.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    bind(advectP, t);
    gl.uniform1f(advectP.u.dt, dt);
    gl.uniform1i(advectP.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectP.u.uSource, velocity.read.attach(0));
    gl.uniform1f(advectP.u.dissipation, VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(advectP.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectP.u.uSource, dye.read.attach(1));
    gl.uniform1f(advectP.u.dissipation, DYE_DISSIPATION);
    blit(dye.write);
    dye.swap();
  };

  const aspect = () => canvas.width / canvas.height;
  const splat = (x: number, y: number, dx: number, dy: number, color: [number, number, number]) => {
    const a = aspect();
    bind(splatP, tx(velocity.read));
    gl.uniform1f(splatP.u.aspect, a);
    gl.uniform2f(splatP.u.point, x, y);
    gl.uniform1f(splatP.u.radius, SPLAT_RADIUS * (a > 1 ? a : 1));
    gl.uniform1i(splatP.u.uTarget, velocity.read.attach(0));
    gl.uniform3f(splatP.u.color, dx, dy, 0);
    blit(velocity.write);
    velocity.swap();
    gl.uniform1i(splatP.u.uTarget, dye.read.attach(0));
    gl.uniform3f(splatP.u.color, color[0], color[1], color[2]);
    blit(dye.write);
    dye.swap();
  };

  // Ink colour drifts slowly between the three blues, so each stroke is a slightly different pour.
  const inkAt = (t: number, amount: number): [number, number, number] => {
    const k = (t / 9000) % INKS.length;
    const i = Math.floor(k), f = k - i;
    const s = f * f * (3 - 2 * f);
    const A = INKS[i], B = INKS[(i + 1) % INKS.length];
    return [(A[0] + (B[0] - A[0]) * s) * amount, (A[1] + (B[1] - A[1]) * s) * amount, (A[2] + (B[2] - A[2]) * s) * amount];
  };

  // Pointer → queued splats (applied inside the frame so input never touches GL mid-step).
  let last: { x: number; y: number } | null = null;
  const queue: { x: number; y: number; dx: number; dy: number; amt: number }[] = [];
  let lastInput = 0;
  const onMove = (e: PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = 1 - e.clientY / window.innerHeight;
    if (last) {
      let dx = x - last.x, dy = y - last.y;
      const a = aspect();
      if (a < 1) dx *= a; else dy /= a;
      const px = Math.hypot(e.clientX - last.x * window.innerWidth, e.clientY - (1 - last.y) * window.innerHeight);
      if (px > 0.5) queue.push({ x, y, dx: dx * SPLAT_FORCE, dy: dy * SPLAT_FORCE, amt: 0.05 + Math.min(px / 45, 1) * 0.2 });
    }
    last = { x, y };
    lastInput = performance.now();
    wake();
  };
  const onLeave = () => { last = null; };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  let raf = 0;
  let prev = performance.now();
  const frame = () => {
    raf = 0;
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 1 / 60);
    prev = now;
    resize();
    while (queue.length) {
      const q = queue.shift()!;
      splat(q.x, q.y, q.dx, q.dy, inkAt(now, q.amt));
    }
    step(dt);
    gl.useProgram(dispP.p);
    gl.uniform2f(dispP.u.texel, 1 / dye.read.w, 1 / dye.read.h);
    gl.uniform1i(dispP.u.uDye, dye.read.attach(0));
    blit(null);
    if (now - lastInput < IDLE_MS && document.visibilityState === "visible") raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (raf || document.visibilityState !== "visible") return;
    prev = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const onVis = () => { if (document.visibilityState === "visible" && performance.now() - lastInput < IDLE_MS) wake(); };
  document.addEventListener("visibilitychange", onVis);
  const onResize = () => wake();
  window.addEventListener("resize", onResize);

  // First paint: clean paper.
  gl.useProgram(dispP.p);
  gl.uniform1i(dispP.u.uDye, dye.read.attach(0));
  blit(null);
  canvas.dataset.ready = "";

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", onResize);
    delete canvas.dataset.ready;
    programs.length = 0;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
