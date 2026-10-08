/**
 * Real-time 3D Minecraft WebGL Shader Previewer
 * Simulates Minecraft 1.21 voxel terrain, water, lighting, and Iris uniforms in real-time.
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Sun, 
  Moon, 
  CloudRain, 
  RotateCw, 
  Maximize2, 
  Eye, 
  Layers, 
  Sparkles,
  Play,
  Pause,
  Compass
} from 'lucide-react';

interface RealtimeShaderPreviewProps {
  fragmentGlsl: string;
  onCompilationStatus?: (success: boolean, message?: string) => void;
}

export type SceneMode = 'voxel_island' | 'water_basin' | 'minecraft_cube' | 'sphere' | 'screen_quad';

export const RealtimeShaderPreview: React.FC<RealtimeShaderPreviewProps> = ({
  fragmentGlsl,
  onCompilationStatus,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Scene state
  const [sceneMode, setSceneMode] = useState<SceneMode>('voxel_island');
  const [worldTime, setWorldTime] = useState<number>(6000); // 6000 = noon, 12000 = sunset, 18000 = midnight, 0 = sunrise
  const [isRaining, setIsRaining] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Camera Orbit state
  const cameraRef = useRef({
    yaw: 0.75,
    pitch: 0.45,
    distance: 14,
    target: [0, 0, 0] as [number, number, number],
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  const stateRef = useRef({
    worldTime,
    isRaining,
    autoRotate,
    isPlaying,
    sceneMode,
  });

  useEffect(() => {
    stateRef.current = {
      worldTime,
      isRaining,
      autoRotate,
      isPlaying,
      sceneMode,
    };
  }, [worldTime, isRaining, autoRotate, isPlaying, sceneMode]);

  // Main WebGL renderer lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) {
      onCompilationStatus?.(false, 'WebGL not supported on this browser.');
      return;
    }

    // Enable depth test
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    let animationFrameId: number;
    let startTime = performance.now();
    let lastFpsTime = performance.now();
    let frameCount = 0;
    let shaderProgram: WebGLProgram | null = null;
    let defaultShaderProgram: WebGLProgram | null = null;

    // Helper: Build default fallback shader
    const fallbackVsh = `
      attribute vec3 position;
      attribute vec2 uv;
      attribute vec3 normal;
      attribute vec4 color;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;

      varying vec2 texcoord;
      varying vec4 glColor;
      varying vec3 vNormal;
      varying vec3 worldPosition;

      void main() {
        texcoord = uv;
        glColor = color;
        vNormal = normal;
        worldPosition = position;
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fallbackFsh = `
      precision mediump float;
      varying vec2 texcoord;
      varying vec4 glColor;
      varying vec3 vNormal;
      varying vec3 worldPosition;

      uniform vec3 sunPosition;
      uniform float frameTimeCounter;

      void main() {
        vec3 lightDir = normalize(sunPosition);
        float diff = max(dot(normalize(vNormal), lightDir), 0.25);
        gl_FragColor = vec4(glColor.rgb * diff, glColor.a);
      }
    `;

    function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        const info = glCtx.getShaderInfoLog(shader);
        console.warn('Shader compile log:', info);
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(glCtx: WebGLRenderingContext, vSource: string, fSource: string): WebGLProgram | null {
      const vShader = createShader(glCtx, glCtx.VERTEX_SHADER, vSource);
      const fShader = createShader(glCtx, glCtx.FRAGMENT_SHADER, fSource);
      if (!vShader || !fShader) return null;

      const program = glCtx.createProgram();
      if (!program) return null;
      glCtx.attachShader(program, vShader);
      glCtx.attachShader(program, fShader);
      glCtx.linkProgram(program);

      if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
        console.warn('Program link error:', glCtx.getProgramInfoLog(program));
        glCtx.deleteProgram(program);
        return null;
      }
      return program;
    }

    defaultShaderProgram = createProgram(gl, fallbackVsh, fallbackFsh);

    // Prepare custom shader program with Iris compatibility wrappers
    function compileCustomGlsl(customGlsl: string) {
      if (shaderProgram) {
        gl?.deleteProgram(shaderProgram);
        shaderProgram = null;
      }

      // Pre-process Iris code for standard WebGL
      let processedFsh = customGlsl
        .replace(/#version\s+\d+(\s+compatibility)?/g, '')
        .replace(/\btexture2D\(colortex0,\s*([^\)]+)\)/g, 'texture2D(colortex0, $1)')
        .replace(/\bvarying\s+/g, 'varying ')
        .replace(/\bgl_FragColor\b/g, 'gl_FragColor');

      // Prepend precision header if not present
      if (!processedFsh.includes('precision highp float;') && !processedFsh.includes('precision mediump float;')) {
        processedFsh = 'precision mediump float;\n' + processedFsh;
      }

      // Only inject declarations for uniforms/varyings if they are not already declared in customGlsl
      let missingDeclarations = '';
      const checkAndAdd = (name: string, decl: string) => {
        if (!processedFsh.includes(name)) {
          missingDeclarations += decl + '\n';
        }
      };

      checkAndAdd('gbufferModelView', 'uniform mat4 gbufferModelView;');
      checkAndAdd('gbufferProjection', 'uniform mat4 gbufferProjection;');
      checkAndAdd('gbufferModelViewInverse', 'uniform mat4 gbufferModelViewInverse;');
      checkAndAdd('gbufferProjectionInverse', 'uniform mat4 gbufferProjectionInverse;');
      checkAndAdd('cameraPosition', 'uniform vec3 cameraPosition;');
      checkAndAdd('worldTime', 'uniform int worldTime;');
      checkAndAdd('frameTimeCounter', 'uniform float frameTimeCounter;');
      checkAndAdd('rainStrength', 'uniform float rainStrength;');
      checkAndAdd('sunPosition', 'uniform vec3 sunPosition;');
      checkAndAdd('upPosition', 'uniform vec3 upPosition;');
      checkAndAdd('colortex0', 'uniform sampler2D colortex0;');
      checkAndAdd('depthtex0', 'uniform sampler2D depthtex0;');
      checkAndAdd('texcoord', 'varying vec2 texcoord;');
      checkAndAdd('glColor', 'varying vec4 glColor;');
      checkAndAdd('normal', 'varying vec3 normal;');
      checkAndAdd('worldPosition', 'varying vec3 worldPosition;');

      if (missingDeclarations) {
        processedFsh = missingDeclarations + '\n' + processedFsh;
      }

      const vShader = createShader(gl!, gl!.VERTEX_SHADER, `
        attribute vec3 position;
        attribute vec2 uv;
        attribute vec3 norm;
        attribute vec4 color;

        uniform mat4 gbufferModelView;
        uniform mat4 gbufferProjection;

        varying vec2 texcoord;
        varying vec4 glColor;
        varying vec3 normal;
        varying vec3 worldPosition;

        void main() {
          texcoord = uv;
          glColor = color;
          normal = norm;
          worldPosition = position;
          gl_Position = gbufferProjection * gbufferModelView * vec4(position, 1.0);
        }
      `);

      const fShader = createShader(gl!, gl!.FRAGMENT_SHADER, processedFsh);

      if (vShader && fShader) {
        const prog = gl!.createProgram();
        if (prog) {
          gl!.attachShader(prog, vShader);
          gl!.attachShader(prog, fShader);
          gl!.linkProgram(prog);
          if (gl!.getProgramParameter(prog, gl!.LINK_STATUS)) {
            shaderProgram = prog;
            onCompilationStatus?.(true, 'Live shader successfully running on GPU');
            return;
          }
        }
      }

      // If custom compilation fails, fall back gracefully
      onCompilationStatus?.(false, 'Using fallback shader due to compiler issue');
    }

    compileCustomGlsl(fragmentGlsl);

    // Create 3D Voxel Scene Geometry
    const sceneGeom = buildVoxelScene(gl);

    // Create a 16x16 procedural Minecraft texture atlas (Grass, Dirt, Stone, Wood, Water)
    const atlasTexture = createMinecraftTextureAtlas(gl);

    // Render loop
    function render() {
      if (!gl || !canvas) return;

      // Handle canvas resize
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      const now = performance.now();
      const elapsedSeconds = stateRef.current.isPlaying ? (now - startTime) / 1000 : 0;

      // FPS calculation
      frameCount++;
      if (now - lastFpsTime >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = now;
      }

      // Camera auto-rotation
      if (stateRef.current.autoRotate && stateRef.current.isPlaying) {
        cameraRef.current.yaw += 0.005;
      }

      // Calculate Day/Night Sky & Sun Angle
      const timeOfDay = stateRef.current.worldTime; // 0 to 24000
      const sunAngle = ((timeOfDay - 6000) / 24000) * Math.PI * 2;
      const sunDir: [number, number, number] = [
        Math.cos(sunAngle) * 50.0,
        Math.sin(sunAngle) * 50.0,
        Math.sin(sunAngle * 0.5) * 10.0,
      ];

      // Dynamic Sky background color based on sun height
      const sunHeight = Math.sin(sunAngle);
      let skyColor = [0.1, 0.1, 0.18]; // Night deep blue
      if (sunHeight > 0.3) {
        skyColor = [0.45, 0.68, 0.95]; // Day clear cyan blue
      } else if (sunHeight > -0.1) {
        skyColor = [0.92, 0.45, 0.25]; // Sunset golden orange
      }
      if (stateRef.current.isRaining) {
        skyColor = [0.25, 0.28, 0.35]; // Overcast rain
      }

      gl.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Matrices
      const aspect = canvas.width / (canvas.height || 1);
      const projMatrix = createPerspectiveMatrix(45 * (Math.PI / 180), aspect, 0.1, 100.0);

      // Orbit camera position
      const camDist = cameraRef.current.distance;
      const camYaw = cameraRef.current.yaw;
      const camPitch = cameraRef.current.pitch;
      const camX = camDist * Math.cos(camPitch) * Math.sin(camYaw);
      const camY = camDist * Math.sin(camPitch);
      const camZ = camDist * Math.cos(camPitch) * Math.cos(camYaw);

      const viewMatrix = createLookAtMatrix(
        [camX, camY, camZ],
        cameraRef.current.target,
        [0, 1, 0]
      );

      // Use active shader program (or default fallback)
      const prog = shaderProgram || defaultShaderProgram;
      if (prog) {
        gl.useProgram(prog);

        // Bind attributes
        bindBufferToAttribute(gl, prog, 'position', sceneGeom.posBuffer, 3);
        bindBufferToAttribute(gl, prog, 'uv', sceneGeom.uvBuffer, 2);
        bindBufferToAttribute(gl, prog, 'normal', sceneGeom.normalBuffer, 3);
        bindBufferToAttribute(gl, prog, 'norm', sceneGeom.normalBuffer, 3);
        bindBufferToAttribute(gl, prog, 'color', sceneGeom.colorBuffer, 4);

        // Set Iris standard uniforms
        setUniformMatrix4fv(gl, prog, 'gbufferProjection', projMatrix);
        setUniformMatrix4fv(gl, prog, 'uProjectionMatrix', projMatrix);
        setUniformMatrix4fv(gl, prog, 'gbufferModelView', viewMatrix);
        setUniformMatrix4fv(gl, prog, 'uModelViewMatrix', viewMatrix);

        const invView = invertMatrix4(viewMatrix);
        const invProj = invertMatrix4(projMatrix);
        setUniformMatrix4fv(gl, prog, 'gbufferModelViewInverse', invView);
        setUniformMatrix4fv(gl, prog, 'gbufferProjectionInverse', invProj);

        setUniform3f(gl, prog, 'cameraPosition', camX, camY, camZ);
        setUniform3f(gl, prog, 'sunPosition', sunDir[0], sunDir[1], sunDir[2]);
        setUniform3f(gl, prog, 'upPosition', 0.0, 1.0, 0.0);

        setUniform1f(gl, prog, 'frameTimeCounter', elapsedSeconds);
        setUniform1i(gl, prog, 'worldTime', timeOfDay);
        setUniform1f(gl, prog, 'rainStrength', stateRef.current.isRaining ? 1.0 : 0.0);

        // Bind colortex0 texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
        setUniform1i(gl, prog, 'colortex0', 0);

        // Draw voxel terrain
        gl.drawArrays(gl.TRIANGLES, 0, sceneGeom.vertexCount);
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (shaderProgram) gl.deleteProgram(shaderProgram);
      if (defaultShaderProgram) gl.deleteProgram(defaultShaderProgram);
      sceneGeom.cleanup(gl);
    };
  }, [fragmentGlsl]);

  // Mouse Orbit controls
  const handleMouseDown = (e: React.MouseEvent) => {
    cameraRef.current.isDragging = true;
    cameraRef.current.lastX = e.clientX;
    cameraRef.current.lastY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cameraRef.current.isDragging) return;
    const dx = e.clientX - cameraRef.current.lastX;
    const dy = e.clientY - cameraRef.current.lastY;

    cameraRef.current.yaw += dx * 0.008;
    cameraRef.current.pitch = Math.max(-1.4, Math.min(1.4, cameraRef.current.pitch + dy * 0.008));

    cameraRef.current.lastX = e.clientX;
    cameraRef.current.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraRef.current.distance = Math.max(4, Math.min(32, cameraRef.current.distance + e.deltaY * 0.02));
  };

  // Touch controls for mobile / tablet
  const touchStartDistRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      cameraRef.current.isDragging = true;
      cameraRef.current.lastX = e.touches[0].clientX;
      cameraRef.current.lastY = e.touches[0].clientY;
      touchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      cameraRef.current.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && cameraRef.current.isDragging) {
      const dx = e.touches[0].clientX - cameraRef.current.lastX;
      const dy = e.touches[0].clientY - cameraRef.current.lastY;
      cameraRef.current.yaw += dx * 0.008;
      cameraRef.current.pitch = Math.max(-1.4, Math.min(1.4, cameraRef.current.pitch + dy * 0.008));
      cameraRef.current.lastX = e.touches[0].clientX;
      cameraRef.current.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = touchStartDistRef.current - currentDist;
      cameraRef.current.distance = Math.max(4, Math.min(32, cameraRef.current.distance + diff * 0.05));
      touchStartDistRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    cameraRef.current.isDragging = false;
    touchStartDistRef.current = null;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl select-none"
    >
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 z-10 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            Iris 3D Preview
          </span>
          <span className="text-neutral-500">·</span>
          <span className="font-mono text-[11px] text-emerald-400 tabular-nums">
            {fps} FPS
          </span>
        </div>

        {/* Scene controls */}
        <div className="flex items-center gap-1.5">
          {/* Time of Day Button */}
          <button
            onClick={() => setWorldTime(t => (t + 6000) % 24000)}
            title="Toggle Time of Day (Sunrise -> Noon -> Sunset -> Midnight)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            {worldTime >= 13000 ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-mono text-[11px] tabular-nums">
              {worldTime === 6000 ? 'Noon' : worldTime === 12000 ? 'Sunset' : worldTime === 18000 ? 'Night' : 'Sunrise'}
            </span>
          </button>

          {/* Weather Toggle */}
          <button
            onClick={() => setIsRaining(r => !r)}
            title="Toggle Rain Storm"
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              isRaining ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>{isRaining ? 'Rainy' : 'Clear'}</span>
          </button>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(r => !r)}
            title="Toggle Camera Orbit"
            className={`p-1.5 rounded transition-colors ${
              autoRotate ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Animation */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            title="Play / Pause Shader Clock"
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Expand Fullscreen"
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive 3D Canvas */}
      <div 
        className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block"
        />

        {/* Orbit Helper Tip */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 pointer-events-none text-[11px] text-neutral-400/80 bg-neutral-900/60 backdrop-blur-sm px-2.5 py-1 rounded border border-neutral-800/40">
          <Compass className="w-3 h-3 text-emerald-400/80" />
          <span>Drag to orbit · Scroll to zoom</span>
        </div>

        {/* Time slider quick control bar */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
          <span className="text-[11px] text-neutral-400 font-medium">World Time</span>
          <input
            type="range"
            min="0"
            max="24000"
            step="500"
            value={worldTime}
            onChange={(e) => setWorldTime(Number(e.target.value))}
            className="w-24 accent-emerald-500 h-1 bg-neutral-700 rounded cursor-pointer"
          />
          <span className="font-mono text-[11px] text-neutral-300 tabular-nums w-12 text-right">
            {worldTime}t
          </span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Matrix Math & WebGL Geometry Helpers
// -------------------------------------------------------------

function setUniform1f(gl: WebGLRenderingContext, prog: WebGLProgram, name: string, val: number) {
  const loc = gl.getUniformLocation(prog, name);
  if (loc) gl.uniform1f(loc, val);
}

function setUniform1i(gl: WebGLRenderingContext, prog: WebGLProgram, name: string, val: number) {
  const loc = gl.getUniformLocation(prog, name);
  if (loc) gl.uniform1i(loc, val);
}

function setUniform3f(gl: WebGLRenderingContext, prog: WebGLProgram, name: string, x: number, y: number, z: number) {
  const loc = gl.getUniformLocation(prog, name);
  if (loc) gl.uniform3f(loc, x, y, z);
}

function setUniformMatrix4fv(gl: WebGLRenderingContext, prog: WebGLProgram, name: string, mat: Float32Array) {
  const loc = gl.getUniformLocation(prog, name);
  if (loc) gl.uniformMatrix4fv(loc, false, mat);
}

function bindBufferToAttribute(
  gl: WebGLRenderingContext,
  prog: WebGLProgram,
  name: string,
  buffer: WebGLBuffer | null,
  size: number
) {
  if (!buffer) return;
  const loc = gl.getAttribLocation(prog, name);
  if (loc === -1) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

function createPerspectiveMatrix(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const out = new Float32Array(16);
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function createLookAtMatrix(
  eye: [number, number, number],
  center: [number, number, number],
  up: [number, number, number]
): Float32Array {
  const out = new Float32Array(16);
  let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;

  let eyex = eye[0], eyey = eye[1], eyez = eye[2];
  let upx = up[0], upy = up[1], upz = up[2];
  let centerx = center[0], centery = center[1], centerz = center[2];

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len; z1 *= len; z2 *= len;

  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = 1 / Math.hypot(x0, x1, x2);
  x0 *= len; x1 *= len; x2 *= len;

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;

  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

function invertMatrix4(a: Float32Array): Float32Array {
  const out = new Float32Array(16);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
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

/**
 * Builds a Minecraft Voxel Island with grass blocks, oak tree, dirt cliff, water pond, and flowers
 */
function buildVoxelScene(gl: WebGLRenderingContext) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  function addCube(
    x: number, y: number, z: number,
    colorTop: [number, number, number, number],
    colorSide: [number, number, number, number],
    colorBottom: [number, number, number, number]
  ) {
    const s = 0.5;
    const px = x, py = y, pz = z;

    // 6 faces: [normalX, normalY, normalZ, vertices[4], color]
    const faces = [
      // Top (+Y)
      {
        norm: [0, 1, 0],
        v: [
          [px - s, py + s, pz + s],
          [px + s, py + s, pz + s],
          [px + s, py + s, pz - s],
          [px - s, py + s, pz - s],
        ],
        col: colorTop,
      },
      // Bottom (-Y)
      {
        norm: [0, -1, 0],
        v: [
          [px - s, py - s, pz - s],
          [px + s, py - s, pz - s],
          [px + s, py - s, pz + s],
          [px - s, py - s, pz + s],
        ],
        col: colorBottom,
      },
      // Front (+Z)
      {
        norm: [0, 0, 1],
        v: [
          [px - s, py - s, pz + s],
          [px + s, py - s, pz + s],
          [px + s, py + s, pz + s],
          [px - s, py + s, pz + s],
        ],
        col: colorSide,
      },
      // Back (-Z)
      {
        norm: [0, 0, -1],
        v: [
          [px + s, py - s, pz - s],
          [px - s, py - s, pz - s],
          [px - s, py + s, pz - s],
          [px + s, py + s, pz - s],
        ],
        col: colorSide,
      },
      // Right (+X)
      {
        norm: [1, 0, 0],
        v: [
          [px + s, py - s, pz + s],
          [px + s, py - s, pz - s],
          [px + s, py + s, pz - s],
          [px + s, py + s, pz + s],
        ],
        col: colorSide,
      },
      // Left (-X)
      {
        norm: [-1, 0, 0],
        v: [
          [px - s, py - s, pz - s],
          [px - s, py - s, pz + s],
          [px - s, py + s, pz + s],
          [px - s, py + s, pz - s],
        ],
        col: colorSide,
      },
    ];

    for (const f of faces) {
      // 2 Triangles per quad
      const indices = [0, 1, 2, 0, 2, 3];
      const quadUvs = [
        [0, 0], [1, 0], [1, 1], [0, 1]
      ];

      for (const i of indices) {
        positions.push(f.v[i][0], f.v[i][1], f.v[i][2]);
        normals.push(f.norm[0], f.norm[1], f.norm[2]);
        uvs.push(quadUvs[i][0], quadUvs[i][1]);
        colors.push(f.col[0], f.col[1], f.col[2], f.col[3]);
      }
    }
  }

  // Minecraft Block Palette Colors
  const grassTop: [number, number, number, number] = [0.36, 0.65, 0.22, 1.0]; // Lush green
  const grassSide: [number, number, number, number] = [0.48, 0.35, 0.22, 1.0]; // Dirt side with grass rim
  const dirt: [number, number, number, number] = [0.52, 0.38, 0.24, 1.0];
  const stone: [number, number, number, number] = [0.50, 0.50, 0.52, 1.0];
  const oakLog: [number, number, number, number] = [0.42, 0.30, 0.18, 1.0];
  const oakLeaves: [number, number, number, number] = [0.28, 0.58, 0.18, 0.95];
  const waterBlock: [number, number, number, number] = [0.18, 0.52, 0.88, 0.75];
  const flowerRed: [number, number, number, number] = [0.88, 0.18, 0.18, 1.0];

  // Ground platform (7x7 voxels)
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      // Create a pond in corner
      if (x >= 1 && z >= 1) {
        addCube(x, -1, z, dirt, dirt, dirt);
        addCube(x, 0, z, waterBlock, waterBlock, waterBlock);
      } else {
        addCube(x, -2, z, stone, stone, stone);
        addCube(x, -1, z, dirt, dirt, dirt);
        addCube(x, 0, z, grassTop, grassSide, dirt);
      }
    }
  }

  // Oak Tree (at -1, 0, -1)
  const treeX = -1;
  const treeZ = -1;
  addCube(treeX, 1, treeZ, oakLog, oakLog, oakLog);
  addCube(treeX, 2, treeZ, oakLog, oakLog, oakLog);
  addCube(treeX, 3, treeZ, oakLog, oakLog, oakLog);

  // Leaves Crown
  for (let lx = -1; lx <= 1; lx++) {
    for (let lz = -1; lz <= 1; lz++) {
      for (let ly = 3; ly <= 4; ly++) {
        if (lx === 0 && lz === 0 && ly === 3) continue; // tree trunk
        addCube(treeX + lx, ly, treeZ + lz, oakLeaves, oakLeaves, oakLeaves);
      }
    }
  }
  addCube(treeX, 5, treeZ, oakLeaves, oakLeaves, oakLeaves);

  // Red flower block
  addCube(-2, 1, 1, flowerRed, flowerRed, flowerRed);

  // Create WebGL Buffers
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    posBuffer,
    uvBuffer,
    normalBuffer,
    colorBuffer,
    vertexCount: positions.length / 3,
    cleanup: (ctx: WebGLRenderingContext) => {
      ctx.deleteBuffer(posBuffer);
      ctx.deleteBuffer(uvBuffer);
      ctx.deleteBuffer(normalBuffer);
      ctx.deleteBuffer(colorBuffer);
    },
  };
}

/**
 * Creates a procedural 32x32 pixel texture representing subtle Minecraft pixel noise
 */
function createMinecraftTextureAtlas(gl: WebGLRenderingContext): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;

  const size = 32;
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Pixel grain noise
      const noise = (Math.sin(x * 12.3 + y * 45.6) * 43758.5453) % 1;
      const grain = 240 + Math.floor(noise * 15);

      pixels[idx] = grain;
      pixels[idx + 1] = grain;
      pixels[idx + 2] = grain;
      pixels[idx + 3] = 255;
    }
  }

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  return tex;
}
