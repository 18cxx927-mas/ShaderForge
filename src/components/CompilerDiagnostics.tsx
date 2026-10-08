/**
 * Compiler Diagnostics Panel
 * Displays compilation health, line numbers, error descriptions, and helpful fix advice.
 */

import React from 'react';
import { CompilerDiagnostic } from '../types/shader';
import { CheckCircle2, AlertTriangle, XCircle, Lightbulb, Zap } from 'lucide-react';

interface CompilerDiagnosticsProps {
  diagnostics: CompilerDiagnostic[];
  compileTimeMs: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const CompilerDiagnostics: React.FC<CompilerDiagnosticsProps> = ({
  diagnostics,
  compileTimeMs,
  isOpen,
  onToggle,
}) => {
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  const isHealthy = errors.length === 0;

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/90 backdrop-blur-md">
      {/* Bottom Status Bar */}
      <div 
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-2 text-xs cursor-pointer hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Shader Compiled Successfully</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-300">
                  {errors.length} {errors.length === 1 ? 'Error' : 'Errors'} Found
                </span>
              </>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warnings.length} Warnings</span>
            </div>
          )}

          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400 font-mono text-[11px] tabular-nums">
            {compileTimeMs}ms
          </span>
        </div>

        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
          <span>{isOpen ? 'Hide Diagnostics ▼' : 'Show Details ▲'}</span>
        </div>
      </div>

      {/* Expanded Diagnostics Drawer */}
      {isOpen && (
        <div className="p-3 max-h-48 overflow-y-auto space-y-2 border-t border-neutral-800 text-xs">
          {diagnostics.length === 0 ? (
            <div className="p-3 bg-neutral-950/60 rounded-lg text-neutral-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Zero compiler errors! Your Iris shader is ready for Minecraft 1.21+.</span>
            </div>
          ) : (
            diagnostics.map((diag, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border flex flex-col gap-1.5 ${
                  diag.severity === 'error'
                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                    : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-[11px]">
                      Line {diag.line}
                    </span>
                    <span className="font-semibold">{diag.message}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                    {diag.severity}
                  </span>
                </div>

                {diag.snippet && (
                  <div className="font-mono text-[11px] px-2 py-1 bg-black/50 rounded text-neutral-300 overflow-x-auto">
                    {diag.snippet}
                  </div>
                )}

                {diag.suggestion && (
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] mt-0.5">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                    <span>{diag.suggestion}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
