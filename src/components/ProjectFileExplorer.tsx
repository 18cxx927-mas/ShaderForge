/**
 * Project File & Folder Explorer for Minecraft Iris Shaders
 * Allows creating files, creating folders, renaming, deleting, and switching active files.
 */

import React, { useState } from 'react';
import { ProjectFile } from '../types/shader';
import { 
  Folder, 
  FolderPlus, 
  FilePlus, 
  FileCode, 
  FileText, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  Copy, 
  Search,
  Layers,
  Sparkles,
  Boxes,
  Code2
} from 'lucide-react';

interface ProjectFileExplorerProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, folderPath: string, fileType: ProjectFile['fileType']) => void;
  onCreateFolder: (folderPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ProjectFileExplorer: React.FC<ProjectFileExplorerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  isOpen,
  onToggleOpen,
}) => {
  // Modal states
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState<boolean>(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState<boolean>(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState<string>('');

  // Form states
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileFolder, setNewFileFolder] = useState<string>('shaders');
  const [newFileType, setNewFileType] = useState<ProjectFile['fileType']>('fragment_shader');
  const [newFolderName, setNewFolderName] = useState<string>('');

  // Folder collapse state
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Group files into directories
  const folders = Array.from(
    new Set(
      files
        .map(f => {
          const parts = f.path.split('/');
          parts.pop();
          return parts.join('/') || 'root';
        })
    )
  ).sort();

  const handleOpenRename = (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFileId(file.id);
    setRenameInputValue(file.name);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = () => {
    if (renamingFileId && renameInputValue.trim()) {
      onRenameFile(renamingFileId, renameInputValue.trim());
      setIsRenameModalOpen(false);
      setRenamingFileId(null);
    }
  };

  const handleConfirmCreateFile = () => {
    if (!newFileName.trim()) return;
    let finalName = newFileName.trim();

    // Auto-append extension if missing
    if (newFileType === 'fragment_shader' && !finalName.endsWith('.fsh')) {
      finalName += '.fsh';
    } else if (newFileType === 'vertex_shader' && !finalName.endsWith('.vsh')) {
      finalName += '.vsh';
    } else if (newFileType === 'glsl_include' && !finalName.endsWith('.glsl')) {
      finalName += '.glsl';
    } else if (newFileType === 'properties' && !finalName.endsWith('.properties')) {
      finalName += '.properties';
    } else if (newFileType === 'lang' && !finalName.endsWith('.lang')) {
      finalName += '.lang';
    }

    onCreateFile(finalName, newFileFolder, newFileType);
    setNewFileName('');
    setIsNewFileModalOpen(false);
  };

  const handleConfirmCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const cleanFolder = newFolderName.trim().replace(/^\/+|\/+$/g, '');
    onCreateFolder(`shaders/${cleanFolder}`);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.name.endsWith('.fsh')) {
      return <FileCode className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (file.name.endsWith('.vsh')) {
      return <FileCode className="w-3.5 h-3.5 text-sky-400" />;
    }
    if (file.name.endsWith('.properties')) {
      return <Settings className="w-3.5 h-3.5 text-amber-400" />;
    }
    if (file.name.endsWith('.lang')) {
      return <FileText className="w-3.5 h-3.5 text-purple-400" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-neutral-400" />;
  };

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        title="Open Project File Explorer"
        className="hidden md:flex w-10 bg-neutral-900 border-r border-neutral-800 flex-col items-center py-3 gap-4 hover:bg-neutral-850 text-neutral-400 hover:text-white transition-colors shrink-0"
      >
        <Folder className="w-4 h-4 text-emerald-400" />
        <span className="[writing-mode:vertical-lr] text-[11px] font-medium tracking-wider uppercase">
          Files & Folders
        </span>
      </button>
    );
  }

  return (
    <div className="w-full md:w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full shrink-0 select-none text-xs">
      {/* Explorer Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-neutral-200">Shader Files</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNewFileModalOpen(true)}
            title="Create New File"
            className="p-1 text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800 rounded transition-colors"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            title="Create New Folder"
            className="p-1 text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 rounded transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleOpen}
            title="Collapse Sidebar"
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-2.5 py-2 border-b border-neutral-800 bg-neutral-950/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-[11px] text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredFiles.map(file => {
          const isActive = file.id === activeFileId;
          const isShader = file.name.endsWith('.fsh') || file.name.endsWith('.vsh');

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 font-medium'
                  : 'text-neutral-300 hover:bg-neutral-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                {getFileIcon(file)}
                <span className="truncate text-xs font-mono">{file.name}</span>
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                {isShader && (
                  <span className="text-[10px] px-1 py-0.2 bg-black/40 rounded text-neutral-400 border border-neutral-800">
                    {file.editorMode === 'visual' ? 'Visual' : 'Code'}
                  </span>
                )}

                {!file.isProtected && (
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={e => handleOpenRename(file, e)}
                      title="Rename file"
                      className="p-1 hover:text-white text-neutral-400"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete ${file.name}?`)) onDeleteFile(file.id);
                      }}
                      title="Delete file"
                      className="p-1 hover:text-rose-400 text-neutral-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Info */}
      <div className="p-2.5 border-t border-neutral-800 bg-neutral-950/60 text-[11px] text-neutral-400 flex items-center justify-between">
        <span>{files.length} Project Files</span>
        <span className="text-emerald-400 font-mono">1.21+ Iris</span>
      </div>

      {/* Modal: New File */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-emerald-400" />
              Create New Shader File
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">File Name</label>
                <input
                  type="text"
                  placeholder="e.g. gbuffers_water or custom_bloom"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">File Type</label>
                <select
                  value={newFileType}
                  onChange={e => setNewFileType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 text-xs focus:outline-none"
                >
                  <option value="fragment_shader">Fragment Shader (.fsh) - Visual/Code</option>
                  <option value="vertex_shader">Vertex Shader (.vsh) - Geometry/Waves</option>
                  <option value="glsl_include">GLSL Include Library (.glsl)</option>
                  <option value="properties">Iris Settings (.properties)</option>
                  <option value="lang">Language Translation (.lang)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Folder Destination</label>
                <select
                  value={newFileFolder}
                  onChange={e => setNewFileFolder(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 text-xs focus:outline-none font-mono"
                >
                  <option value="shaders">shaders/</option>
                  <option value="shaders/lang">shaders/lang/</option>
                  <option value="shaders/include">shaders/include/</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateFile}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Folder */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              Create New Folder
            </h3>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Folder Name</label>
              <input
                type="text"
                placeholder="e.g. include or post or lib"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateFolder}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename File */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-sky-400" />
              Rename File
            </h3>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">New Name</label>
              <input
                type="text"
                value={renameInputValue}
                onChange={e => setRenameInputValue(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
