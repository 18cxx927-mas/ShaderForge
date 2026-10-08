/**
 * GLSL Code Editor with Syntax Highlighting, Automated Error Detection,
 * One-Click GLSL Code Formatter, and Integrated Shader Snippets Library / Command Palette.
 */

import React, { useRef, useState, useMemo } from 'react';
import { CompilerDiagnostic } from '../types/shader';
import { formatGlslCode } from '../utils/glslFormatter';
import { GLSL_SNIPPETS_LIBRARY, GlslSnippet } from '../utils/glslSnippets';
import { GlslSnippetsModal } from './GlslSnippetsModal';
import { 
  Code2, 
  Copy, 
  Check, 
  AlertCircle, 
  RotateCcw,
  AlignLeft,
  Sparkles,
  BookmarkPlus,
  Undo2,
  Redo2
} from 'lucide-react';

interface GlslCodeEditorProps {
  code: string;
  onChange: (newCode: string, isDebounced?: boolean, actionDescription?: string) => void;
  diagnostics: CompilerDiagnostic[];
  isManualMode: boolean;
  onToggleManualMode: (manual: boolean) => void;
  onResetToNodes: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const GlslCodeEditor: React.FC<GlslCodeEditorProps> = ({
  code,
  onChange,
  diagnostics,
  isManualMode,
  onToggleManualMode,
  onResetToNodes,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [formatted, setFormatted] = useState<boolean>(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState<boolean>(false);
  const [lastInsertedTitle, setLastInsertedTitle] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Group error diagnostics by line number
  const errorsByLine = useMemo(() => {
    const map = new Map<number, CompilerDiagnostic[]>();
    diagnostics.forEach(diag => {
      const existing = map.get(diag.line) || [];
      existing.push(diag);
      map.set(diag.line, existing);
    });
    return map;
  }, [diagnostics]);

  const lines = useMemo(() => code.split('\n'), [code]);

  // Group snippets by category for the quick select dropdown
  const snippetsByCategory = useMemo(() => {
    const groups: Record<string, GlslSnippet[]> = {
      noise: [],
      lighting: [],
      color: [],
      transform: [],
      minecraft: [],
    };
    GLSL_SNIPPETS_LIBRARY.forEach(s => {
      if (groups[s.category]) {
        groups[s.category].push(s);
      }
    });
    return groups;
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // Format GLSL Code with Khronos / OpenGL Style Guide
  const handleFormatCode = () => {
    const beautified = formatGlslCode(code);
    onChange(beautified, false, 'Format GLSL Code');
    setFormatted(true);
    setTimeout(() => setFormatted(false), 1800);
  };

  const handleInsertSnippet = (snippetCode: string, snippetTitle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Ensure snippet has clean newlines around it
    const prefix = start > 0 && !code[start - 1].endsWith('\n') ? '\n\n' : '';
    const insertion = prefix + snippetCode.trim() + '\n\n';
    
    const newCode = code.substring(0, start) + insertion + code.substring(end);
    onChange(newCode, false, `Insert Snippet: ${snippetTitle}`);
    if (!isManualMode) onToggleManualMode(true);

    // Provide visual feedback
    setLastInsertedTitle(snippetTitle);
    setTimeout(() => setLastInsertedTitle(null), 2500);

    // Set cursor to position right after inserted snippet
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
    }, 50);
  };

  // Keyboard shortcut handler for IDE productivity
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Undo Shortcut: Ctrl+Z / Cmd+Z
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (onUndo && canUndo) onUndo();
      return;
    }

    // Redo Shortcut: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
    if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || (e.key === 'y' || e.key === 'Y'))) {
      e.preventDefault();
      if (onRedo && canRedo) onRedo();
      return;
    }

    // Open Snippets Command Palette: Ctrl+K / Cmd+K or Ctrl+Shift+P
    if (((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P'))) {
      e.preventDefault();
      setIsSnippetsModalOpen(true);
      return;
    }

    // Format Shortcut: Shift+Alt+F or Ctrl+Shift+F / Cmd+Shift+F
    if ((e.shiftKey && e.altKey && e.key === 'F') || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'I'))) {
      e.preventDefault();
      handleFormatCode();
      return;
    }

