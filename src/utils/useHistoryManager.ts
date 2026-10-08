/**
 * Comprehensive Undo / Redo State Management for Minecraft Iris Shader Studio.
 * Handles both Visual Node Canvas (nodes, connections, socket wires, params)
 * and GLSL Code Editor (code text, formatting, snippets, manual mode).
 */

import { useState, useRef, useCallback } from 'react';
import { ShaderNode, NodeConnection, ProjectFile } from '../types/shader';

export interface WorkspaceSnapshot {
  files: ProjectFile[];
  nodes: ShaderNode[];
  connections: NodeConnection[];
  activeFileId: string;
  isManualCodeMode: boolean;
  action: string;
  timestamp: number;
}

const MAX_HISTORY_STEPS = 50;

export function useHistoryManager(initialState: {
  files: ProjectFile[];
  nodes: ShaderNode[];
  connections: NodeConnection[];
  activeFileId: string;
  isManualCodeMode: boolean;
}) {
  const [past, setPast] = useState<WorkspaceSnapshot[]>([]);
  const [future, setFuture] = useState<WorkspaceSnapshot[]>([]);
  const [lastAction, setLastAction] = useState<string>('Initial State');

  // Keep a ref of the current state snapshot to avoid stale closures
  const currentSnapshotRef = useRef<WorkspaceSnapshot>({
    files: JSON.parse(JSON.stringify(initialState.files)),
    nodes: JSON.parse(JSON.stringify(initialState.nodes)),
    connections: JSON.parse(JSON.stringify(initialState.connections)),
    activeFileId: initialState.activeFileId,
    isManualCodeMode: initialState.isManualCodeMode,
    action: 'Initial State',
    timestamp: Date.now(),
  });

  // Debounce tracking for continuous typing
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const beforeTypingSnapshotRef = useRef<WorkspaceSnapshot | null>(null);

  /**
   * Pushes a new snapshot onto the history stack and clears future
   */
  const pushState = useCallback((
    newState: {
      files: ProjectFile[];
      nodes: ShaderNode[];
      connections: NodeConnection[];
      activeFileId?: string;
      isManualCodeMode?: boolean;
    },
    action: string,
    isDebouncedTyping: boolean = false
  ) => {
    const nextSnapshot: WorkspaceSnapshot = {
      files: JSON.parse(JSON.stringify(newState.files)),
      nodes: JSON.parse(JSON.stringify(newState.nodes)),
      connections: JSON.parse(JSON.stringify(newState.connections)),
      activeFileId: newState.activeFileId ?? currentSnapshotRef.current.activeFileId,
      isManualCodeMode: newState.isManualCodeMode ?? currentSnapshotRef.current.isManualCodeMode,
      action,
      timestamp: Date.now(),
    };

    if (isDebouncedTyping) {
      // Capture the state BEFORE typing began if not already captured
      if (!beforeTypingSnapshotRef.current) {
        beforeTypingSnapshotRef.current = currentSnapshotRef.current;
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = setTimeout(() => {
        if (beforeTypingSnapshotRef.current) {
          const snapshotBeforeTyping = beforeTypingSnapshotRef.current;
          setPast(prevPast => {
            const nextPast = [...prevPast, snapshotBeforeTyping];
            return nextPast.length > MAX_HISTORY_STEPS ? nextPast.slice(-MAX_HISTORY_STEPS) : nextPast;
          });
          setFuture([]);
          setLastAction(action);
          beforeTypingSnapshotRef.current = null;
        }
      }, 650);

      currentSnapshotRef.current = nextSnapshot;
      return;
    }

    // Immediate action (node added, node moved, wire connected, snippet inserted, format code)
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    // If there was a pending typing sequence, commit that first
    if (beforeTypingSnapshotRef.current) {
      const pendingBefore = beforeTypingSnapshotRef.current;
      beforeTypingSnapshotRef.current = null;
      setPast(prevPast => {
        const nextPast = [...prevPast, pendingBefore, currentSnapshotRef.current];
        return nextPast.length > MAX_HISTORY_STEPS ? nextPast.slice(-MAX_HISTORY_STEPS) : nextPast;
      });
    } else {
      setPast(prevPast => {
        const nextPast = [...prevPast, currentSnapshotRef.current];
        return nextPast.length > MAX_HISTORY_STEPS ? nextPast.slice(-MAX_HISTORY_STEPS) : nextPast;
      });
    }

    setFuture([]);
    setLastAction(action);
    currentSnapshotRef.current = nextSnapshot;
  }, []);

  /**
   * Performs Undo operation
   */
  const undo = useCallback((
    applyState: (snapshot: WorkspaceSnapshot) => void
  ) => {
    // If user was actively typing, undo the typing session first
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (beforeTypingSnapshotRef.current) {
      const priorState = beforeTypingSnapshotRef.current;
      beforeTypingSnapshotRef.current = null;

      setFuture(prevFuture => [currentSnapshotRef.current, ...prevFuture]);
      setLastAction(`Undo: Typing`);
      currentSnapshotRef.current = priorState;
      applyState(priorState);
      return;
    }

    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;

      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFuture(prevFuture => [currentSnapshotRef.current, ...prevFuture]);
      setLastAction(`Undo: ${previous.action}`);
      currentSnapshotRef.current = previous;

      // Apply the state to the parent App component
      applyState(previous);

      return newPast;
    });
  }, []);

  /**
   * Performs Redo operation
   */
  const redo = useCallback((
    applyState: (snapshot: WorkspaceSnapshot) => void
  ) => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    beforeTypingSnapshotRef.current = null;

    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;

      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast(prevPast => [...prevPast, currentSnapshotRef.current]);
      setLastAction(`Redo: ${next.action}`);
      currentSnapshotRef.current = next;

      // Apply the state to the parent App component
      applyState(next);

      return newFuture;
    });
  }, []);

  /**
   * Reset / clear history (e.g. when loading a new preset)
   */
  const resetHistory = useCallback((newState: {
    files: ProjectFile[];
    nodes: ShaderNode[];
    connections: NodeConnection[];
    activeFileId: string;
    isManualCodeMode: boolean;
  }) => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    beforeTypingSnapshotRef.current = null;

    currentSnapshotRef.current = {
      files: JSON.parse(JSON.stringify(newState.files)),
      nodes: JSON.parse(JSON.stringify(newState.nodes)),
      connections: JSON.parse(JSON.stringify(newState.connections)),
      activeFileId: newState.activeFileId,
      isManualCodeMode: newState.isManualCodeMode,
      action: 'Load Preset',
      timestamp: Date.now(),
    };
    setPast([]);
    setFuture([]);
    setLastAction('Load Preset');
  }, []);

  return {
    canUndo: past.length > 0 || beforeTypingSnapshotRef.current !== null,
    canRedo: future.length > 0,
    undoCount: past.length + (beforeTypingSnapshotRef.current ? 1 : 0),
    redoCount: future.length,
    lastAction,
    pushState,
    undo,
    redo,
    resetHistory,
    currentSnapshot: currentSnapshotRef.current,
  };
}
