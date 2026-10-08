/**
 * Visual Node Scripting Canvas for Minecraft Iris Shaders
 * Tactile drag-and-drop node graph with wire connections, inline controls, and quick search.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ShaderNode, 
  NodeConnection, 
  NodePort, 
  NodeCategory,
  PortDataType 
} from '../types/shader';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Wand2, 
  Sliders, 
  Sun, 
  Sparkles, 
  Palette, 
  Calculator, 
  Code2, 
  Wind, 
  Droplets,
  HelpCircle,
  Undo2,
  Redo2
} from 'lucide-react';

interface VisualNodeCanvasProps {
  nodes: ShaderNode[];
  connections: NodeConnection[];
  onNodesChange: (nodes: ShaderNode[], actionDescription?: string) => void;
  onConnectionsChange: (connections: NodeConnection[], actionDescription?: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const PORT_COLORS: Record<PortDataType, string> = {
  float: '#f59e0b', // amber
  vec2: '#0ea5e9',  // sky
  vec3: '#10b981',  // emerald
  vec4: '#a855f7',  // violet
  color: '#ec4899', // pink
  sampler2D: '#6366f1', // indigo
  bool: '#f43f5e',  // rose
};

// Available node templates for the "+ Add Node" palette
interface NodeCatalogItem {
  id: string;
  name: string;
  category: NodeCategory;
  description: string;
  icon: any;
  inputs: Array<{ id: string; name: string; type: PortDataType; defaultValue?: any; value?: any }>;
  outputs: Array<{ id: string; name: string; type: PortDataType }>;
  defaultData?: Record<string, any>;
  customCode?: string;
}

const NODE_CATALOG: NodeCatalogItem[] = [
  // --- Iris Inputs ---
  {
    id: 'iris_time',
    name: 'Frame Time Counter',
    category: 'input',
    description: 'Animated running clock from Iris (seconds elapsed)',
    icon: Sparkles,
    inputs: [],
    outputs: [{ id: 'time', name: 'Time (sec)', type: 'float' }],
  },
  {
    id: 'iris_sun_pos',
    name: 'Sun Direction Vector',
    category: 'input',
    description: 'Normalized sun/moon direction vector in sky',
    icon: Sun,
    inputs: [],
    outputs: [{ id: 'sunDir', name: 'Light Dir', type: 'vec3' }],
  },
  {
    id: 'iris_albedo',
    name: 'Block Albedo Color',
    category: 'input',
    description: 'Original block texture color & biome tint',
    icon: Palette,
    inputs: [],
    outputs: [
      { id: 'color', name: 'RGBA', type: 'vec4' },
      { id: 'rgb', name: 'RGB', type: 'vec3' },
    ],
  },
  {
    id: 'iris_rain',
    name: 'Rain Strength',
    category: 'input',
    description: 'Iris weather strength (0.0 clear to 1.0 storm)',
    icon: Droplets,
    inputs: [],
    outputs: [{ id: 'rain', name: 'Rain (0-1)', type: 'float' }],
  },

  // --- Color & Lighting ---
  {
    id: 'color_picker',
    name: 'Color Constant',
    category: 'color',
    description: 'Custom tint or sunlight color',
    icon: Palette,
    inputs: [],
    outputs: [{ id: 'color', name: 'Color', type: 'vec3' }],
    defaultData: { hex: '#ffca7a' },
  },
  {
    id: 'cel_shading',
    name: 'Toon Cel-Shading',
    category: 'color',
    description: 'Discretizes light into anime stepped bands',
    icon: Wand2,
    inputs: [{ id: 'inColor', name: 'Input RGB', type: 'vec3' }],
    outputs: [{ id: 'out', name: 'Toon Shaded', type: 'vec3' }],
    defaultData: { steps: 3 },
  },
  {
    id: 'aces_tone',
    name: 'ACES Tone Map',
    category: 'color',
    description: 'Cinematic filmic color curve',
    icon: Sliders,
    inputs: [{ id: 'inColor', name: 'HDR RGB', type: 'vec3' }],
    outputs: [{ id: 'out', name: 'Graded RGB', type: 'vec3' }],
    defaultData: { exposure: 1.2 },
  },
  {
    id: 'ambient_light',
    name: 'Ambient Sky Bounce',
    category: 'color',
    description: 'Soft skylight fill in shadows',
    icon: Sun,
    inputs: [{ id: 'inColor', name: 'Base RGB', type: 'vec3' }],
    outputs: [{ id: 'out', name: 'Illuminated', type: 'vec3' }],
    defaultData: { strength: 0.4 },
  },

  // --- Minecraft Effects ---
  {
    id: 'waving_leaves',
    name: 'Waving Foliage Wind',
    category: 'effects',
    description: 'Calculates natural breeze sway for trees and grass',
    icon: Wind,
    inputs: [],
    outputs: [{ id: 'offset', name: 'Wave Offset', type: 'vec3' }],
    defaultData: { speed: 2.2, strength: 0.18 },
  },
  {
    id: 'water_waves',
    name: 'Water Waves & Caustic',
    category: 'effects',
    description: 'Reflective crystal waves and seabed caustic patterns',
    icon: Droplets,
    inputs: [],
    outputs: [
      { id: 'color', name: 'Water Tint', type: 'vec3' },
      { id: 'caustic', name: 'Caustic Glow', type: 'float' },
    ],
    defaultData: { speed: 2.0 },
  },
  {
    id: 'bloom_glow',
    name: 'Bloom & Ore Glow',
    category: 'effects',
    description: 'Extracts glowing torchlight and emissive highlights',
    icon: Sparkles,
    inputs: [{ id: 'inColor', name: 'Input RGB', type: 'vec3' }],
    outputs: [{ id: 'out', name: 'Glow RGB', type: 'vec3' }],
    defaultData: { threshold: 0.75 },
  },
  {
    id: 'vignette_effect',
    name: 'Camera Vignette',
    category: 'effects',
    description: 'Darkens viewport borders for cinematic focus',
    icon: Sliders,
    inputs: [{ id: 'inColor', name: 'Input RGB', type: 'vec3' }],
    outputs: [{ id: 'out', name: 'Vignette RGB', type: 'vec3' }],
    defaultData: { intensity: 0.35 },
  },
  {
    id: 'pixelate_effect',
    name: 'Retro Pixelator',
    category: 'effects',
    description: 'Quantizes coordinates into chunky virtual retro pixels',
    icon: Sparkles,
    inputs: [],
    outputs: [{ id: 'out', name: 'Pixel Color', type: 'vec3' }],
    defaultData: { resolution: 96.0 },
  },

  // --- Math & Operations ---
  {
    id: 'math_mult',
    name: 'Multiply',
    category: 'math',
    description: 'Multiplies two colors or values together',
    icon: Calculator,
    inputs: [
      { id: 'a', name: 'A', type: 'vec3' },
      { id: 'b', name: 'B', type: 'vec3' },
    ],
    outputs: [{ id: 'out', name: 'Result', type: 'vec3' }],
  },
  {
    id: 'math_add',
    name: 'Add / Combine',
    category: 'math',
    description: 'Adds two values or color layers together',
    icon: Calculator,
    inputs: [
      { id: 'a', name: 'A', type: 'vec3' },
      { id: 'b', name: 'B', type: 'vec3' },
    ],
    outputs: [{ id: 'out', name: 'Result', type: 'vec3' }],
  },
  {
    id: 'math_mix',
    name: 'Mix / Lerp',
    category: 'math',
    description: 'Smoothly blends between Color A and Color B',
    icon: Calculator,
    inputs: [
      { id: 'a', name: 'A', type: 'vec3' },
      { id: 'b', name: 'B', type: 'vec3' },
      { id: 'factor', name: 'Blend (0-1)', type: 'float', defaultValue: 0.5 },
    ],
    outputs: [{ id: 'out', name: 'Blended', type: 'vec3' }],
  },
  {
    id: 'math_slider',
    name: 'Number Slider',
    category: 'math',
    description: 'Custom float slider parameter',
    icon: Sliders,
    inputs: [],
    outputs: [{ id: 'val', name: 'Value', type: 'float' }],
    defaultData: { value: 1.0, min: 0.0, max: 5.0, step: 0.05 },
  },

  // --- Custom Idea / Formula ---
  {
    id: 'custom_logic',
    name: 'Custom Idea / Formula',
    category: 'custom',
    description: 'Write any custom math formula or Iris effect expression',
    icon: Code2,
    inputs: [
      { id: 'inA', name: 'Input A', type: 'vec3' },
      { id: 'inB', name: 'Input B', type: 'vec3' },
      { id: 'inC', name: 'Input C', type: 'float', defaultValue: 0.5 },
    ],
    outputs: [{ id: 'out', name: 'Custom Out', type: 'vec3' }],
    customCode: 'inA * inB + sin(inC * 6.28)',
  },
];

export const VisualNodeCanvas: React.FC<VisualNodeCanvasProps> = ({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Canvas pan & zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartNodePosRef = useRef<{ x: number; y: number } | null>(null);

  // Wire connection dragging state
  const [activeWire, setActiveWire] = useState<{
    fromNodeId: string;
    fromPortId: string;
    fromType: PortDataType;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Palette modal state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Keyboard Shortcuts: Ctrl+Z / Cmd+Z for Undo, Ctrl+Y / Cmd+Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (onUndo && canUndo) {
          onUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'y' || e.key === 'Y')
      ) {
        e.preventDefault();
        if (onRedo && canRedo) {
          onRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);

  // Handle Canvas Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking empty background
    if ((e.target as HTMLElement).closest('.shader-node-card')) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (draggingNodeId) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const mouseX = (e.clientX - containerRect.left - pan.x) / zoom;
      const mouseY = (e.clientY - containerRect.top - pan.y) / zoom;

      onNodesChange(
        nodes.map(node =>
          node.id === draggingNodeId
            ? {
                ...node,
                x: Math.round(mouseX - dragOffsetRef.current.x),
                y: Math.round(mouseY - dragOffsetRef.current.y),
              }
            : node
        )
      );
      return;
    }

    if (activeWire && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const currentX = (e.clientX - containerRect.left - pan.x) / zoom;
      const currentY = (e.clientY - containerRect.top - pan.y) / zoom;
      setActiveWire(prev => (prev ? { ...prev, currentX, currentY } : null));
    }
  }, [isPanning, draggingNodeId, activeWire, pan, zoom, nodes, onNodesChange]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggingNodeId && dragStartNodePosRef.current) {
      const draggedNode = nodes.find(n => n.id === draggingNodeId);
      if (draggedNode && (draggedNode.x !== dragStartNodePosRef.current.x || draggedNode.y !== dragStartNodePosRef.current.y)) {
        onNodesChange(nodes, 'Move Node');
      }
    }
    dragStartNodePosRef.current = null;
    setDraggingNodeId(null);
    setActiveWire(null);
  }, [draggingNodeId, nodes, onNodesChange]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(z => Math.max(0.4, Math.min(1.8, z * zoomFactor)));
  };

  // Node Dragging Start
  const startDragNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - containerRect.left - pan.x) / zoom;
    const mouseY = (e.clientY - containerRect.top - pan.y) / zoom;

    dragOffsetRef.current = {
      x: mouseX - node.x,
      y: mouseY - node.y,
    };
    dragStartNodePosRef.current = { x: node.x, y: node.y };
    setDraggingNodeId(nodeId);
  };

  // Node Dragging Touch Start (Mobile & Tablet)
  const startDragNodeTouch = (nodeId: string, e: React.TouchEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current || e.touches.length !== 1) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - containerRect.left - pan.x) / zoom;
    const touchY = (e.touches[0].clientY - containerRect.top - pan.y) / zoom;

    dragOffsetRef.current = {
      x: touchX - node.x,
      y: touchY - node.y,
    };
    dragStartNodePosRef.current = { x: node.x, y: node.y };
    setDraggingNodeId(nodeId);
  };

  // Canvas Touch Events for Mobile Panning & Pinch-to-Zoom
  const touchStartDistRef = useRef<number | null>(null);

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.shader-node-card')) return;
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
      touchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - panStartRef.current.x,
        y: e.touches[0].clientY - panStartRef.current.y,
      });
      return;
    }

    if (draggingNodeId && e.touches.length === 1 && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const touchX = (e.touches[0].clientX - containerRect.left - pan.x) / zoom;
      const touchY = (e.touches[0].clientY - containerRect.top - pan.y) / zoom;

      onNodesChange(
        nodes.map(node =>
          node.id === draggingNodeId
            ? {
                ...node,
                x: Math.round(touchX - dragOffsetRef.current.x),
                y: Math.round(touchY - dragOffsetRef.current.y),
              }
            : node
        )
      );
      return;
    }

    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = currentDist - touchStartDistRef.current;
      setZoom(z => Math.max(0.4, Math.min(1.8, z + diff * 0.003)));
      touchStartDistRef.current = currentDist;
    }
  };

  const handleCanvasTouchEnd = () => {
    setIsPanning(false);
    if (draggingNodeId && dragStartNodePosRef.current) {
      const draggedNode = nodes.find(n => n.id === draggingNodeId);
      if (draggedNode && (draggedNode.x !== dragStartNodePosRef.current.x || draggedNode.y !== dragStartNodePosRef.current.y)) {
        onNodesChange(nodes, 'Move Node');
      }
    }
    dragStartNodePosRef.current = null;
    setDraggingNodeId(null);
    touchStartDistRef.current = null;
  };

  // Wire Port Connection Handling
  const startConnectingPort = (node: ShaderNode, port: NodePort, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    const portEl = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const startX = (portEl.left + portEl.width / 2 - containerRect.left - pan.x) / zoom;
    const startY = (portEl.top + portEl.height / 2 - containerRect.top - pan.y) / zoom;

    setActiveWire({
      fromNodeId: node.id,
      fromPortId: port.id,
      fromType: port.type,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  };

  const completeConnection = (toNode: ShaderNode, toPort: NodePort, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeWire) return;
    if (activeWire.fromNodeId === toNode.id) return; // Prevent self loop

    // Remove any existing connection to this target input port (single input connection rule)
    const filtered = connections.filter(
      c => !(c.toNodeId === toNode.id && c.toPortId === toPort.id)
    );

    const newConnection: NodeConnection = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fromNodeId: activeWire.fromNodeId,
      fromPortId: activeWire.fromPortId,
      toNodeId: toNode.id,
      toPortId: toPort.id,
    };

    onConnectionsChange([...filtered, newConnection], 'Connect Wire');
    setActiveWire(null);
  };

  const removeConnection = (connectionId: string) => {
    onConnectionsChange(connections.filter(c => c.id !== connectionId), 'Disconnect Wire');
  };

  // Node deletion
  const deleteNode = (nodeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (nodeId === 'master_output') return; // Cannot delete master output
    onNodesChange(nodes.filter(n => n.id !== nodeId), 'Delete Node');
    onConnectionsChange(connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId), 'Delete Node Wires');
  };

  // Node duplication
  const duplicateNode = (node: ShaderNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (node.id === 'master_output') return;

    const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newNode: ShaderNode = {
      ...node,
      id: newNodeId,
      x: node.x + 40,
      y: node.y + 40,
      data: node.data ? JSON.parse(JSON.stringify(node.data)) : undefined,
    };
    onNodesChange([...nodes, newNode], 'Duplicate Node');
  };

  // Update node data
  const updateNodeData = (nodeId: string, key: string, value: any) => {
    onNodesChange(
      nodes.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            [key]: value,
          },
        };
      }),
      'Update Node Setting'
    );
  };

  const updateCustomCode = (nodeId: string, code: string) => {
    onNodesChange(
      nodes.map(n => (n.id === nodeId ? { ...n, customCode: code } : n)),
      'Update Custom Formula'
    );
  };

  // Add new node from Catalog
  const spawnNode = (item: NodeCatalogItem) => {
    const newNodeId = `n_${item.id}_${Date.now().toString().slice(-4)}`;
    const newNode: ShaderNode = {
      id: newNodeId,
      name: item.name,
      category: item.category,
      description: item.description,
      x: Math.round(-pan.x / zoom + 200 + Math.random() * 60),
      y: Math.round(-pan.y / zoom + 150 + Math.random() * 60),
      inputs: JSON.parse(JSON.stringify(item.inputs)),
      outputs: JSON.parse(JSON.stringify(item.outputs)),
      defaultData: item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : undefined,
      data: item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : undefined,
      customCode: item.customCode,
    };

    onNodesChange([...nodes, newNode], `Add Node: ${item.name}`);
    setIsAddMenuOpen(false);
  };

  // Auto-Arrange Layout
  const autoArrangeNodes = () => {
    // Sort into visual columns by flow
    const arranged = [...nodes];
    let startX = 60;
    let colY = 120;

    // Inputs
    arranged.filter(n => n.category === 'input' || n.category === 'color').forEach((n, idx) => {
      n.x = 60;
      n.y = 100 + idx * 160;
    });

    // Math & Effects
    arranged.filter(n => n.category === 'math' || n.category === 'effects' || n.category === 'custom').forEach((n, idx) => {
      n.x = 420 + (idx % 2) * 280;
      n.y = 100 + Math.floor(idx / 2) * 180;
    });

    // Output
    const master = arranged.find(n => n.id === 'master_output' || n.category === 'output');
    if (master) {
      master.x = 1080;
      master.y = 200;
    }

    onNodesChange(arranged, 'Auto-Arrange Nodes');
    setPan({ x: 30, y: 30 });
    setZoom(0.9);
  };

  // Filter Catalog
  const filteredCatalog = NODE_CATALOG.filter(item => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 h-full bg-[#0d1117] overflow-hidden select-none touch-none"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleCanvasTouchMove}
      onTouchEnd={handleCanvasTouchEnd}
      style={{
        backgroundImage: `
          radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
        `,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          onClick={() => setIsAddMenuOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Node</span>
        </button>

        {/* Undo / Redo Toolbar Controls */}
        <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 backdrop-blur-md text-neutral-400">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Undo Node Action (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer disabled:cursor-not-allowed border-l border-neutral-800"
            title="Redo Node Action (Ctrl+Y or Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={autoArrangeNodes}
          title="Auto-arrange nodes neatly"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 text-xs rounded-lg border border-neutral-800 backdrop-blur-md transition-colors cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Auto Layout</span>
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 backdrop-blur-md text-neutral-400">
          <button
            onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
            className="p-1 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1.5 text-neutral-300 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            className="p-1 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 30, y: 30 }); }}
            className="p-1 hover:text-white transition-colors border-l border-neutral-800"
            title="Reset Zoom & Pan"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Connections Layer */}
      <svg
        className="absolute inset-0 pointer-events-none z-10 w-full h-full overflow-visible"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <filter id="wire-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Existing Connections */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.fromNodeId);
          const toNode = nodes.find(n => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;

          // Compute port coordinates relative to node position
          const fromPortIndex = fromNode.outputs.findIndex(p => p.id === conn.fromPortId);
          const toPortIndex = toNode.inputs.findIndex(p => p.id === conn.toPortId);

          const fromX = fromNode.x + 220; // width of node card
          const fromY = fromNode.y + 44 + (fromPortIndex >= 0 ? fromPortIndex * 26 : 0);

          const toX = toNode.x;
          const toY = toNode.y + 44 + (toPortIndex >= 0 ? toPortIndex * 26 : 0);

          const dx = Math.abs(toX - fromX) * 0.5;
          const pathD = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

          return (
            <g key={conn.id} className="pointer-events-auto group cursor-pointer">
              {/* Invisible thicker hit-box path for easier clicking */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                onClick={() => removeConnection(conn.id)}
              />
              {/* Visible wire curve */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#wire-gradient)"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="transition-all group-hover:stroke-rose-400 group-hover:stroke-[3.5]"
                filter="url(#wire-glow)"
              />
            </g>
          );
        })}

        {/* Active In-Progress Dragging Wire */}
        {activeWire && (
          <path
            d={`M ${activeWire.startX} ${activeWire.startY} C ${activeWire.startX + 60} ${activeWire.startY}, ${activeWire.currentX - 60} ${activeWire.currentY}, ${activeWire.currentX} ${activeWire.currentY}`}
            fill="none"
            stroke={PORT_COLORS[activeWire.fromType] || '#10b981'}
            strokeWidth={3}
            strokeDasharray="5,5"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Render Node Cards */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map(node => {
          const isMaster = node.id === 'master_output' || node.category === 'output';

          return (
            <div
              key={node.id}
              className={`shader-node-card absolute w-[220px] rounded-xl shadow-xl border backdrop-blur-md transition-shadow select-none ${
                isMaster
                  ? 'bg-neutral-900/95 border-emerald-500/60 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                  : 'bg-neutral-900/90 border-neutral-700/80 shadow-black/50 hover:border-neutral-600'
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
            >
              {/* Node Header */}
              <div
                onMouseDown={e => startDragNode(node.id, e)}
                onTouchStart={e => startDragNodeTouch(node.id, e)}
                className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing rounded-t-xl ${
                  isMaster 
                    ? 'bg-emerald-950/40 border-emerald-800/40' 
                    : 'bg-neutral-800/60 border-neutral-700/50'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-2 h-2 rounded-full ${
                    node.category === 'input' ? 'bg-sky-400' :
                    node.category === 'color' ? 'bg-amber-400' :
                    node.category === 'effects' ? 'bg-purple-400' :
                    node.category === 'math' ? 'bg-emerald-400' :
                    isMaster ? 'bg-emerald-400' : 'bg-neutral-400'
                  }`} />
                  <span className="text-xs font-semibold text-neutral-100 truncate">
                    {node.name}
                  </span>
                </div>

                {!isMaster && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => duplicateNode(node, e)}
                      title="Duplicate node"
                      className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => deleteNode(node.id, e)}
                      title="Delete node"
                      className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Node Body with Input and Output Ports */}
              <div className="p-2.5 space-y-2">
                {/* Ports layout */}
                <div className="flex justify-between items-start gap-2">
                  {/* Inputs Column (Left) */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    {node.inputs.map(port => {
                      const isConnected = connections.some(
                        c => c.toNodeId === node.id && c.toPortId === port.id
                      );
                      const portColor = PORT_COLORS[port.type] || '#10b981';

                      return (
                        <div
                          key={port.id}
                          className="flex items-center gap-1.5 group"
                          onMouseUp={e => completeConnection(node, port, e)}
                        >
                          <div
                            className="w-3 h-3 rounded-full border-2 transition-transform group-hover:scale-125 cursor-crosshair"
                            style={{
                              borderColor: portColor,
                              backgroundColor: isConnected ? portColor : '#171717',
                            }}
                          />
                          <span className="text-[11px] text-neutral-300 font-medium truncate">
                            {port.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Outputs Column (Right) */}
                  <div className="flex flex-col gap-1.5 items-end flex-1">
                    {node.outputs.map(port => {
                      const isConnected = connections.some(
                        c => c.fromNodeId === node.id && c.fromPortId === port.id
                      );
                      const portColor = PORT_COLORS[port.type] || '#10b981';

                      return (
                        <div
                          key={port.id}
                          className="flex items-center gap-1.5 group cursor-crosshair"
                          onMouseDown={e => startConnectingPort(node, port, e)}
                        >
                          <span className="text-[11px] text-neutral-300 font-medium truncate text-right">
                            {port.name}
                          </span>
                          <div
                            className="w-3 h-3 rounded-full border-2 transition-transform group-hover:scale-125"
                            style={{
                              borderColor: portColor,
                              backgroundColor: isConnected ? portColor : '#171717',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inline Controls (Color picker, sliders, expression) */}
                {node.data?.hex !== undefined && (
                  <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={node.data.hex}
                        onChange={e => updateNodeData(node.id, 'hex', e.target.value)}
                        className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer p-0"
                      />
                      <span className="font-mono text-[10px] text-neutral-300">
                        {node.data.hex}
                      </span>
                    </div>
                  </div>
                )}

                {node.data?.speed !== undefined && (
                  <div className="pt-1.5 border-t border-neutral-800 space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Wind Speed</span>
                      <span className="font-mono text-neutral-300">{node.data.speed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="6.0"
                      step="0.1"
                      value={node.data.speed}
                      onChange={e => updateNodeData(node.id, 'speed', Number(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                {node.data?.strength !== undefined && (
                  <div className="pt-1 border-neutral-800 space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Strength</span>
                      <span className="font-mono text-neutral-300">{node.data.strength}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.8"
                      step="0.02"
                      value={node.data.strength}
                      onChange={e => updateNodeData(node.id, 'strength', Number(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                {node.data?.steps !== undefined && (
                  <div className="pt-1.5 border-t border-neutral-800 space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Anime Bands</span>
                      <span className="font-mono text-neutral-300">{node.data.steps}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="6"
                      step="1"
                      value={node.data.steps}
                      onChange={e => updateNodeData(node.id, 'steps', Number(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                {node.data?.value !== undefined && (
                  <div className="pt-1.5 border-t border-neutral-800 space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Value</span>
                      <span className="font-mono text-neutral-300">{node.data.value}</span>
                    </div>
                    <input
                      type="range"
                      min={node.data.min ?? 0}
                      max={node.data.max ?? 5}
                      step={node.data.step ?? 0.05}
                      value={node.data.value}
                      onChange={e => updateNodeData(node.id, 'value', Number(e.target.value))}
                      className="w-full h-1 bg-neutral-700 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* Custom expression code box */}
                {node.category === 'custom' && (
                  <div className="pt-1.5 border-t border-neutral-800 space-y-1">
                    <div className="text-[10px] text-neutral-400">Custom GLSL Math</div>
                    <input
                      type="text"
                      value={node.customCode || ''}
                      onChange={e => updateCustomCode(node.id, e.target.value)}
                      placeholder="inA * inB + inC"
                      className="w-full px-2 py-1 bg-neutral-950 font-mono text-[11px] text-emerald-300 rounded border border-neutral-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Add Node Drawer / Modal */}
      {isAddMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIsAddMenuOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Add Shader Logic Node</h3>
                <p className="text-xs text-neutral-400">Choose a node to add into your visual Minecraft shader graph</p>
              </div>
              <button
                onClick={() => setIsAddMenuOpen(false)}
                className="text-neutral-400 hover:text-white text-sm px-2 py-1 rounded bg-neutral-800"
              >
                Close
              </button>
            </div>

            {/* Search and Category Filters */}
            <div className="p-3 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search nodes (e.g. wave, sun, toon, bloom, water)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1 text-xs">
                {['all', 'input', 'color', 'effects', 'math', 'custom'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'text-neutral-400 hover:text-white bg-neutral-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Nodes */}
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {filteredCatalog.map(item => {
                const Icon = item.icon || Sparkles;

                return (
                  <button
                    key={item.id}
                    onClick={() => spawnNode(item)}
                    className="flex items-start gap-3 p-3 bg-neutral-850 hover:bg-neutral-800/90 border border-neutral-800 hover:border-emerald-500/50 rounded-xl text-left transition-all group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-neutral-900 group-hover:bg-emerald-950 text-neutral-300 group-hover:text-emerald-400 border border-neutral-800 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                        {item.description}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-neutral-500 capitalize">
                          {item.category}
                        </span>
                        <span className="text-neutral-600">·</span>
                        <span className="text-[10px] text-neutral-400">
                          {item.outputs.length} out
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
