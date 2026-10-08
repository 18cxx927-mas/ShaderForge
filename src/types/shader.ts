/**
 * Minecraft Iris Shader Studio - Type Definitions
 */

export type PortDataType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'sampler2D' | 'bool';

export interface NodePort {
  id: string;
  name: string;
  type: PortDataType;
  defaultValue?: any;
  value?: any; // When port has an inline constant value
}

export type NodeCategory = 
  | 'input' 
  | 'color' 
  | 'effects' 
  | 'math' 
  | 'lighting' 
  | 'procedural' 
  | 'custom'
  | 'output';

export interface ShaderNode {
  id: string;
  name: string;
  category: NodeCategory;
  description: string;
  x: number;
  y: number;
  inputs: NodePort[];
  outputs: NodePort[];
  customCode?: string; // For custom expression/formula nodes
  previewThumbnail?: string;
  defaultData?: Record<string, any>;
  data?: Record<string, any>; // custom params like color hex, slider value, operator
}

export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface CompilerDiagnostic {
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  snippet?: string;
  suggestion?: string;
}

export interface CompilationResult {
  success: boolean;
  diagnostics: CompilerDiagnostic[];
  compileTimeMs: number;
  glslCode: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string; // e.g. "shaders/gbuffers_terrain.fsh"
  isDirectory: boolean;
  content: string;
  fileType: 'fragment_shader' | 'vertex_shader' | 'glsl_include' | 'properties' | 'lang' | 'other';
  nodes?: ShaderNode[];
  connections?: NodeConnection[];
  editorMode?: 'visual' | 'code' | 'split';
  parentId?: string;
  isProtected?: boolean; // Core files that shouldn't be deleted accidentally
}

export interface ShaderpackMetadata {
  name: string;
  author: string;
  version: string;
  description: string;
  targetMinecraft: string; // "1.21+"
  targetLoader: string; // "Fabric + Iris"
  enableWavingLeaves: boolean;
  enableDynamicWater: boolean;
  enableGodRays: boolean;
  enableBloom: boolean;
  saturationBoost: number;
}

export interface PresetTemplate {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  previewColor: string;
  nodes: ShaderNode[];
  connections: NodeConnection[];
  customGlsl?: string;
  metadata: Partial<ShaderpackMetadata>;
}