    // Tab key indent handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        // Insert 4 spaces
        const newCode = code.substring(0, start) + '    ' + code.substring(end);
        onChange(newCode);
        if (!isManualMode) onToggleManualMode(true);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      } else {
        // Shift+Tab: un-indent current line
        const before = code.substring(0, start);
        const lineStart = before.lastIndexOf('\n') + 1;
        const currentLine = code.substring(lineStart, end);
        if (currentLine.startsWith('    ')) {
          const newCode = code.substring(0, lineStart) + currentLine.substring(4);
          onChange(newCode);
          if (!isManualMode) onToggleManualMode(true);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 4);
          }, 0);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Top Code Editor Bar: Responsive flex layout */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-xs shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5 whitespace-nowrap">
            <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Iris </span>GLSL
          </span>
          <span className="text-neutral-500">·</span>
          <span className="font-mono text-[11px] text-neutral-400 truncate max-w-[120px] sm:max-w-none">
            gbuffers_terrain.fsh
          </span>

          {/* Sync / Manual Mode Switcher */}
          <div className="flex items-center ml-1 p-0.5 bg-neutral-800 rounded-md shrink-0">
            <button
              onClick={() => onToggleManualMode(false)}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded transition-colors cursor-pointer ${
                !isManualMode
                  ? 'bg-neutral-900 text-emerald-400 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Auto-Sync
            </button>
            <button
              onClick={() => onToggleManualMode(true)}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded transition-colors cursor-pointer ${
                isManualMode
                  ? 'bg-neutral-900 text-sky-400 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Editor Actions Toolbar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Snippets Command Palette Button */}
          <button
            onClick={() => setIsSnippetsModalOpen(true)}
            title="Browse all GLSL Snippets Library & Command Palette (Ctrl+K)"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-750 text-amber-300 hover:text-amber-200 border border-neutral-700/80 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Snippets</span>
            <kbd className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-700 font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Quick Categorized Snippets Dropdown */}
          <select
            onChange={e => {
              if (e.target.value) {
                const found = GLSL_SNIPPETS_LIBRARY.find(s => s.id === e.target.value);
                if (found) {
                  handleInsertSnippet(found.code, found.title);
                }
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="hidden sm:block bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[11px] rounded px-2 py-1 border border-neutral-700 focus:outline-none cursor-pointer max-w-[130px] truncate"
            title="Quick Insert Snippet"
          >
            <option value="" disabled>
              + Quick Insert
            </option>
            <optgroup label="Noise & Procedural">
              {snippetsByCategory.noise.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Lighting & Shading">
              {snippetsByCategory.lighting.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Color & Tonemap">
              {snippetsByCategory.color.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Transforms & Depth">
              {snippetsByCategory.transform.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Minecraft Iris Specials">
              {snippetsByCategory.minecraft.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Undo / Redo Toolbar Controls */}
          <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 backdrop-blur-md text-neutral-400">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Undo Code Edit (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer disabled:cursor-not-allowed border-l border-neutral-800"
              title="Redo Code Edit (Ctrl+Y or Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* GLSL Code Formatter Button */}
          <button
            onClick={handleFormatCode}
            title="Automatically format and beautify GLSL indentation (Shift+Alt+F or Ctrl+Shift+F)"
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer border ${
              formatted
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : 'bg-neutral-800 hover:bg-neutral-750 text-sky-300 border-sky-800/40 hover:border-sky-600/70'
            }`}
          >
            {formatted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Formatted!</span>
              </>
            ) : (
              <>
                <AlignLeft className="w-3.5 h-3.5 text-sky-400" />
                <span>Format<span className="hidden sm:inline"> GLSL</span></span>
              </>
            )}
          </button>

          {isManualMode && (
            <button
              onClick={onResetToNodes}
              title="Reset code back to Visual Node output"
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-amber-300 text-[11px] transition-colors cursor-pointer border border-neutral-700/60"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy GLSL code to clipboard"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition-colors cursor-pointer border border-neutral-700/60"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas with Line Numbers & Error Gutters */}
      <div className="relative flex-1 flex overflow-hidden font-mono text-xs bg-[#0b0f14]">
        {/* Line Numbers Gutter */}
        <div className="w-10 sm:w-12 bg-neutral-900/60 border-r border-neutral-800/80 select-none py-3 px-1 text-right text-neutral-500 font-mono text-[11px] leading-5 shrink-0 overflow-hidden">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const hasError = errorsByLine.has(lineNum);

            return (
              <div key={lineNum} className="relative group h-5 flex items-center justify-end pr-1">
                {hasError && (
                  <span className="absolute left-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
                <span className={hasError ? 'text-rose-400 font-bold' : ''}>
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Textarea code editor */}
        <div className="relative flex-1 h-full">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={e => {
              onChange(e.target.value);
              if (!isManualMode) onToggleManualMode(true);
            }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="w-full h-full p-3 bg-transparent text-emerald-100 font-mono text-xs leading-5 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-emerald-500/30 selection:text-white"
            placeholder="// Iris GLSL Shader Code... (Press Ctrl+K for Snippets Library)"
          />
        </div>

        {/* Snippet Insertion Notification Toast */}
        {lastInsertedTitle && (
          <div className="absolute top-3 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 text-xs shadow-xl animate-fade-in">
            <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inserted: <strong>{lastInsertedTitle}</strong></span>
          </div>
        )}
      </div>

      {/* Inline Active Error Bar if any */}
      {diagnostics.length > 0 && (
        <div className="px-3.5 py-2 bg-rose-950/40 border-t border-rose-900/50 flex items-center justify-between text-xs text-rose-200 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-rose-300">
              Line {diagnostics[0].line}:
            </span>
            <span className="truncate">{diagnostics[0].message}</span>
          </div>
          {diagnostics[0].suggestion && (
            <span className="text-[11px] text-amber-300 ml-2 hidden md:inline truncate">
              Tip: {diagnostics[0].suggestion}
            </span>
          )}
        </div>
      )}

      {/* Snippets Command Palette Modal */}
      <GlslSnippetsModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
        onInsertSnippet={handleInsertSnippet}
      />
    </div>
  );
};
