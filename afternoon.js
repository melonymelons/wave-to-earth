// A continuous evolving light field: no object outlines or looping motion paths.
const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform float time;
uniform float aspect;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = fract(p);
  f = f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(
    mix(mix(hash(cell), hash(cell+vec3(1,0,0)), f.x),
        mix(hash(cell+vec3(0,1,0)), hash(cell+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(cell+vec3(0,0,1)), hash(cell+vec3(1,0,1)), f.x),
        mix(hash(cell+vec3(0,1,1)), hash(cell+vec3(1,1,1)), f.x), f.y), f.z);
}
float field(vec3 p) {
  float result = noise(p) * 0.58;
  p = p * 2.03 + vec3(8.4, 3.7, 1.2);
  result += noise(p) * 0.28;
  p = p * 2.01 + vec3(2.8, 7.3, 5.1);
  return result + noise(p) * 0.14;
}
void main() {
  vec2 p = uv * vec2(aspect, 1.0) * 3.1;
  // Sideways flow slowly changes course as its surrounding field evolves.
  p += vec2(time * 0.026, -time * 0.008);
  float evolution = time * 0.037;
  vec2 current = vec2(
    field(vec3(p * 0.68 + vec2(4.3, 1.7), evolution)),
    field(vec3(p * 0.68 + vec2(1.8, 8.2), evolution + 4.6)));
  vec3 bent = vec3(p + (current - 0.5) * 2.8, evolution + 1.5);
  float warmth = field(bent);
  float detail = noise(bent * 3.0 + vec3(7.0, 2.0, 0.0));
  float light = smoothstep(0.48, 0.69, warmth);
  vec3 blue = mix(vec3(0.105, 0.157, 0.199), vec3(0.20, 0.25, 0.28), uv.y);
  blue += vec3(0.040, 0.019, 0.006) * current.x;
  vec3 amber = mix(vec3(0.64, 0.37, 0.17), vec3(0.94, 0.73, 0.42),
    smoothstep(0.50, 0.78, warmth) * 0.8 + detail * 0.2);
  vec3 color = mix(blue, amber, light * 0.86);
  // A soft luminous fringe, without a stroke or a plastic specular highlight.
  float fringe = smoothstep(0.46, 0.55, warmth) * (1.0 - smoothstep(0.57, 0.67, warmth));
  color += vec3(0.11, 0.075, 0.034) * fringe;
  float vignette = 1.0 - smoothstep(0.18, 0.82, length(uv - 0.5));
  color *= 0.84 + vignette * 0.16;
  gl_FragColor = vec4(color, 1.0);
}`;

const renderers = new WeakMap();

function createRenderer(doc) {
  const canvas = doc.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { canvas, gl, time: gl.getUniformLocation(program, 'time'), aspect: gl.getUniformLocation(program, 'aspect') };
}

export function paintAfternoon(ctx, width, height, seconds) {
  const doc = ctx.canvas?.ownerDocument;
  if (!doc?.createElement) return false;
  if (!renderers.has(ctx)) {
    try { renderers.set(ctx, createRenderer(doc)); }
    catch { renderers.set(ctx, null); }
  }
  const renderer = renderers.get(ctx);
  if (!renderer || renderer.gl.isContextLost()) return false;
  const { canvas, gl } = renderer;
  const scale = Math.min(1, 900 / Math.max(width, height));
  const pixelWidth = Math.max(1, Math.round(width * scale));
  const pixelHeight = Math.max(1, Math.round(height * scale));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    gl.viewport(0, 0, pixelWidth, pixelHeight);
  }
  gl.uniform1f(renderer.time, seconds);
  gl.uniform1f(renderer.aspect, width / height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  ctx.drawImage(canvas, 0, 0, width, height);
  return true;
}
