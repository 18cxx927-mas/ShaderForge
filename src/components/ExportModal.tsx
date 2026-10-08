/**
 * Shaderpack Export Modal
 * Generates and downloads Minecraft 1.21+ Fabric Iris shaderpack .zip file
 * with complete valid folder structure, vertex pipelines, properties, and lang files.
 * Usable directly in Minecraft: just drop into .minecraft/shaderpacks/
 */

import React, { useState } from 'react';
import { ShaderpackMetadata, CompilerDiagnostic, ShaderNode, NodeConnection, ProjectFile } from '../types/shader';
import { exportShaderpackZip, triggerFileDownload } from '../utils/zipExporter';
import { exportVisualEditorHtml, exportCodeEditorHtml, exportCompleteStudioHtml } from '../utils/htmlExporters';
import { 
  Download, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  FolderArchive, 
  FileCode2, 
  Boxes,
  Code2,
  Check, 
  Loader2,
  Folder,
  FileCode,
  Copy,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fragmentGlsl: string;
  diagnostics: CompilerDiagnostic[];
  metadata: ShaderpackMetadata;
  onMetadataChange: (meta: ShaderpackMetadata) => void;
  nodes: ShaderNode[];
  connections: NodeConnection[];
  allFiles?: ProjectFile[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  fragmentGlsl,
  diagnostics,
  metadata,
  onMetadataChange,
  nodes,
  connections,
  allFiles,
}) => {
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [showHtmlOptions, setShowHtmlOptions] = useState<boolean>(false);

  if (!isOpen) return null;

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;

  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await exportShaderpackZip(fragmentGlsl, metadata, allFiles);
      const filename = `${metadata.name.replace(/\s+/g, '_')}.zip`;
      triggerFileDownload(zipBlob, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err) {
      console.error('Export zip failed:', err);
      alert('Export failed. Check console for details.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-md">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Export Minecraft Shaderpack (.zip)</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                  Iris 1.21+
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Directly usable in Minecraft: drop the .zip into <code className="text-emerald-400">.minecraft/shaderpacks/</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
          {/* Health Status Indicator */}
          <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
            errorCount === 0 
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200' 
              : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
          }`}>
            {errorCount === 0 ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-white">
                {errorCount === 0 ? 'Verified: Ready for Minecraft Game Execution' : `${errorCount} Compile Issues Detected`}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {errorCount === 0 
                  ? 'GLSL shader pipeline, vertex code, and Iris properties are compliant and ready for Fabric & Iris.' 
                  : 'You can still export, or review error lines in the code editor.'}
              </div>
            </div>
          </div>

          {/* How To Install In Minecraft (Direct Instruction Guide) */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white text-xs">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>How To Install In Minecraft:</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Do <strong>NOT</strong> unzip the file. Drop the downloaded <code className="text-emerald-300">{metadata.name}.zip</code> into your game's shaderpacks directory:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <button
                onClick={() => handleCopyPath('%appdata%\\.minecraft\\shaderpacks')}
                className="p-2 bg-neutral-900 hover:bg-neutral-850 rounded-lg border border-neutral-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                title="Click to copy path"
              >
                <div>
                  <div className="text-[9px] uppercase font-sans text-neutral-500 font-semibold">Windows</div>
                  <div className="truncate text-neutral-300 group-hover:text-emerald-300">%appdata%\.minecraft\shaderpacks</div>
                </div>
                <Copy className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 shrink-0 ml-1" />
              </button>

              <button
                onClick={() => handleCopyPath('~/Library/Application Support/minecraft/shaderpacks')}
                className="p-2 bg-neutral-900 hover:bg-neutral-850 rounded-lg border border-neutral-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                title="Click to copy path"
              >
                <div>
                  <div className="text-[9px] uppercase font-sans text-neutral-500 font-semibold">macOS</div>
                  <div className="truncate text-neutral-300 group-hover:text-emerald-300">~/Library/.../shaderpacks</div>
                </div>
                <Copy className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 shrink-0 ml-1" />
              </button>

              <button
                onClick={() => handleCopyPath('~/.minecraft/shaderpacks')}
                className="p-2 bg-neutral-900 hover:bg-neutral-850 rounded-lg border border-neutral-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                title="Click to copy path"
              >
                <div>
                  <div className="text-[9px] uppercase font-sans text-neutral-500 font-semibold">Linux</div>
                  <div className="truncate text-neutral-300 group-hover:text-emerald-300">~/.minecraft/shaderpacks</div>
                </div>
                <Copy className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 shrink-0 ml-1" />
              </button>
            </div>
            {copiedPath && (
              <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Copied "{copiedPath}" to clipboard!</span>
              </div>
            )}
          </div>

          {/* Minecraft ZIP Archive File Structure Preview */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Shaderpack ZIP Internal Structure:</span>
              </span>
              <span className="text-[10px] text-neutral-400">100% Iris & OptiFine Validated</span>
            </div>
            <div className="font-mono text-[10px] bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800/80 space-y-1 text-neutral-300 max-h-36 overflow-y-auto">
              <div className="text-amber-400 flex items-center gap-1">
                <FolderArchive className="w-3 h-3" />
                <span>{metadata.name}.zip/</span>
              </div>
              <div className="pl-4 text-emerald-400 flex items-center gap-1">
                <Folder className="w-3 h-3" />
                <span>shaders/</span>
              </div>
              <div className="pl-8 text-neutral-300 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-sky-400" />
                <span>gbuffers_terrain.fsh <span className="text-neutral-500">(Your custom shader)</span></span>
              </div>
              <div className="pl-8 text-neutral-400 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-sky-400" />
                <span>gbuffers_terrain.vsh <span className="text-neutral-500">(Terrain & waving foliage vertex)</span></span>
              </div>
              <div className="pl-8 text-neutral-400 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-amber-400" />
                <span>shaders.properties <span className="text-neutral-500">(Iris video settings options)</span></span>
              </div>
              <div className="pl-8 text-neutral-400 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-emerald-400" />
                <span>lang/en_us.lang <span className="text-neutral-500">(Settings translations)</span></span>
              </div>
              <div className="pl-8 text-neutral-400 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-sky-400" />
                <span>gbuffers_water.vsh & fsh <span className="text-neutral-500">(Water reflections)</span></span>
              </div>
              <div className="pl-8 text-neutral-400 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-purple-400" />
                <span>composite.vsh & fsh, final.vsh & fsh</span>
              </div>
              <div className="pl-4 text-neutral-400 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-neutral-500" />
                <span>pack.mcmeta & README_INSTALL.txt</span>
              </div>
            </div>
          </div>

          {/* Metadata Inputs */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Shaderpack Name</label>
                <input
                  type="text"
                  value={metadata.name}
                  onChange={e => onMetadataChange({ ...metadata, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Author</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={e => onMetadataChange({ ...metadata, author: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Version</label>
                <input
                  type="text"
                  value={metadata.version}
                  onChange={e => onMetadataChange({ ...metadata, version: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Target Version</label>
                <input
                  type="text"
                  disabled
                  value="1.21+ (Fabric / Iris)"
                  className="w-full px-3 py-1.5 bg-neutral-950/60 border border-neutral-800 rounded-lg text-neutral-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* In-Game Options Settings (shaders.properties) */}
          <div className="pt-2 border-t border-neutral-800 space-y-2.5">
            <h4 className="font-semibold text-white text-[11px] uppercase tracking-wider">
              Iris In-Game Settings Menu Configuration
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={metadata.enableWavingLeaves}
                  onChange={e => onMetadataChange({ ...metadata, enableWavingLeaves: e.target.checked })}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-[11px] text-neutral-200">Waving Foliage</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={metadata.enableDynamicWater}
                  onChange={e => onMetadataChange({ ...metadata, enableDynamicWater: e.target.checked })}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-[11px] text-neutral-200">Animated Water</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={metadata.enableGodRays}
                  onChange={e => onMetadataChange({ ...metadata, enableGodRays: e.target.checked })}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-[11px] text-neutral-200">Volumetric Sunbeams</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={metadata.enableBloom}
                  onChange={e => onMetadataChange({ ...metadata, enableBloom: e.target.checked })}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-[11px] text-neutral-200">Radiant Bloom</span>
              </label>
            </div>

            <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Color Saturation Boost</span>
                <span className="font-mono text-emerald-400">{metadata.saturationBoost.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={metadata.saturationBoost}
                onChange={e => onMetadataChange({ ...metadata, saturationBoost: Number(e.target.value) })}
                className="w-full h-1 bg-neutral-700 rounded accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Secondary Collapsible: Standalone HTML File Exporters */}
          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={() => setShowHtmlOptions(s => !s)}
              className="flex items-center justify-between w-full text-left py-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-medium">Looking for offline single HTML web pages instead?</span>
              {showHtmlOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showHtmlOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => exportVisualEditorHtml(nodes, connections, fragmentGlsl, metadata)}
                  className="p-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-emerald-300">Visual Editor (.html)</div>
                  <div className="text-[10px] text-neutral-500">Node canvas & 3D</div>
                </button>
                <button
                  onClick={() => exportCodeEditorHtml(fragmentGlsl, metadata)}
                  className="p-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-sky-300">Code Editor (.html)</div>
                  <div className="text-[10px] text-neutral-500">GLSL code & 3D</div>
                </button>
                <button
                  onClick={() => exportCompleteStudioHtml(nodes, connections, fragmentGlsl, metadata)}
                  className="p-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-purple-300">All-in-One (.html)</div>
                  <div className="text-[10px] text-neutral-500">Complete studio</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-neutral-400">
            Output: <span className="text-white font-semibold">{metadata.name}.zip</span> (Standard Minecraft format)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExportingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Packaging Shaderpack ZIP...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Downloaded {metadata.name}.zip!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Iris Shaderpack (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
