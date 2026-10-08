/**
 * Minecraft Iris Shader Studio - Main Application
 * Multi-File Project Explorer + Visual Node Scripting + GLSL Code Editor + Real-time 3D WebGL Preview.
 * Fully responsive: adapts layout for mobile, tablet, laptop, and desktop displays.
 * Integrated Undo/Redo State Management & 1-Click Minecraft Shaderpack .ZIP Exporter.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShaderNode, 
  NodeConnection, 
  CompilerDiagnostic, 
  ShaderpackMetadata, 
  PresetTemplate,
  ProjectFile 
} from './types/shader';
import { SHADER_PRESETS } from './utils/shaderTemplates';
import { generateGlslFromNodes } from './utils/nodeGraphToGlsl';
import { compileAndDiagnoseGlsl } from './utils/glslCompiler';
import { VisualNodeCanvas } from './components/VisualNodeCanvas';
import { GlslCodeEditor } from './components/GlslCodeEditor';
import { RealtimeShaderPreview } from './components/RealtimeShaderPreview';
import { CompilerDiagnostics } from './components/CompilerDiagnostics';
import { ProjectFileExplorer } from './components/ProjectFileExplorer';
import { IrisDocsModal } from './components/IrisDocsModal';
import { ExportModal } from './components/ExportModal';
import { useHistoryManager } from './utils/useHistoryManager';
import { downloadShaderpackZipDirectly } from './utils/zipExporter';
import { exportVisualEditorHtml, exportCodeEditorHtml, exportCompleteStudioHtml } from './utils/htmlExporters';
import { 
  Boxes, 
  Code2, 
  LayoutGrid, 
  Download, 
  BookOpen, 
  Sparkles, 
  ChevronDown,
  FileCode,
  Eye,
  Folder,
  FolderArchive,
  Undo2,
  Redo2,
  CheckCircle2,
  Sliders,
  Loader2
} from 'lucide-react';

export default function App() {
  const defaultPreset = SHADER_PRESETS[0];

  // Initial Project Files Setup (Minecraft 1.21+ Fabric Iris Standard)
  const initialGeneratedGlsl = generateGlslFromNodes(defaultPreset.nodes, defaultPreset.connections);

  const initialFiles: ProjectFile[] = [
    {
      id: 'f_terrain_fsh',
      name: 'gbuffers_terrain.fsh',
      path: 'shaders/gbuffers_terrain.fsh',
      isDirectory: false,
      fileType: 'fragment_shader',
      content: initialGeneratedGlsl,
      nodes: defaultPreset.nodes,
      connections: defaultPreset.connections,
      editorMode: 'visual',
      isProtected: true,
    },
    {
      id: 'f_terrain_vsh',
      name: 'gbuffers_terrain.vsh',
      path: 'shaders/gbuffers_terrain.vsh',
      isDirectory: false,
      fileType: 'vertex_shader',
      content: `#version 330 compatibility\n\nuniform mat4 gbufferModelView;\nuniform mat4 gbufferProjection;\nuniform float frameTimeCounter;\n\nvarying vec2 texcoord;\nvarying vec4 glColor;\nvarying vec3 normal;\nvarying vec3 worldPosition;\n\nvoid main() {\n    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;\n    glColor = gl_Color;\n    normal = gl_NormalMatrix * gl_Normal;\n    vec4 viewPos = gl_ModelViewMatrix * gl_Vertex;\n    worldPosition = viewPos.xyz;\n    gl_Position = gl_ProjectionMatrix * viewPos;\n}\n`,
      isProtected: true,
    },
    {
      id: 'f_water_fsh',
      name: 'gbuffers_water.fsh',
      path: 'shaders/gbuffers_water.fsh',
      isDirectory: false,
      fileType: 'fragment_shader',
      content: `#version 330 compatibility\n\nuniform sampler2D colortex0;\nuniform float frameTimeCounter;\nvarying vec2 texcoord;\nvarying vec4 glColor;\n\nvoid main() {\n    vec4 baseColor = texture2D(colortex0, texcoord) * glColor;\n    float wave = sin(texcoord.x * 25.0 + frameTimeCounter * 2.0) * 0.05;\n    vec3 waterTint = vec3(0.12, 0.45, 0.85);\n    gl_FragColor = vec4(mix(baseColor.rgb, waterTint, 0.4) + vec3(wave), 0.8);\n}\n`,
      editorMode: 'code',
      isProtected: true,
    },
    {
      id: 'f_composite_fsh',
      name: 'composite.fsh',
      path: 'shaders/composite.fsh',
      isDirectory: false,
      fileType: 'fragment_shader',
      content: `#version 330 compatibility\n\nuniform sampler2D colortex0;\nvarying vec2 texcoord;\n\nvoid main() {\n    gl_FragColor = texture2D(colortex0, texcoord);\n}\n`,
      isProtected: true,
    },
    {
      id: 'f_final_fsh',
      name: 'final.fsh',
      path: 'shaders/final.fsh',
      isDirectory: false,
      fileType: 'fragment_shader',
      content: `#version 330 compatibility\n\nuniform sampler2D colortex0;\nvarying vec2 texcoord;\n\nvoid main() {\n    vec3 color = texture2D(colortex0, texcoord).rgb;\n    gl_FragColor = vec4(color, 1.0);\n}\n`,
      isProtected: true,
    },
    {
      id: 'f_properties',
      name: 'shaders.properties',
      path: 'shaders/shaders.properties',
      isDirectory: false,
      fileType: 'properties',
      content: `screen.main = WAVING_LEAVES DYNAMIC_WATER GOD_RAYS BLOOM_EFFECT SATURATION_BOOST\n\nWAVING_LEAVES = true\nDYNAMIC_WATER = true\nGOD_RAYS = true\nBLOOM_EFFECT = true\nSATURATION_BOOST = 1.20\n`,
      isProtected: true,
    },
    {
      id: 'f_lang',
      name: 'en_us.lang',
      path: 'shaders/lang/en_us.lang',
      isDirectory: false,
      fileType: 'lang',
      content: `option.WAVING_LEAVES = Waving Foliage\noption.DYNAMIC_WATER = Crystal Water\noption.GOD_RAYS = Sun Rays\noption.BLOOM_EFFECT = Radiant Bloom\noption.SATURATION_BOOST = Saturation Boost\n`,
      isProtected: true,
    },
    {
      id: 'f_include_lighting',
      name: 'lighting.glsl',
      path: 'shaders/include/lighting.glsl',
      isDirectory: false,
      fileType: 'glsl_include',
      content: `// Reusable Lighting Helper for Iris\nvec3 calculateSunlight(vec3 normal, vec3 sunDir, vec3 sunColor) {\n    float NdotL = max(dot(normal, sunDir), 0.0);\n    return sunColor * NdotL;\n}\n`,
      isProtected: false,
    },
  ];

  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState<string>('f_terrain_fsh');
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(true);

  // Active file helper
  const activeFile = useMemo(() => {
    return files.find(f => f.id === activeFileId) || files[0];
  }, [files, activeFileId]);

  // Visual Nodes state (loaded from active file or fallback)
  const [nodes, setNodes] = useState<ShaderNode[]>(activeFile.nodes || defaultPreset.nodes);
  const [connections, setConnections] = useState<NodeConnection[]>(activeFile.connections || defaultPreset.connections);

  // Active View Mode: 'nodes' | 'code' | 'split'
  const isShaderFile = activeFile.name.endsWith('.fsh') || activeFile.name.endsWith('.vsh');
  const [viewMode, setViewMode] = useState<'nodes' | 'code' | 'split'>('nodes');
  const [isManualCodeMode, setIsManualCodeMode] = useState<boolean>(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState<boolean>(false);

  // Mobile/Tablet responsive screen state: 'nodes' | 'code' | 'preview' | 'files'
  const [mobileTab, setMobileTab] = useState<'nodes' | 'code' | 'preview' | 'files'>('nodes');

  // Preset Selection State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState<boolean>(false);

  // Compilation Diagnostics
  const [diagnostics, setDiagnostics] = useState<CompilerDiagnostic[]>([]);
  const [compileTimeMs, setCompileTimeMs] = useState<number>(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // Shaderpack Metadata
  const [metadata, setMetadata] = useState<ShaderpackMetadata>({
    name: 'SuperNova_Iris',
    author: 'MinecraftCreator',
    version: '1.0.0',
    description: 'Custom Iris Shaderpack for Minecraft 1.21+ Java Edition',
    targetMinecraft: '1.21+',
    targetLoader: 'Fabric / Quilt + Iris',
    enableWavingLeaves: true,
    enableDynamicWater: true,
    enableGodRays: true,
    enableBloom: true,
    saturationBoost: 1.2,
  });

  // Modals & Menus
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  // ZIP Download status & Feedback
  const [isExportingZipDirectly, setIsExportingZipDirectly] = useState<boolean>(false);
  const [zipToast, setZipToast] = useState<string | null>(null);

  // Undo / Redo History Manager
  const history = useHistoryManager({
    files: initialFiles,
    nodes: defaultPreset.nodes,
    connections: defaultPreset.connections,
    activeFileId: 'f_terrain_fsh',
    isManualCodeMode: false,
  });

  // Undo / Redo Execution
  const handleUndo = useCallback(() => {
    history.undo(snapshot => {
      setFiles(snapshot.files);
      setNodes(snapshot.nodes);
      setConnections(snapshot.connections);
      setActiveFileId(snapshot.activeFileId);
      setIsManualCodeMode(snapshot.isManualCodeMode);
    });
  }, [history]);

  const handleRedo = useCallback(() => {
    history.redo(snapshot => {
      setFiles(snapshot.files);
      setNodes(snapshot.nodes);
      setConnections(snapshot.connections);
      setActiveFileId(snapshot.activeFileId);
      setIsManualCodeMode(snapshot.isManualCodeMode);
    });
  }, [history]);

  // Global Keyboard Shortcuts for Undo & Redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is focused inside an input/textarea
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (history.canUndo) {
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'y' || e.key === 'Y')
      ) {
        e.preventDefault();
        if (history.canRedo) {
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [history.canUndo, history.canRedo, handleUndo, handleRedo]);

  // When changing active file, sync editor states
  const handleSelectFile = (fileId: string) => {
    const targetFile = files.find(f => f.id === fileId);
    if (!targetFile) return;

    setActiveFileId(fileId);

    if (targetFile.nodes && targetFile.connections) {
      setNodes(targetFile.nodes);
      setConnections(targetFile.connections);
    }

    if (!targetFile.name.endsWith('.fsh') && !targetFile.name.endsWith('.vsh')) {
      setViewMode('code');
      setMobileTab('code');
    } else {
      setMobileTab('nodes');
    }
  };

  // Synchronize Node Graph changes into the active file's content
  const handleNodesChange = (newNodes: ShaderNode[], actionDescription?: string) => {
    setNodes(newNodes);
    let updatedFiles = files;
    if (!isManualCodeMode && (activeFile.name.endsWith('.fsh') || activeFile.name.endsWith('.vsh'))) {
      const newGlsl = generateGlslFromNodes(newNodes, connections);
      updatedFiles = files.map(f =>
        f.id === activeFileId
          ? { ...f, content: newGlsl, nodes: newNodes, connections }
          : f
      );
      setFiles(updatedFiles);
    }
    history.pushState(
      {
        files: updatedFiles,
        nodes: newNodes,
        connections,
        activeFileId,
        isManualCodeMode,
      },
      actionDescription || 'Update Visual Nodes',
      false
    );
  };

  const handleConnectionsChange = (newConns: NodeConnection[], actionDescription?: string) => {
    setConnections(newConns);
    let updatedFiles = files;
    if (!isManualCodeMode && (activeFile.name.endsWith('.fsh') || activeFile.name.endsWith('.vsh'))) {
      const newGlsl = generateGlslFromNodes(nodes, newConns);
      updatedFiles = files.map(f =>
        f.id === activeFileId
          ? { ...f, content: newGlsl, nodes, connections: newConns }
          : f
      );
      setFiles(updatedFiles);
    }
    history.pushState(
      {
        files: updatedFiles,
        nodes,
        connections: newConns,
        activeFileId,
        isManualCodeMode,
      },
      actionDescription || 'Update Socket Wires',
      false
    );
  };

  // Handle direct code edits in GLSL Editor
  const handleCodeChange = (newCode: string, isDebounced: boolean = true, actionDescription: string = 'Edit GLSL Code') => {
    const updatedFiles = files.map(f => (f.id === activeFileId ? { ...f, content: newCode } : f));
    setFiles(updatedFiles);
    history.pushState(
      {
        files: updatedFiles,
        nodes,
        connections,
        activeFileId,
        isManualCodeMode: true,
      },
      actionDescription,
      isDebounced
    );
  };

  // Reset code to visual node output
  const handleResetToNodes = () => {
    setIsManualCodeMode(false);
    const newGlsl = generateGlslFromNodes(nodes, connections);
    const updatedFiles = files.map(f => (f.id === activeFileId ? { ...f, content: newGlsl } : f));
    setFiles(updatedFiles);
    history.pushState(
      {
        files: updatedFiles,
        nodes,
        connections,
        activeFileId,
        isManualCodeMode: false,
      },
      'Reset to Visual Nodes',
      false
    );
  };

  // Run live compiler diagnostics whenever the active file content changes
  useEffect(() => {
    if (activeFile.content && (activeFile.name.endsWith('.fsh') || activeFile.name.endsWith('.vsh') || activeFile.name.endsWith('.glsl'))) {
      const result = compileAndDiagnoseGlsl(activeFile.content);
      setDiagnostics(result.diagnostics);
      setCompileTimeMs(result.compileTimeMs);
    } else {
      setDiagnostics([]);
      setCompileTimeMs(0);
    }
  }, [activeFile.content, activeFile.name]);

  // File System Handlers
  const handleCreateFile = (name: string, folderPath: string, fileType: ProjectFile['fileType']) => {
    const fullPath = `${folderPath}/${name}`;
    const newId = `file_${Date.now()}`;
    const defaultContent = 
      fileType === 'fragment_shader' 
        ? `#version 330 compatibility\n\nuniform sampler2D colortex0;\nvarying vec2 texcoord;\n\nvoid main() {\n    gl_FragColor = texture2D(colortex0, texcoord);\n}\n`
        : fileType === 'vertex_shader'
        ? `#version 330 compatibility\nvarying vec2 texcoord;\n\nvoid main() {\n    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;\n    gl_Position = ftransform();\n}\n`
        : `# Configuration file\n`;

    const newFile: ProjectFile = {
      id: newId,
      name,
      path: fullPath,
      isDirectory: false,
      fileType,
      content: defaultContent,
      editorMode: 'code',
      isProtected: false,
    };

    const updated = [...files, newFile];
    setFiles(updated);
    setActiveFileId(newId);
    setMobileTab('code');
    history.pushState(
      {
        files: updated,
        nodes,
        connections,
        activeFileId: newId,
        isManualCodeMode,
      },
      `Create File: ${name}`,
      false
    );
  };

  const handleCreateFolder = (folderPath: string) => {
    handleCreateFile('readme.txt', folderPath, 'other');
  };

  const handleDeleteFile = (fileId: string) => {
    const remaining = files.filter(f => f.id !== fileId);
    setFiles(remaining);
    const nextActive = activeFileId === fileId ? remaining[0]?.id || 'f_terrain_fsh' : activeFileId;
    setActiveFileId(nextActive);
    history.pushState(
      {
        files: remaining,
        nodes,
        connections,
        activeFileId: nextActive,
        isManualCodeMode,
      },
      'Delete File',
      false
    );
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    const updated = files.map(f => {
      if (f.id !== fileId) return f;
      const parts = f.path.split('/');
      parts.pop();
      const newPath = [...parts, newName].join('/');
      return {
        ...f,
        name: newName,
        path: newPath,
      };
    });
    setFiles(updated);
    history.pushState(
      {
        files: updated,
        nodes,
        connections,
        activeFileId,
        isManualCodeMode,
      },
      `Rename File: ${newName}`,
      false
    );
  };

  // Load a Preset
  const handleSelectPreset = (preset: PresetTemplate) => {
    setSelectedPresetId(preset.id);
    const newGlsl = generateGlslFromNodes(preset.nodes, preset.connections);
    const clonedNodes = JSON.parse(JSON.stringify(preset.nodes));
    const clonedConnections = JSON.parse(JSON.stringify(preset.connections));

    setNodes(clonedNodes);
    setConnections(clonedConnections);
    setIsManualCodeMode(false);

    // Update main terrain fragment shader file
    const updatedFiles = files.map(f =>
      f.id === 'f_terrain_fsh'
        ? {
            ...f,
            content: newGlsl,
            nodes: clonedNodes,
            connections: clonedConnections,
          }
        : f
    );
    setFiles(updatedFiles);
    setActiveFileId('f_terrain_fsh');

    if (preset.metadata) {
      setMetadata(prev => ({
        ...prev,
        ...preset.metadata,
      }));
    }

    history.resetHistory({
      files: updatedFiles,
      nodes: clonedNodes,
      connections: clonedConnections,
      activeFileId: 'f_terrain_fsh',
      isManualCodeMode: false,
    });

    setIsPresetDropdownOpen(false);
  };

  // Direct 1-Click Minecraft Shaderpack ZIP Downloader
  const handleDirectDownloadZip = async () => {
    setIsExportingZipDirectly(true);
    try {
      const filename = await downloadShaderpackZipDirectly(
        activeFile.content,
        metadata,
        files
      );
      setZipToast(`Downloaded ${filename}! Drop directly into .minecraft/shaderpacks/`);
      setTimeout(() => setZipToast(null), 5500);
    } catch (err) {
      console.error('Failed to download shaderpack zip', err);
      alert('Failed to package shaderpack ZIP. Check console.');
    } finally {
      setIsExportingZipDirectly(false);
    }
  };

  // Compute shader for preview: if active file is .fsh, preview that; otherwise preview terrain.fsh
  const previewShaderSource = useMemo(() => {
    if (activeFile.name.endsWith('.fsh')) {
      return activeFile.content;
    }
    const terrainFile = files.find(f => f.name === 'gbuffers_terrain.fsh');
    return terrainFile?.content || initialGeneratedGlsl;
  }, [activeFile, files, initialGeneratedGlsl]);

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden select-none">
      {/* Top Header: Device-responsive layout */}
      <header className="h-12 sm:h-13 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        {/* Zone 1: Brand mark, Presets & Global Undo/Redo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-950/40 shrink-0">
              <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
              <span className="hidden sm:inline">Minecraft </span>Iris Studio
            </span>
          </div>

          <span className="hidden sm:inline text-neutral-600">·</span>

          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPresetDropdownOpen(p => !p)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/80 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span className="max-w-[70px] sm:max-w-none truncate">
                {SHADER_PRESETS.find(p => p.id === selectedPresetId)?.title || 'Presets'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isPresetDropdownOpen && (
              <div 
                className="absolute left-0 mt-1.5 w-64 sm:w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1"
                onMouseLeave={() => setIsPresetDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Minecraft Iris Presets
                </div>
                {SHADER_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      selectedPresetId === preset.id
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                        : 'hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" 
                      style={{ backgroundColor: preset.previewColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{preset.title}</div>
                      <div className="text-[11px] text-neutral-400 line-clamp-1">{preset.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Undo / Redo Toolbar */}
          <div className="flex items-center bg-neutral-950/90 rounded-lg border border-neutral-800 p-0.5 text-neutral-400">
            <button
              onClick={handleUndo}
              disabled={!history.canUndo}
              title={`Undo: ${history.lastAction} (Ctrl+Z)`}
              className="p-1 sm:p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!history.canRedo}
              title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              className="p-1 sm:p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer disabled:cursor-not-allowed border-l border-neutral-800"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zone 2: Navigation & Mode Switchers (Visible on Laptops / Desktops >= lg) */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Active File Name Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950/80 rounded-md border border-neutral-800 text-xs font-mono text-neutral-300">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activeFile.path}</span>
          </div>

          {/* Desktop View Mode Toggle */}
          <nav className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
            {isShaderFile && (
              <button
                onClick={() => setViewMode('nodes')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'nodes'
                    ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Visual Nodes</span>
              </button>
            )}

            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'code' || !isShaderFile
                  ? 'bg-neutral-800 text-sky-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>GLSL Code</span>
            </button>

            {isShaderFile && (
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-neutral-800 text-amber-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
            )}
          </nav>
        </div>

        {/* Zone 3: Primary Actions (Handbook & 1-Click Minecraft Shaderpack ZIP Downloader) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setIsDocsModalOpen(true)}
            title="Open Iris Documentation Handbook"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium rounded-lg border border-neutral-700/80 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Iris Guide</span>
          </button>

          {/* Primary 1-Click Minecraft Shaderpack ZIP Download Button */}
          <div className="flex items-center rounded-lg shadow-md shadow-emerald-950/50 overflow-hidden">
            <button
              onClick={handleDirectDownloadZip}
              disabled={isExportingZipDirectly}
              title="Download Minecraft 1.21+ Iris Shaderpack (.zip) - Ready to drop into .minecraft/shaderpacks/"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {isExportingZipDirectly ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Building ZIP...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Download .ZIP</span>
                </>
              )}
            </button>

            {/* Dropdown Toggle for Advanced Shaderpack Settings */}
            <button
              onClick={() => setIsExportMenuOpen(m => !m)}
              className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border-l border-emerald-500/40 transition-colors cursor-pointer"
              title="Shaderpack Export Menu & Options"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {isExportMenuOpen && (
            <div 
              className="absolute right-3 sm:right-4 top-12 mt-1.5 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1.5 animate-in fade-in"
              onMouseLeave={() => setIsExportMenuOpen(false)}
            >
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
                <span>Minecraft Shaderpack</span>
                <span className="text-[9px] text-neutral-400 font-normal">Fabric & Iris 1.21+</span>
              </div>

              <button
                onClick={() => {
                  setIsExportMenuOpen(false);
                  handleDirectDownloadZip();
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg text-left text-xs text-white hover:bg-neutral-800 transition-colors cursor-pointer bg-emerald-950/30 border border-emerald-800/40"
              >
                <FolderArchive className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-300">1-Click Download (.zip)</div>
                  <div className="text-[10px] text-neutral-400">Drops into .minecraft/shaderpacks/</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsExportMenuOpen(false);
                  setIsExportModalOpen(true);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Shaderpack Settings & Metadata</div>
                  <div className="text-[10px] text-neutral-400">Configure name, version, and in-game toggles</div>
                </div>
              </button>

              <div className="h-px bg-neutral-800 my-0.5" />

              <div className="px-2 py-0.5 text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                Offline HTML Pages
              </div>

              <button
                onClick={() => {
                  setIsExportMenuOpen(false);
                  exportCompleteStudioHtml(nodes, connections, activeFile.content, metadata);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg text-left text-xs text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Download Studio (.html)</div>
                  <div className="text-[10px] text-neutral-400">Offline browser backup file</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Floating ZIP Download Toast Notification */}
      {zipToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-950/95 border border-emerald-500/80 rounded-xl shadow-2xl backdrop-blur-md text-emerald-200 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{zipToast}</span>
        </div>
      )}

      {/* Main Studio Viewport */}
      <main className="flex-1 flex overflow-hidden bg-neutral-950 relative">
        {/* DESKTOP / LAPTOP LAYOUT (Screen width >= 1024px) */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Project Files Explorer Drawer */}
          <ProjectFileExplorer
            files={files}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            isOpen={isFileExplorerOpen}
            onToggleOpen={() => setIsFileExplorerOpen(o => !o)}
          />

          {/* Desktop Center Editor + Right Preview Pane */}
          <div className="flex-1 flex overflow-hidden p-2.5 gap-2.5 relative">
            {/* Editor Area (Visual Nodes or Code Editor or Split) */}
            <div className="flex-1 flex flex-col min-w-0 h-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-xl relative">
              {viewMode === 'nodes' && isShaderFile && (
                <VisualNodeCanvas
                  nodes={nodes}
                  connections={connections}
                  onNodesChange={handleNodesChange}
                  onConnectionsChange={handleConnectionsChange}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                />
              )}

              {(viewMode === 'code' || !isShaderFile) && (
                <GlslCodeEditor
                  code={activeFile.content}
                  onChange={handleCodeChange}
                  diagnostics={diagnostics}
                  isManualMode={isManualCodeMode}
                  onToggleManualMode={setIsManualCodeMode}
                  onResetToNodes={handleResetToNodes}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                />
              )}

              {viewMode === 'split' && isShaderFile && (
                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden divide-y md:divide-y-0 md:divide-x divide-neutral-800">
                  <div className="flex-1 h-1/2 md:h-full">
                    <VisualNodeCanvas
                      nodes={nodes}
                      connections={connections}
                      onNodesChange={handleNodesChange}
                      onConnectionsChange={handleConnectionsChange}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      canUndo={history.canUndo}
                      canRedo={history.canRedo}
                    />
                  </div>
                  <div className="flex-1 h-1/2 md:h-full">
                    <GlslCodeEditor
                      code={activeFile.content}
                      onChange={handleCodeChange}
                      diagnostics={diagnostics}
                      isManualMode={isManualCodeMode}
                      onToggleManualMode={setIsManualCodeMode}
                      onResetToNodes={handleResetToNodes}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      canUndo={history.canUndo}
                      canRedo={history.canRedo}
                    />
                  </div>
                </div>
              )}

              {/* Compiler Diagnostics Bar */}
              <CompilerDiagnostics
                diagnostics={diagnostics}
                compileTimeMs={compileTimeMs}
                isOpen={isDiagnosticsOpen}
                onToggle={() => setIsDiagnosticsOpen(o => !o)}
              />
            </div>

            {/* Laptop / Desktop Preview Toggle & Container */}
            {!isPreviewCollapsed ? (
              <div className="w-[36%] xl:w-[42%] max-w-2xl h-full flex flex-col shrink-0 relative transition-all">
                {/* Collapse button on top right of preview */}
                <button
                  onClick={() => setIsPreviewCollapsed(true)}
                  title="Collapse 3D Preview (Maximize Editor on Laptop)"
                  className="absolute top-2.5 right-24 z-20 px-2 py-0.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-[10px] rounded border border-neutral-700 transition-colors cursor-pointer"
                >
                  Hide 3D
                </button>
                <RealtimeShaderPreview
                  fragmentGlsl={previewShaderSource}
                  onCompilationStatus={(success, msg) => {}}
                />
              </div>
            ) : (
              <button
                onClick={() => setIsPreviewCollapsed(false)}
                title="Expand 3D Preview Window"
                className="absolute right-4 bottom-4 z-30 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xl shadow-black/60 border border-emerald-400/50 cursor-pointer active:scale-95 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Show 3D Preview</span>
              </button>
            )}
          </div>
        </div>

        {/* MOBILE & TABLET ADAPTIVE LAYOUT (Screen width < 1024px) */}
        <div className="flex lg:hidden flex-1 flex-col h-full overflow-hidden">
          {/* Active View Container */}
          <div className="flex-1 overflow-hidden relative">
            {/* Tab: Visual Nodes */}
            {mobileTab === 'nodes' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <VisualNodeCanvas
                    nodes={nodes}
                    connections={connections}
                    onNodesChange={handleNodesChange}
                    onConnectionsChange={handleConnectionsChange}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={history.canUndo}
                    canRedo={history.canRedo}
                  />
                </div>
                <CompilerDiagnostics
                  diagnostics={diagnostics}
                  compileTimeMs={compileTimeMs}
                  isOpen={isDiagnosticsOpen}
                  onToggle={() => setIsDiagnosticsOpen(o => !o)}
                />
              </div>
            )}

            {/* Tab: GLSL Code */}
            {mobileTab === 'code' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <GlslCodeEditor
                    code={activeFile.content}
                    onChange={handleCodeChange}
                    diagnostics={diagnostics}
                    isManualMode={isManualCodeMode}
                    onToggleManualMode={setIsManualCodeMode}
                    onResetToNodes={handleResetToNodes}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={history.canUndo}
                    canRedo={history.canRedo}
                  />
                </div>
                <CompilerDiagnostics
                  diagnostics={diagnostics}
                  compileTimeMs={compileTimeMs}
                  isOpen={isDiagnosticsOpen}
                  onToggle={() => setIsDiagnosticsOpen(o => !o)}
                />
              </div>
            )}

            {/* Tab: 3D Preview */}
            {mobileTab === 'preview' && (
              <div className="h-full w-full">
                <RealtimeShaderPreview
                  fragmentGlsl={previewShaderSource}
                  onCompilationStatus={(success, msg) => {}}
                />
              </div>
            )}

            {/* Tab: Project Files */}
            {mobileTab === 'files' && (
              <div className="h-full w-full bg-neutral-900">
                <ProjectFileExplorer
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={id => {
                    handleSelectFile(id);
                    setMobileTab(isShaderFile ? 'nodes' : 'code');
                  }}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                  isOpen={true}
                  onToggleOpen={() => {}}
                />
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation Bar (Large touch targets >= 44px) */}
          <nav className="h-14 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex items-center justify-around px-2 shrink-0 z-30">
            <button
              onClick={() => { setMobileTab('nodes'); setViewMode('nodes'); }}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                mobileTab === 'nodes' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span className="text-[10px]">Nodes</span>
            </button>

            <button
              onClick={() => { setMobileTab('code'); setViewMode('code'); }}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                mobileTab === 'code' ? 'text-sky-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span className="text-[10px]">Code</span>
            </button>

            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                mobileTab === 'preview' ? 'text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-[10px]">3D Preview</span>
            </button>

            <button
              onClick={() => setMobileTab('files')}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                mobileTab === 'files' ? 'text-purple-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span className="text-[10px]">Files</span>
            </button>
          </nav>
        </div>
      </main>

      {/* Iris Documentation Handbook Modal */}
      <IrisDocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />

      {/* Shaderpack Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        fragmentGlsl={activeFile.content}
        diagnostics={diagnostics}
        metadata={metadata}
        onMetadataChange={setMetadata}
        nodes={nodes}
        connections={connections}
        allFiles={files}
      />
    </div>
  );
}
