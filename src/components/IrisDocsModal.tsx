/**
 * Iris Shader Documentation & Beginner Guide Modal
 * Comprehensive guidance for Minecraft 1.21+ Iris syntax, uniforms, and pipeline.
 */

import React, { useState } from 'react';
import { BookOpen, X, Sparkles, Terminal, Layers, HelpCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface IrisDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IrisDocsModal: React.FC<IrisDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'uniforms' | 'pipeline' | 'faq'>('quickstart');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Iris Shader Studio Handbook</h2>
              <p className="text-xs text-neutral-400">Minecraft 1.21+ Fabric & Iris Documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2 bg-neutral-950 border-b border-neutral-800 text-xs">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'quickstart' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Beginner Quickstart
          </button>
          <button
            onClick={() => setActiveTab('uniforms')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'uniforms' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Iris Uniforms Reference
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'pipeline' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Shaderpack Pipeline
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'faq' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Troubleshooting & Tips
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-neutral-300 leading-relaxed">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-200">
                <h3 className="font-semibold text-emerald-300 text-base mb-1">
                  How Visual Shaders Work (Even for Kids!)
                </h3>
                <p className="text-xs">
                  Shaders are mini-programs that run on your graphics card (GPU) for every single block pixel on screen. Instead of writing math equations by hand, you connect visual cards with wires!
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                  3 Easy Steps to Create Your First Shader
                </h4>

                <div className="flex items-start gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-emerald-400 font-bold text-sm">01</span>
                  <div>
                    <h5 className="font-medium text-white text-xs">Start with a Preset or Blank Canvas</h5>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Click the "Presets" dropdown at the top to load a stunning template like "Fantasy Golden Hour" or "Ghibli Cel-Shaded Anime".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-emerald-400 font-bold text-sm">02</span>
                  <div>
                    <h5 className="font-medium text-white text-xs">Connect Nodes With Wires</h5>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Drag a wire from an output circle (right side) to an input circle (left side). For example, multiply your Block Color by a warm Sunlight Tint, then wire it to ACES Tone Map!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-emerald-400 font-bold text-sm">03</span>
                  <div>
                    <h5 className="font-medium text-white text-xs">Export & Drop into Minecraft</h5>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Click "Export Shaderpack (.zip)". Drop the downloaded zip into your Minecraft <code className="text-emerald-300 bg-neutral-800 px-1 py-0.5 rounded font-mono text-[11px]">.minecraft/shaderpacks/</code> folder!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'uniforms' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Iris automatically injects these GLSL uniform variables into your shader:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    name: 'frameTimeCounter',
                    type: 'float',
                    desc: 'Running animation timer in seconds. Used for waving trees and flowing water waves.',
                  },
                  {
                    name: 'sunPosition',
                    type: 'vec3',
                    desc: 'World position and angle of the sun/moon in the sky. Used for calculating light direction.',
                  },
                  {
                    name: 'worldTime',
                    type: 'int',
                    desc: 'Current Minecraft tick (0 to 24000). 6000 is noon, 12000 is sunset, 18000 is midnight.',
                  },
                  {
                    name: 'rainStrength',
                    type: 'float',
                    desc: 'Weather value (0.0 clear weather to 1.0 heavy rainstorm).',
                  },
                  {
                    name: 'cameraPosition',
                    type: 'vec3',
                    desc: 'Player camera position coordinates in world space.',
                  },
                  {
                    name: 'colortex0',
                    type: 'sampler2D',
                    desc: 'Texture sampler holding the original Minecraft block textures and entity colors.',
                  },
                  {
                    name: 'depthtex0',
                    type: 'sampler2D',
                    desc: 'Depth buffer buffer for calculating distance fog and water depth opacity.',
                  },
                ].map(u => (
                  <div key={u.name} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 text-xs font-semibold">{u.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">{u.type}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{u.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                An Iris shaderpack is composed of standard passes:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-xs font-semibold text-sky-400">gbuffers_terrain.fsh / .vsh</span>
                  <p className="text-xs text-neutral-400 mt-1">
                    Renders all world terrain: grass, stone, wood, dirt, and foliage waving animation.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-xs font-semibold text-cyan-400">gbuffers_water.fsh / .vsh</span>
                  <p className="text-xs text-neutral-400 mt-1">
                    Renders water surfaces, underwater caustics, and ice refraction.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-xs font-semibold text-purple-400">composite.fsh / final.fsh</span>
                  <p className="text-xs text-neutral-400 mt-1">
                    Post-processing passes for color grading, tone mapping, god rays, bloom glow, and camera vignette.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <span className="font-mono text-xs font-semibold text-amber-400">shaders.properties & lang/en_us.lang</span>
                  <p className="text-xs text-neutral-400 mt-1">
                    Generates the in-game Video Settings Shader Options menu with sliders and toggle buttons.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1">
                <h5 className="font-semibold text-white text-xs">Why did the compiler say "type mismatch"?</h5>
                <p className="text-xs text-neutral-400">
                  GLSL is strictly typed. Always write decimal points for floats: write <code className="text-amber-300">1.0</code> instead of <code className="text-rose-300">1</code>.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1">
                <h5 className="font-semibold text-white text-xs">Does this work on Minecraft 1.21+?</h5>
                <p className="text-xs text-neutral-400">
                  Yes! All exported shaderpacks use modern Iris standards compatible with Minecraft 1.21, 1.21.1, and future 1.21+ Fabric/NeoForge releases.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1">
                <h5 className="font-semibold text-white text-xs">Can I write custom GLSL code directly?</h5>
                <p className="text-xs text-neutral-400">
                  Yes! Switch the editor mode from "Auto-Synced" to "Manual Code" or use the "Custom Idea / Formula" node to inject your own mathematical equations.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Got it, Let's Build!
          </button>
        </div>
      </div>
    </div>
  );
};
