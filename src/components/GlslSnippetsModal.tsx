/**
 * GLSL Snippets Command Palette & Library Modal
 * Provides search, category filtering, live code preview, and one-click insertion.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GLSL_SNIPPETS_LIBRARY, GlslSnippet } from '../utils/glslSnippets';
import { 
  Search, 
  X, 
  Code2, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Sun, 
  Palette, 
  Compass, 
  Boxes,
  ArrowRight
} from 'lucide-react';

interface GlslSnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet: (snippetCode: string, snippetTitle: string) => void;
}

export const GlslSnippetsModal: React.FC<GlslSnippetsModalProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>(GLSL_SNIPPETS_LIBRARY[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setCopied(false);
    }
  }, [isOpen]);

  // Filter snippets based on query and category
  const filteredSnippets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return GLSL_SNIPPETS_LIBRARY.filter(snippet => {
      const matchesCategory = selectedCategory === 'all' || snippet.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        snippet.title.toLowerCase().includes(q) ||
        snippet.description.toLowerCase().includes(q) ||
        snippet.tags.some(t => t.toLowerCase().includes(q)) ||
        snippet.inputs.toLowerCase().includes(q) ||
        snippet.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Selected snippet reference
  const activeSnippet = useMemo(() => {
    return filteredSnippets.find(s => s.id === selectedSnippetId) || filteredSnippets[0] || GLSL_SNIPPETS_LIBRARY[0];
  }, [filteredSnippets, selectedSnippetId]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = filteredSnippets.findIndex(s => s.id === activeSnippet?.id);
      if (currentIndex < filteredSnippets.length - 1) {
        setSelectedSnippetId(filteredSnippets[currentIndex + 1].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = filteredSnippets.findIndex(s => s.id === activeSnippet?.id);
      if (currentIndex > 0) {
        setSelectedSnippetId(filteredSnippets[currentIndex - 1].id);
      }
    } else if (e.key === 'Enter') {
      if (activeSnippet) {
        e.preventDefault();
        onInsertSnippet(activeSnippet.code, activeSnippet.title);
        onClose();
      }
    }
  };

  const handleCopySnippet = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Snippets', icon: Sparkles },
    { id: 'noise', label: 'Noise & Fractals', icon: Terminal },
    { id: 'lighting', label: 'Lighting & Shading', icon: Sun },
    { id: 'color', label: 'Color & Tonemap', icon: Palette },
    { id: 'transform', label: 'Transforms', icon: Compass },
    { id: 'minecraft', label: 'Minecraft Specials', icon: Boxes },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px]">
        {/* Top Header & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-950/70 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>GLSL Shader Snippets Library</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-sky-400 border border-neutral-700">
                    {filteredSnippets.length} snippets
                  </span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Insert production-ready math, noise, lighting, and transformations into your shader
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800/80 px-2 py-1 rounded border border-neutral-700">
                <span>Navigate</span>
                <kbd className="px-1 bg-neutral-900 rounded text-neutral-300">↑↓</kbd>
                <span>Insert</span>
                <kbd className="px-1 bg-neutral-900 rounded text-neutral-300">↵</kbd>
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search functions, noise, lighting, ACES, transforms, Gerstner, caustics..."
              className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                      : 'bg-neutral-950/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border-neutral-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content: Split List and Code Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Left Column: Snippet List */}
          <div className="w-full md:w-5/12 h-1/2 md:h-full overflow-y-auto p-2 space-y-1">
            {filteredSnippets.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No shader snippets matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredSnippets.map(snippet => {
                const isSelected = activeSnippet?.id === snippet.id;
                return (
                  <button
                    key={snippet.id}
                    onClick={() => setSelectedSnippetId(snippet.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500/50 shadow-md'
                        : 'bg-neutral-950/40 hover:bg-neutral-800/60 border-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-xs truncate ${isSelected ? 'text-sky-300' : 'text-neutral-200'}`}>
                        {snippet.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {snippet.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {snippet.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-neutral-500">
                      <span className="text-emerald-400 truncate">in: {snippet.inputs}</span>
                      <span>·</span>
                      <span className="text-amber-400 truncate">out: {snippet.output}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Active Snippet Code & Documentation Preview */}
          <div className="w-full md:w-7/12 h-1/2 md:h-full flex flex-col bg-[#0b0f14] overflow-hidden">
            {activeSnippet ? (
              <>
                {/* Preview Topbar */}
                <div className="p-3 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-white truncate">
                      {activeSnippet.title}
                    </h3>
                    <div className="text-[10px] text-neutral-400 truncate">
                      Category: <span className="text-sky-300 capitalize">{activeSnippet.category}</span> · Tags: {activeSnippet.tags.slice(0, 3).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopySnippet(activeSnippet.code)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer border border-neutral-700"
                      title="Copy snippet code"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        onInsertSnippet(activeSnippet.code, activeSnippet.title);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-black font-semibold text-xs rounded shadow-md transition-all cursor-pointer"
                    >
                      <span>Insert Snippet</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Code Window with Syntax Display */}
                <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-5 text-emerald-200 bg-[#080d14] selection:bg-sky-500/30">
                  <pre className="whitespace-pre">{activeSnippet.code}</pre>
                </div>

                {/* Footer Parameter Breakdown */}
                <div className="p-2.5 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-neutral-300">Input:</span>
                    <span className="font-mono text-emerald-400 truncate">{activeSnippet.inputs}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-neutral-300">Returns:</span>
                    <span className="font-mono text-amber-400 truncate">{activeSnippet.output}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
                Select a snippet to preview GLSL code
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
