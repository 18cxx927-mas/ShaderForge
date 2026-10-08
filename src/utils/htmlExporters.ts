/**
 * Standalone Offline HTML File Exporters
 * Generates self-contained, 100% functional single .html files with:
 * - Real WebGL 3D Minecraft Voxel Engine (orbit controls, time of day, procedural voxels)
 * - Live GLSL shader compilation & real-time error diagnostics
 * - Fully interactive visual node graph (draggable nodes, bezier connecting wires)
 * - Built-in GLSL code formatter
 * - Mobile and desktop responsive layouts
 */

import { ShaderNode, NodeConnection, ShaderpackMetadata } from '../types/shader';
import { triggerFileDownload } from './zipExporter';

// Shared JavaScript WebGL 3D Voxel Engine for Standalone HTML files
const STANDALONE_WEBGL_ENGINE = `
function initMinecraft3DEngine(canvasId, errorBadgeId) {
  var canvas = document.getElementById(canvasId);
  var errEl = errorBadgeId ? document.getElementById(errorBadgeId) : null;
  if (!canvas) return null;

  var gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
  if (!gl) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.style.background = '#7f1d1d';
      errEl.innerHTML = 'WebGL is not supported in this browser';
    }
    return null;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  var camera = { yaw: 0.75, pitch: 0.45, dist: 14, isDragging: false, lastX: 0, lastY: 0 };
  var worldTime = 6000;
  var isPlaying = true;
  var startTime = performance.now();
  var activeProgram = null;
  var fallbackProgram = null;

  // Touch & Mouse Orbit controls
  function handleDragStart(x, y) {
    camera.isDragging = true;
    camera.lastX = x;
    camera.lastY = y;
  }
  function handleDragMove(x, y) {
    if (!camera.isDragging) return;
    var dx = x - camera.lastX;
    var dy = y - camera.lastY;
    camera.yaw += dx * 0.008;
    camera.pitch = Math.max(-1.4, Math.min(1.4, camera.pitch + dy * 0.008));
    camera.lastX = x;
    camera.lastY = y;
  }
  function handleDragEnd() {
    camera.isDragging = false;
  }

  canvas.addEventListener('mousedown', function(e) { handleDragStart(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function(e) { handleDragMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', handleDragEnd);

  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', handleDragEnd);

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    camera.dist = Math.max(5, Math.min(30, camera.dist + e.deltaY * 0.02));
  }, { passive: false });

  // Build Voxel Island Geometry
  var pos = [], uvs = [], norms = [], cols = [];
  function addCube(x, y, z, topC, sideC, botC) {
    var s = 0.5;
    var faces = [
      { n: [0, 1, 0], v: [[x-s,y+s,z+s],[x+s,y+s,z+s],[x+s,y+s,z-s],[x-s,y+s,z-s]], c: topC },
      { n: [0,-1, 0], v: [[x-s,y-s,z-s],[x+s,y-s,z-s],[x+s,y-s,z+s],[x-s,y-s,z+s]], c: botC },
      { n: [0, 0, 1], v: [[x-s,y-s,z+s],[x+s,y-s,z+s],[x+s,y+s,z+s],[x-s,y+s,z+s]], c: sideC },
      { n: [0, 0,-1], v: [[x+s,y-s,z-s],[x-s,y-s,z-s],[x-s,y+s,z-s],[x+s,y+s,z-s]], c: sideC },
      { n: [1, 0, 0], v: [[x+s,y-s,z+s],[x+s,y-s,z-s],[x+s,y+s,z-s],[x+s,y+s,z+s]], c: sideC },
      { n: [-1,0, 0], v: [[x-s,y-s,z-s],[x-s,y-s,z-s],[x-s,y+s,z+s],[x-s,y+s,z-s]], c: sideC }
    ];
    for (var f = 0; f < faces.length; f++) {
      var fc = faces[f];
      var idxs = [0, 1, 2, 0, 2, 3];
      var quvs = [[0,0],[1,0],[1,1],[0,1]];
      for (var i = 0; i < idxs.length; i++) {
        var k = idxs[i];
        pos.push(fc.v[k][0], fc.v[k][1], fc.v[k][2]);
        norms.push(fc.n[0], fc.n[1], fc.n[2]);
        uvs.push(quvs[k][0], quvs[k][1]);
        cols.push(fc.c[0], fc.c[1], fc.c[2], fc.c[3]);
      }
    }
  }

  var cGrass = [0.36, 0.65, 0.22, 1.0], cGrassSide = [0.48, 0.35, 0.22, 1.0];
  var cDirt = [0.52, 0.38, 0.24, 1.0], cStone = [0.50, 0.50, 0.52, 1.0];
  var cWood = [0.42, 0.30, 0.18, 1.0], cLeaves = [0.28, 0.58, 0.18, 0.95];
  var cWater = [0.18, 0.52, 0.88, 0.75], cRed = [0.88, 0.18, 0.18, 1.0];

  for (var x = -3; x <= 3; x++) {
    for (var z = -3; z <= 3; z++) {
      if (x >= 1 && z >= 1) {
        addCube(x, -1, z, cDirt, cDirt, cDirt);
        addCube(x, 0, z, cWater, cWater, cWater);
      } else {
        addCube(x, -2, z, cStone, cStone, cStone);
        addCube(x, -1, z, cDirt, cDirt, cDirt);
        addCube(x, 0, z, cGrass, cGrassSide, cDirt);
      }
    }
  }
  // Oak Tree
  addCube(-1, 1, -1, cWood, cWood, cWood);
  addCube(-1, 2, -1, cWood, cWood, cWood);
  addCube(-1, 3, -1, cWood, cWood, cWood);
  for (var lx = -1; lx <= 1; lx++) {
    for (var lz = -1; lz <= 1; lz++) {
      for (var ly = 3; ly <= 4; ly++) {
        if (lx === 0 && lz === 0 && ly === 3) continue;
        addCube(-1 + lx, ly, -1 + lz, cLeaves, cLeaves, cLeaves);
      }
    }
  }
  addCube(-1, 5, -1, cLeaves, cLeaves, cLeaves);
  addCube(-2, 1, 1, cRed, cRed, cRed);

  var posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  var uvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  var normBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, normBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.STATIC_DRAW);
  var colBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, colBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cols), gl.STATIC_DRAW);
  var vertexCount = pos.length / 3;

  // 32x32 Procedural Minecraft Texture
  var tex = gl.createTexture();
  var pData = new Uint8Array(32 * 32 * 4);
  for (var pi = 0; pi < 32 * 32; pi++) {
    var grain = 240 + Math.floor(Math.random() * 15);
    pData[pi * 4] = grain; pData[pi * 4 + 1] = grain; pData[pi * 4 + 2] = grain; pData[pi * 4 + 3] = 255;
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, pData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Standard Iris Vertex Shader
  var vShaderSource = [
    'attribute vec3 position;',
    'attribute vec2 uv;',
    'attribute vec3 norm;',
    'attribute vec4 color;',
    'uniform mat4 gbufferModelView;',
    'uniform mat4 gbufferProjection;',
    'uniform mat4 uModelViewMatrix;',
    'uniform mat4 uProjectionMatrix;',
    'varying vec2 texcoord;',
    'varying vec4 glColor;',
    'varying vec3 normal;',
    'varying vec3 vNormal;',
    'varying vec3 worldPosition;',
    'void main() {',
    '  texcoord = uv;',
    '  glColor = color;',
    '  normal = norm;',
    '  vNormal = norm;',
    '  worldPosition = position;',
    '  gl_Position = gbufferProjection * gbufferModelView * vec4(position, 1.0);',
    '}'
  ].join('\\n');

  // Fallback Fragment Shader
  var fallbackFshSource = [
    'precision mediump float;',
    'varying vec2 texcoord;',
    'varying vec4 glColor;',
    'varying vec3 normal;',
    'varying vec3 worldPosition;',
    'uniform vec3 sunPosition;',
    'void main() {',
    '  vec3 lightDir = normalize(sunPosition);',
    '  float diff = max(dot(normalize(normal), lightDir), 0.25);',
    '  gl_FragColor = vec4(glColor.rgb * diff, glColor.a);',
    '}'
  ].join('\\n');

  function createProgram(vsSrc, fsSrc) {
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      var err = gl.getShaderInfoLog(vs);
      gl.deleteShader(vs);
      return { error: 'Vertex Shader Error: ' + err };
    }

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      var errFs = gl.getShaderInfoLog(fs);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return { error: errFs };
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      var linkErr = gl.getProgramInfoLog(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(prog);
      return { error: 'Link Error: ' + linkErr };
    }
    return { program: prog };
  }

  // Create default fallback program
  var fbRes = createProgram(vShaderSource, fallbackFshSource);
  if (fbRes.program) fallbackProgram = fbRes.program;

  // Inverse 4x4 matrix calculation
  function invertMatrix4(m) {
    var out = new Float32Array(16);
    var a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    var a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    var a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    var a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;

    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return out;
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }

  function compileShaderSource(customGlsl) {
    var cleanGlsl = customGlsl.replace(/#version\\s+\\d+(\\s+compatibility)?/g, '');
    if (!cleanGlsl.includes('precision highp float;') && !cleanGlsl.includes('precision mediump float;')) {
      cleanGlsl = 'precision mediump float;\\n' + cleanGlsl;
    }

    // Inject missing standard Iris uniforms and varyings individually
    var missing = '';
    function checkDecl(token, decl) {
      if (cleanGlsl.indexOf(token) === -1) missing += decl + '\\n';
    }
    checkDecl('gbufferModelView', 'uniform mat4 gbufferModelView;');
    checkDecl('gbufferProjection', 'uniform mat4 gbufferProjection;');
    checkDecl('gbufferModelViewInverse', 'uniform mat4 gbufferModelViewInverse;');
    checkDecl('gbufferProjectionInverse', 'uniform mat4 gbufferProjectionInverse;');
    checkDecl('cameraPosition', 'uniform vec3 cameraPosition;');
    checkDecl('worldTime', 'uniform int worldTime;');
    checkDecl('frameTimeCounter', 'uniform float frameTimeCounter;');
    checkDecl('rainStrength', 'uniform float rainStrength;');
    checkDecl('sunPosition', 'uniform vec3 sunPosition;');
    checkDecl('upPosition', 'uniform vec3 upPosition;');
    checkDecl('colortex0', 'uniform sampler2D colortex0;');
    checkDecl('depthtex0', 'uniform sampler2D depthtex0;');
    checkDecl('texcoord', 'varying vec2 texcoord;');
    checkDecl('glColor', 'varying vec4 glColor;');
    checkDecl('normal', 'varying vec3 normal;');
    checkDecl('worldPosition', 'varying vec3 worldPosition;');

    cleanGlsl = missing + cleanGlsl;

    var res = createProgram(vShaderSource, cleanGlsl);
    if (res.error) {
      if (errEl) {
        errEl.style.display = 'block';
        errEl.style.background = '#7f1d1d';
        errEl.style.color = '#fca5a5';
        errEl.innerHTML = '<strong>Shader Warning:</strong> ' + res.error.replace(/\\n/g, '<br>');
      }
      return false;
    }

    if (activeProgram) gl.deleteProgram(activeProgram);
    activeProgram = res.program;
    if (errEl) {
      errEl.style.display = 'block';
      errEl.style.background = '#064e3b';
      errEl.style.color = '#34d399';
      errEl.innerHTML = '✓ Iris Shader Live on WebGL GPU';
    }
    return true;
  }

  // Perspective Matrix
  function perspectiveMat(fovy, aspect, near, far) {
    var out = new Float32Array(16);
    var f = 1.0 / Math.tan(fovy / 2);
    var nf = 1 / (near - far);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }

  // LookAt Matrix
  function lookAtMat(eye, center, up) {
    var out = new Float32Array(16);
    var z0 = eye[0]-center[0], z1 = eye[1]-center[1], z2 = eye[2]-center[2];
    var len = 1 / Math.hypot(z0, z1, z2);
    z0 *= len; z1 *= len; z2 *= len;
    var x0 = up[1]*z2 - up[2]*z1, x1 = up[2]*z0 - up[0]*z2, x2 = up[0]*z1 - up[1]*z0;
    len = 1 / Math.hypot(x0, x1, x2);
    x0 *= len; x1 *= len; x2 *= len;
    var y0 = z1*x2 - z2*x1, y1 = z2*x0 - z0*x2, y2 = z0*x1 - z1*x0;
    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0*eye[0] + x1*eye[1] + x2*eye[2]);
    out[13] = -(y0*eye[0] + y1*eye[1] + y2*eye[2]);
    out[14] = -(z0*eye[0] + z1*eye[1] + z2*eye[2]);
    out[15] = 1;
    return out;
  }

  // Main Render Loop
  function render() {
    var dw = canvas.clientWidth || 300, dh = canvas.clientHeight || 200;
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw; canvas.height = dh;
      gl.viewport(0, 0, dw, dh);
    }

    camera.yaw += 0.003;
    var elapsed = (performance.now() - startTime) / 1000;

    var sunAngle = ((worldTime - 6000) / 24000) * Math.PI * 2;
    var sunX = Math.cos(sunAngle) * 50.0, sunY = Math.sin(sunAngle) * 50.0;

    var sunH = Math.sin(sunAngle);
    var sky = sunH > 0.2 ? [0.45, 0.68, 0.95] : sunH > -0.1 ? [0.92, 0.45, 0.25] : [0.1, 0.1, 0.18];
    gl.clearColor(sky[0], sky[1], sky[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var proj = perspectiveMat(45 * Math.PI / 180, canvas.width / (canvas.height || 1), 0.1, 100.0);
    var cx = camera.dist * Math.cos(camera.pitch) * Math.sin(camera.yaw);
    var cy = camera.dist * Math.sin(camera.pitch);
    var cz = camera.dist * Math.cos(camera.pitch) * Math.cos(camera.yaw);
    var view = lookAtMat([cx, cy, cz], [0, 0, 0], [0, 1, 0]);

    var progToUse = activeProgram || fallbackProgram;
    if (progToUse) {
      gl.useProgram(progToUse);

      function bindAttr(name, buf, sz) {
        var loc = gl.getAttribLocation(progToUse, name);
        if (loc === -1) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0);
      }
      bindAttr('position', posBuf, 3);
      bindAttr('uv', uvBuf, 2);
      bindAttr('norm', normBuf, 3);
      bindAttr('normal', normBuf, 3);
      bindAttr('color', colBuf, 4);

      function setM4(n, m) { var l = gl.getUniformLocation(progToUse, n); if (l) gl.uniformMatrix4fv(l, false, m); }
      function set3f(n, x, y, z) { var l = gl.getUniformLocation(progToUse, n); if (l) gl.uniform3f(l, x, y, z); }
      function set1f(n, v) { var l = gl.getUniformLocation(progToUse, n); if (l) gl.uniform1f(l, v); }
      function set1i(n, v) { var l = gl.getUniformLocation(progToUse, n); if (l) gl.uniform1i(l, v); }

      setM4('gbufferProjection', proj);
      setM4('gbufferModelView', view);
      setM4('uProjectionMatrix', proj);
      setM4('uModelViewMatrix', view);
      setM4('gbufferProjectionInverse', invertMatrix4(proj));
      setM4('gbufferModelViewInverse', invertMatrix4(view));

      set3f('cameraPosition', cx, cy, cz);
      set3f('sunPosition', sunX, sunY, 10.0);
      set3f('upPosition', 0.0, 1.0, 0.0);
      set1f('frameTimeCounter', elapsed);
      set1i('worldTime', worldTime);
      set1f('rainStrength', 0.0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      set1i('colortex0', 0);

      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  return {
    compileShader: compileShaderSource,
    setTime: function(t) { worldTime = t; }
  };
}
`;

