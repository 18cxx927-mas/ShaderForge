/**
 * Live GLSL Shader Compiler & Diagnostic Engine
 * Runs real WebGL compilation tests in the browser and parses shader log messages.
 */

import { CompilerDiagnostic, CompilationResult } from '../types/shader';

let sharedGlContext: WebGLRenderingContext | null = null;

function getSharedGlContext(): WebGLRenderingContext | null {
  if (sharedGlContext) return sharedGlContext;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false }) ||
               (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (gl) {
      sharedGlContext = gl;
    }
  } catch (err) {
    console.warn('WebGL not available for offline syntax compilation check:', err);
  }
  return sharedGlContext;
}

/**
 * Validates fragment shader code with WebGL and returns real diagnostic errors
 */
export function compileAndDiagnoseGlsl(glslSource: string): CompilationResult {
  const startTime = performance.now();
  const diagnostics: CompilerDiagnostic[] = [];

  // Iris pre-validation rules for beginners
  preValidateIrisRules(glslSource, diagnostics);

  const gl = getSharedGlContext();
  if (!gl) {
    return {
      success: diagnostics.filter(d => d.severity === 'error').length === 0,
      diagnostics,
      compileTimeMs: Math.round(performance.now() - startTime),
      glslCode: glslSource,
    };
  }

  // Pre-process source for WebGL 1.0 test context
  // Convert Iris compatibility profile syntax (#version 120 / 330 compatibility) to standard WebGL if needed
  const testSource = prepareSourceForTest(glslSource);

  const shader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!shader) {
    return {
      success: true,
      diagnostics,
      compileTimeMs: Math.round(performance.now() - startTime),
      glslCode: glslSource,
    };
  }

  gl.shaderSource(shader, testSource);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const infoLog = gl.getShaderInfoLog(shader) || '';
    parseGlslInfoLog(infoLog, glslSource, diagnostics);
  }

  gl.deleteShader(shader);

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const compileTimeMs = Math.round(performance.now() - startTime);

  return {
    success: errorCount === 0,
    diagnostics,
    compileTimeMs,
    glslCode: glslSource,
  };
}

/**
 * Parses WebGL error log strings like:
 * "ERROR: 0:42: 'foo' : undeclared identifier"
 * or "WARNING: 0:12: implicit cast"
 */
function parseGlslInfoLog(log: string, source: string, diagnostics: CompilerDiagnostic[]) {
  const lines = log.split('\n');
  const sourceLines = source.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern: ERROR: 0:LINE: message or ERROR: LINE:COL: message
    const match = trimmed.match(/(ERROR|WARNING):\s*(\d+)?:?(\d+):(.*)/i);
    if (match) {
      const severity = match[1].toUpperCase() === 'WARNING' ? 'warning' : 'error';
      // If two numbers, second is usually the line number in WebGL (0:linenumber)
      let lineNum = parseInt(match[3], 10);
      if (isNaN(lineNum) && match[2]) {
        lineNum = parseInt(match[2], 10);
      }
      if (isNaN(lineNum)) lineNum = 1;

      // Adjust for test wrappers if needed
      const rawMessage = match[4]?.trim() || trimmed;
      const snippet = sourceLines[lineNum - 1] || '';

      // Create human friendly advice
      const suggestion = getHelpfulSuggestion(rawMessage, snippet);

      diagnostics.push({
        line: lineNum,
        message: cleanGlslErrorMessage(rawMessage),
        severity,
        snippet: snippet.trim(),
        suggestion,
      });
    } else {
      // General message
      diagnostics.push({
        line: 1,
        message: trimmed,
        severity: 'error',
      });
    }
  }
}

/**
 * Common beginner errors with easy friendly solutions
 */
function getHelpfulSuggestion(message: string, snippet: string): string | undefined {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('float') && (lowerMsg.includes('int') || lowerMsg.includes('type mismatch') || lowerMsg.includes('cannot convert'))) {
    return 'GLSL requires explicit decimals for floats. Try writing "1.0" or "0.0" instead of "1" or "0".';
  }
  if (lowerMsg.includes('undeclared identifier')) {
    const idMatch = message.match(/'([^']+)'/);
    const identifier = idMatch ? idMatch[1] : 'variable';
    return `"${identifier}" has not been declared. Make sure you typed the name correctly or defined it above.`;
  }
  if (lowerMsg.includes('syntax error') || lowerMsg.includes('unexpected')) {
    if (!snippet.endsWith(';') && !snippet.endsWith('{') && !snippet.endsWith('}')) {
      return 'Check if you forgot a semicolon ";" at the end of this line.';
    }
    return 'Check for unclosed parentheses "()", missing commas, or mismatched brackets "{}".';
  }
  if (lowerMsg.includes('too many arguments') || lowerMsg.includes('too few arguments')) {
    return 'The function call has the wrong number of inputs. Check Iris docs or GLSL built-in parameters.';
  }
  return undefined;
}

function cleanGlslErrorMessage(raw: string): string {
  // Strip redundant compiler prefixes
  return raw.replace(/^'[^']+'\s*:\s*/, '').trim() || raw;
}

/**
 * Pre-validates Iris-specific conventions and gives friendly warnings
 */
function preValidateIrisRules(source: string, diagnostics: CompilerDiagnostic[]) {
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Check for integer assigned to float without decimal
    // e.g. float x = 2; or vec3 c = vec3(1);
    if (/float\s+[a-zA-Z0-9_]+\s*=\s*\d+;/.test(trimmed)) {
      diagnostics.push({
        line: lineNum,
        message: 'Strict GLSL: Integer assigned to float without decimal point.',
        severity: 'warning',
        snippet: trimmed,
        suggestion: 'Change integer numbers to floats (e.g., replace "2;" with "2.0;").',
      });
    }

    // Check for lowercase vec names or typo
    if (/\b(Vec2|Vec3|Vec4|Float)\b/.test(trimmed)) {
      diagnostics.push({
        line: lineNum,
        message: 'GLSL types must be lowercase: use vec2, vec3, vec4, or float.',
        severity: 'error',
        snippet: trimmed,
        suggestion: 'Convert uppercase type to lowercase.',
      });
    }
  });
}

/**
 * Prepares the Iris GLSL source for test compilation in standard WebGL 1
 */
function prepareSourceForTest(source: string): string {
  let cleaned = source;

  // Replace #version 330 or #version 120 compatibility with WebGL precision headers
  cleaned = cleaned.replace(/#version\s+\d+(\s+compatibility)?/g, '// Iris version header');

  // Insert precision if missing
  if (!cleaned.includes('precision highp float;') && !cleaned.includes('precision mediump float;')) {
    cleaned = 'precision mediump float;\n' + cleaned;
  }

  // Provide dummy declarations for Iris uniforms if they are used without definitions in test
  const irisUniformStubs = `
uniform mat4 gbufferModelView;
uniform mat4 gbufferProjection;
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferProjectionInverse;
uniform vec3 cameraPosition;
uniform int worldTime;
uniform float frameTimeCounter;
uniform float rainStrength;
uniform vec3 sunPosition;
uniform vec3 upPosition;
uniform sampler2D colortex0;
uniform sampler2D depthtex0;
`;

  // Only prepend stubs if not already declared in code
  if (!source.includes('frameTimeCounter')) {
    cleaned = irisUniformStubs + '\n' + cleaned;
  }

  // Ensure main() exists if missing
  if (!cleaned.includes('void main()')) {
    cleaned += '\nvoid main() { gl_FragColor = vec4(1.0); }';
  }

  return cleaned;
}