/**
 * Exports a standalone, fully functional HTML file for the Visual Node Editor
 */
export function exportVisualEditorHtml(
  nodes: ShaderNode[],
  connections: NodeConnection[],
  fragmentGlsl: string,
  metadata: ShaderpackMetadata
): void {
  const jsonNodes = JSON.stringify(nodes);
  const jsonConns = JSON.stringify(connections);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${metadata.name} - Iris Visual Node Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0d14; color: #f3f4f6; font-family: system-ui, -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { height: 48px; background: #111827; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 13px; z-index: 20; shrink: 0; }
    .brand { font-weight: bold; color: #10b981; display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .badge { font-size: 11px; background: #1f2937; padding: 3px 8px; border-radius: 6px; color: #9ca3af; border: 1px solid #374151; }
    #main { flex: 1; display: flex; overflow: hidden; position: relative; }
    #canvas-container { flex: 1; position: relative; background: #070a0f; overflow: hidden; background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 24px 24px; touch-action: none; }
    #preview-container { width: 42%; min-width: 280px; max-width: 600px; background: #000; border-left: 1px solid #1f2937; position: relative; display: flex; flex-direction: column; }
    @media (max-width: 900px) {
      #main { flex-direction: column; }
      #preview-container { width: 100%; height: 38%; min-width: 0; border-left: none; border-top: 1px solid #1f2937; }
    }
    canvas { width: 100%; height: 100%; display: block; }
    .node-card { position: absolute; width: 220px; background: rgba(17, 24, 39, 0.95); border: 1px solid #374151; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); user-select: none; font-size: 11px; z-index: 10; cursor: default; }
    .node-header { padding: 8px 12px; background: #1f2937; border-top-left-radius: 9px; border-top-right-radius: 9px; font-weight: 600; cursor: grab; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
    .node-header:active { cursor: grabbing; }
    .node-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .ports-row { display: flex; justify-content: space-between; }
    .port-item { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 4px; }
    .port-circle { width: 11px; height: 11px; border-radius: 50%; border: 2px solid #10b981; background: #111827; cursor: pointer; }
    .btn { background: #10b981; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; transition: 0.15s; }
    .btn:hover { background: #059669; }
    .overlay-tip { position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.7); padding: 5px 12px; border-radius: 6px; font-size: 11px; color: #9ca3af; pointer-events: none; border: 1px solid #1f2937; }
    #status-badge { position: absolute; top: 12px; left: 12px; background: #064e3b; color: #34d399; padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #059669; z-index: 25; font-family: monospace; max-width: 90%; }
    .preview-bar { height: 36px; background: #111827; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>🌿</span>
      <span>${metadata.name} · Visual Node Studio</span>
      <span class="badge">Minecraft 1.21+ Iris</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="addNode()">+ Add Node</button>
      <button class="btn" style="background:#374151;" onclick="togglePreview()">Toggle 3D</button>
    </div>
  </header>
  <div id="main">
    <div id="canvas-container">
      <svg id="wires-layer" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;"></svg>
      <div id="nodes-layer"></div>
      <div class="overlay-tip">Drag cards to arrange nodes · Real-time 3D sync</div>
    </div>
    <div id="preview-container">
      <div class="preview-bar">
        <span>3D Minecraft Voxel Preview</span>
        <button class="badge" style="cursor:pointer;" onclick="toggleTime()">Toggle Day / Night</button>
      </div>
      <div style="flex: 1; position: relative;">
        <canvas id="glcanvas"></canvas>
        <div id="status-badge">Compiling Iris Shader...</div>
        <div class="overlay-tip">Drag to orbit · Scroll to zoom</div>
      </div>
    </div>
  </div>

  <script>
    ${STANDALONE_WEBGL_ENGINE}

    var nodes = ${jsonNodes};
    var connections = ${jsonConns};
    var initialGlsl = ${JSON.stringify(fragmentGlsl)};

    var engine = initMinecraft3DEngine('glcanvas', 'status-badge');
    if (engine) engine.compileShader(initialGlsl);

    var curTime = 6000;
    function toggleTime() {
      curTime = (curTime + 6000) % 24000;
      if (engine) engine.setTime(curTime);
    }

    var previewShown = true;
    function togglePreview() {
      var p = document.getElementById('preview-container');
      previewShown = !previewShown;
      p.style.display = previewShown ? 'flex' : 'none';
    }

    var nodesLayer = document.getElementById('nodes-layer');
    var wiresLayer = document.getElementById('wires-layer');

    function renderWires() {
      var svgContent = '';
      connections.forEach(function(c) {
        var fromN = nodes.find(function(n) { return n.id === c.fromNodeId; });
        var toN = nodes.find(function(n) { return n.id === c.toNodeId; });
        if (!fromN || !toN) return;
        var x1 = (fromN.x || 100) + 220;
        var y1 = (fromN.y || 100) + 38;
        var x2 = (toN.x || 300);
        var y2 = (toN.y || 100) + 38;
        var dx = Math.max(30, Math.abs(x2 - x1) * 0.5);
        svgContent += '<path d="M ' + x1 + ' ' + y1 + ' C ' + (x1+dx) + ' ' + y1 + ', ' + (x2-dx) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" fill="none" stroke="#10b981" stroke-width="2.5" />';
      });
      wiresLayer.innerHTML = svgContent;
    }

    function renderNodes() {
      nodesLayer.innerHTML = '';
      nodes.forEach(function(n) {
        var card = document.createElement('div');
        card.className = 'node-card';
        card.id = 'dom_' + n.id;
        card.style.left = (n.x || 100) + 'px';
        card.style.top = (n.y || 100) + 'px';

        card.innerHTML = [
          '<div class="node-header" onmousedown="dragStart(event, \\'' + n.id + '\\')" ontouchstart="dragTouchStart(event, \\'' + n.id + '\\')">',
          '<span>' + n.name + '</span>',
          '<span style="color:#6b7280; font-size:10px;">' + (n.category || '') + '</span>',
          '</div>',
          '<div class="node-body">',
          '<div class="ports-row">',
          '<div>' + (n.inputs || []).map(function(p) { return '<div class="port-item"><div class="port-circle"></div>' + p.name + '</div>'; }).join('') + '</div>',
          '<div style="text-align: right;">' + (n.outputs || []).map(function(p) { return '<div class="port-item" style="justify-content: flex-end;">' + p.name + '<div class="port-circle"></div></div>'; }).join('') + '</div>',
          '</div>',
          '</div>'
        ].join('');

        nodesLayer.appendChild(card);
      });
      renderWires();
    }

    var draggingNode = null;
    var offset = { x: 0, y: 0 };

    window.dragStart = function(e, id) {
      draggingNode = nodes.find(function(n) { return n.id === id; });
      if (!draggingNode) return;
      offset.x = e.clientX - (draggingNode.x || 100);
      offset.y = e.clientY - (draggingNode.y || 100);
    };

    window.dragTouchStart = function(e, id) {
      if (!e.touches.length) return;
      draggingNode = nodes.find(function(n) { return n.id === id; });
      if (!draggingNode) return;
      offset.x = e.touches[0].clientX - (draggingNode.x || 100);
      offset.y = e.touches[0].clientY - (draggingNode.y || 100);
    };

    window.addEventListener('mousemove', function(e) {
      if (!draggingNode) return;
      draggingNode.x = Math.max(10, e.clientX - offset.x);
      draggingNode.y = Math.max(10, e.clientY - offset.y);
      var el = document.getElementById('dom_' + draggingNode.id);
      if (el) {
        el.style.left = draggingNode.x + 'px';
        el.style.top = draggingNode.y + 'px';
      }
      renderWires();
    });

    window.addEventListener('touchmove', function(e) {
      if (!draggingNode || !e.touches.length) return;
      draggingNode.x = Math.max(10, e.touches[0].clientX - offset.x);
      draggingNode.y = Math.max(10, e.touches[0].clientY - offset.y);
      var el = document.getElementById('dom_' + draggingNode.id);
      if (el) {
        el.style.left = draggingNode.x + 'px';
        el.style.top = draggingNode.y + 'px';
      }
      renderWires();
    }, { passive: true });

    window.addEventListener('mouseup', function() { draggingNode = null; });
    window.addEventListener('touchend', function() { draggingNode = null; });

    window.addNode = function() {
      var newId = 'node_' + Date.now();
      nodes.push({
        id: newId,
        name: 'Sunlight Tint',
        category: 'color',
        x: 120 + Math.random() * 80,
        y: 120 + Math.random() * 80,
        inputs: [],
        outputs: [{ id: 'out', name: 'Color (RGB)' }]
      });
      renderNodes();
    };

    renderNodes();
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  triggerFileDownload(blob, `${metadata.name.replace(/\s+/g, '_')}_visual_editor.html`);
}

/**
 * Exports a standalone, fully functional HTML file for the GLSL Code Editor with built-in formatter
 */
export function exportCodeEditorHtml(
  glslCode: string,
  metadata: ShaderpackMetadata
): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${metadata.name} - Iris GLSL Code Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0c; color: #fff; font-family: system-ui, -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { height: 48px; background: #16181d; border-bottom: 1px solid #272a34; display: flex; justify-content: space-between; align-items: center; padding: 0 16px; font-size: 13px; shrink: 0; }
    .brand { font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 11px; background: #272a34; padding: 3px 8px; border-radius: 6px; color: #9ca3af; border: 1px solid #374151; }
    #container { flex: 1; display: flex; overflow: hidden; }
    #editor-pane { width: 55%; height: 100%; display: flex; flex-direction: column; border-right: 1px solid #272a34; }
    #preview-pane { width: 45%; height: 100%; position: relative; background: #000; display: flex; flex-direction: column; }
    @media (max-width: 900px) {
      #container { flex-direction: column; }
      #editor-pane { width: 100%; height: 60%; border-right: none; border-bottom: 1px solid #272a34; }
      #preview-pane { width: 100%; height: 40%; }
    }
    .editor-bar { padding: 8px 16px; background: #111318; border-bottom: 1px solid #272a34; font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    textarea { flex: 1; width: 100%; background: #080a0f; color: #34d399; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.6; border: none; padding: 16px; resize: none; outline: none; }
    canvas { width: 100%; height: 100%; display: block; }
    .tip { position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.7); padding: 5px 12px; border-radius: 6px; font-size: 11px; color: #9ca3af; border: 1px solid #272a34; pointer-events: none; }
    .btn { background: #38bdf8; color: #000; border: none; padding: 5px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; transition: 0.15s; }
    .btn:hover { background: #0ea5e9; }
    .btn-secondary { background: #272a34; color: #fff; }
    .btn-secondary:hover { background: #374151; }
    #status-badge { position: absolute; top: 12px; left: 12px; background: #064e3b; color: #34d399; padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #059669; z-index: 25; font-family: monospace; max-width: 90%; }
    .preview-bar { height: 36px; background: #111318; border-bottom: 1px solid #272a34; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⚡</span>
      <span>${metadata.name} · GLSL Code Studio</span>
      <span class="badge">Minecraft 1.21+ Iris</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-secondary" onclick="formatCode()">Format GLSL</button>
      <button class="btn" onclick="copyCode()">Copy Code</button>
    </div>
  </header>
  <div id="container">
    <div id="editor-pane">
      <div class="editor-bar">
        <span>shaders/gbuffers_terrain.fsh (Real-time compiling on keystroke)</span>
        <span class="badge">OpenGL 330 / Iris Compatibility</span>
      </div>
      <textarea id="code-editor" spellcheck="false">${glslCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
    </div>
    <div id="preview-pane">
      <div class="preview-bar">
        <span>Live WebGL 3D Preview</span>
        <button class="badge" style="cursor:pointer;" onclick="toggleTime()">Toggle Day / Night</button>
      </div>
      <div style="flex: 1; position: relative;">
        <canvas id="previewCanvas"></canvas>
        <div id="status-badge">Compiling Iris Shader...</div>
        <div class="tip">Drag to orbit camera · Scroll to zoom</div>
      </div>
    </div>
  </div>

  <script>
    ${STANDALONE_WEBGL_ENGINE}

    var engine = initMinecraft3DEngine('previewCanvas', 'status-badge');
    var editor = document.getElementById('code-editor');

    if (engine) {
      engine.compileShader(editor.value);
    }

    var curTime = 6000;
    function toggleTime() {
      curTime = (curTime + 6000) % 24000;
      if (engine) engine.setTime(curTime);
    }

    function copyCode() {
      navigator.clipboard.writeText(editor.value);
      alert('GLSL code copied to clipboard!');
    }

    // Standard GLSL code formatter
    function formatCode() {
      var lines = editor.value.split('\\n');
      var indent = 0;
      var out = [];
      for (var i = 0; i < lines.length; i++) {
        var t = lines[i].trim();
        if (!t) { out.push(''); continue; }
        if (t.startsWith('#')) { out.push(t); continue; }
        if (t.startsWith('}')) indent = Math.max(0, indent - 1);
        out.push('    '.repeat(indent) + t);
        var opens = (t.match(/\\{/g) || []).length;
        var closes = (t.match(/\\}/g) || []).length;
        if (!t.startsWith('}')) indent += opens - closes;
        else indent += opens;
      }
      editor.value = out.join('\\n');
      if (engine) engine.compileShader(editor.value);
    }

    // Live recompile on typing with debounce
    var debounceTimer;
    editor.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        if (engine) engine.compileShader(editor.value);
      }, 200);
    });

    // Indent tab key support
    editor.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = this.selectionStart, end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
        if (engine) engine.compileShader(this.value);
      }
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  triggerFileDownload(blob, `${metadata.name.replace(/\s+/g, '_')}_code_editor.html`);
}

/**
 * Exports complete all-in-one studio HTML containing both visual and code tabs
 */
export function exportCompleteStudioHtml(
  nodes: ShaderNode[],
  connections: NodeConnection[],
  glslCode: string,
  metadata: ShaderpackMetadata
): void {
  const jsonNodes = JSON.stringify(nodes);
  const jsonConns = JSON.stringify(connections);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${metadata.name} - Complete Iris Shader Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0b0f17; color: #f3f4f6; font-family: system-ui, -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { height: 48px; background: #111827; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 13px; z-index: 20; shrink: 0; }
    .tabs { display: flex; gap: 4px; background: #030712; padding: 3px; border-radius: 8px; border: 1px solid #1f2937; }
    .tab-btn { background: transparent; border: none; color: #9ca3af; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; }
    .tab-btn.active { background: #1f2937; color: #10b981; font-weight: 600; }
    #workspace { flex: 1; display: flex; overflow: hidden; }
    #left-pane { flex: 1; height: 100%; position: relative; overflow: hidden; }
    #right-pane { width: 42%; min-width: 280px; max-width: 600px; height: 100%; background: #000; border-left: 1px solid #1f2937; position: relative; display: flex; flex-direction: column; }
    @media (max-width: 900px) {
      #workspace { flex-direction: column; }
      #left-pane { width: 100%; height: 60%; }
      #right-pane { width: 100%; height: 40%; min-width: 0; border-left: none; border-top: 1px solid #1f2937; }
    }
    textarea { width: 100%; height: 100%; background: #080d14; color: #34d399; font-family: monospace; font-size: 12px; padding: 16px; border: none; outline: none; resize: none; line-height: 1.6; }
    .node-card { position: absolute; width: 220px; background: rgba(17, 24, 39, 0.95); border: 1px solid #374151; border-radius: 10px; font-size: 11px; z-index: 10; cursor: default; }
    .node-header { padding: 8px 12px; background: #1f2937; border-top-left-radius: 9px; border-top-right-radius: 9px; font-weight: 600; cursor: grab; border-bottom: 1px solid #374151; }
    .node-body { padding: 10px; }
    .port-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .port-circle { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #10b981; background: #111827; }
    #status-badge { position: absolute; top: 12px; left: 12px; background: #064e3b; color: #34d399; padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #059669; z-index: 25; font-family: monospace; max-width: 90%; }
    .preview-bar { height: 36px; background: #111827; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 12px; }
    .badge { font-size: 11px; background: #1f2937; padding: 3px 8px; border-radius: 6px; color: #9ca3af; border: 1px solid #374151; }
    .overlay-tip { position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.7); padding: 5px 12px; border-radius: 6px; font-size: 11px; color: #9ca3af; border: 1px solid #1f2937; pointer-events: none; }
  </style>
</head>
<body>
  <header>
    <div style="font-weight: bold; color: #10b981; display: flex; align-items: center; gap: 8px;">
      <span>🌿</span>
      <span>${metadata.name} Studio</span>
      <span class="badge">Minecraft 1.21+ Iris</span>
    </div>
    <div class="tabs">
      <button class="tab-btn active" id="tab-visual" onclick="showTab('visual')">Visual Nodes</button>
      <button class="tab-btn" id="tab-code" onclick="showTab('code')">GLSL Code</button>
    </div>
    <div style="font-size: 11px; color: #9ca3af;">Offline Standalone Edition</div>
  </header>
  <div id="workspace">
    <div id="left-pane">
      <div id="visual-view" style="width: 100%; height: 100%; position: relative; background: #070a0f; background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 24px 24px; overflow: hidden;">
        <svg id="studio-wires" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;"></svg>
        <div id="studio-nodes"></div>
        <div class="overlay-tip">Drag node cards to arrange</div>
      </div>
      <div id="code-view" style="width: 100%; height: 100%; display: none;">
        <textarea id="studio-editor" spellcheck="false">${glslCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
      </div>
    </div>
    <div id="right-pane">
      <div class="preview-bar">
        <span>3D Voxel Preview</span>
        <button class="badge" style="cursor:pointer;" onclick="toggleTime()">Toggle Day / Night</button>
      </div>
      <div style="flex: 1; position: relative;">
        <canvas id="studioCanvas"></canvas>
        <div id="status-badge">Compiling Iris Shader...</div>
        <div class="overlay-tip">Drag to orbit · Scroll to zoom</div>
      </div>
    </div>
  </div>

  <script>
    ${STANDALONE_WEBGL_ENGINE}

    var engine = initMinecraft3DEngine('studioCanvas', 'status-badge');
    var editor = document.getElementById('studio-editor');

    if (engine) {
      engine.compileShader(editor.value);
    }

    var curTime = 6000;
    function toggleTime() {
      curTime = (curTime + 6000) % 24000;
      if (engine) engine.setTime(curTime);
    }

    editor.addEventListener('input', function() {
      if (engine) engine.compileShader(editor.value);
    });

    function showTab(mode) {
      document.getElementById('visual-view').style.display = mode === 'visual' ? 'block' : 'none';
      document.getElementById('code-view').style.display = mode === 'code' ? 'block' : 'none';
      document.getElementById('tab-visual').className = 'tab-btn ' + (mode === 'visual' ? 'active' : '');
      document.getElementById('tab-code').className = 'tab-btn ' + (mode === 'code' ? 'active' : '');
    }

    var nodes = ${jsonNodes};
    var connections = ${jsonConns};
    var vView = document.getElementById('studio-nodes');
    var wView = document.getElementById('studio-wires');

    function renderStudioGraph() {
      vView.innerHTML = '';
      nodes.forEach(function(n) {
        var c = document.createElement('div');
        c.className = 'node-card';
        c.id = 'sn_' + n.id;
        c.style.left = (n.x || 80) + 'px';
        c.style.top = (n.y || 80) + 'px';
        c.innerHTML = [
          '<div class="node-header" onmousedown="startDragStudio(event, \\'' + n.id + '\\')">' + n.name + '</div>',
          '<div class="node-body">',
          '<div style="display: flex; justify-content: space-between;">',
          '<div>' + (n.inputs || []).map(function(p) { return '<div class="port-item"><div class="port-circle"></div>' + p.name + '</div>'; }).join('') + '</div>',
          '<div style="text-align: right;">' + (n.outputs || []).map(function(p) { return '<div class="port-item" style="justify-content: flex-end;">' + p.name + '<div class="port-circle"></div></div>'; }).join('') + '</div>',
          '</div>',
          '</div>'
        ].join('');
        vView.appendChild(c);
      });
      renderWires();
    }

    function renderWires() {
      var svgContent = '';
      connections.forEach(function(c) {
        var fromN = nodes.find(function(n) { return n.id === c.fromNodeId; });
        var toN = nodes.find(function(n) { return n.id === c.toNodeId; });
        if (!fromN || !toN) return;
        var x1 = (fromN.x || 80) + 220;
        var y1 = (fromN.y || 80) + 38;
        var x2 = (toN.x || 300);
        var y2 = (toN.y || 80) + 38;
        var dx = Math.max(30, Math.abs(x2 - x1) * 0.5);
        svgContent += '<path d="M ' + x1 + ' ' + y1 + ' C ' + (x1+dx) + ' ' + y1 + ', ' + (x2-dx) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" fill="none" stroke="#10b981" stroke-width="2.5" />';
      });
      wView.innerHTML = svgContent;
    }

    var draggingStudioNode = null;
    var studioOffset = { x: 0, y: 0 };
    window.startDragStudio = function(e, id) {
      draggingStudioNode = nodes.find(function(n) { return n.id === id; });
      if (!draggingStudioNode) return;
      studioOffset.x = e.clientX - (draggingStudioNode.x || 80);
      studioOffset.y = e.clientY - (draggingStudioNode.y || 80);
    };

    window.addEventListener('mousemove', function(e) {
      if (!draggingStudioNode) return;
      draggingStudioNode.x = Math.max(10, e.clientX - studioOffset.x);
      draggingStudioNode.y = Math.max(10, e.clientY - studioOffset.y);
      var el = document.getElementById('sn_' + draggingStudioNode.id);
      if (el) {
        el.style.left = draggingStudioNode.x + 'px';
        el.style.top = draggingStudioNode.y + 'px';
      }
      renderWires();
    });

    window.addEventListener('mouseup', function() {
      draggingStudioNode = null;
    });

    renderStudioGraph();
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  triggerFileDownload(blob, `${metadata.name.replace(/\s+/g, '_')}_complete_studio.html`);
}
