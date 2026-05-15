import { create } from 'zustand';
import type { WorkflowGraphDefinition } from '@/types/workflow-graph';

export type NodePosition = { x: number; y: number };

export type Selection =
  | { kind: 'state'; stateId: string }
  | { kind: 'transition'; id: string }
  | null;

type SyncSource = 'visual' | 'json' | 'init';

type BuilderState = {
  definition: WorkflowGraphDefinition;
  /** Persisted positions keyed by state ID (not in backend payload). */
  positions: Record<string, NodePosition>;
  selection: Selection;
  /** Incremented when the graph mutates via canvas (for Monaco resync). */
  visualRevision: number;
  lastSource: SyncSource;
  jsonError: string | null;

  reset: (def: WorkflowGraphDefinition) => void;
  /** Apply after successful JSON validation. */
  applyDefinitionFromJson: (def: WorkflowGraphDefinition) => void;
  setJsonError: (msg: string | null) => void;
  bumpVisual: () => void;
  setSelection: (s: Selection) => void;

  setDefinition: (def: WorkflowGraphDefinition, source: SyncSource) => void;
  updatePositions: (id: string, pos: NodePosition) => void;
  addState: (name: string, pos?: NodePosition) => void;
  updateState: (id: string, next: { name: string; isInitial: boolean }) => void;
  removeState: (id: string) => void;
  addTransition: (t: WorkflowGraphDefinition['transitions'][0]) => void;
  updateTransition: (id: string, patch: Partial<WorkflowGraphDefinition['transitions'][0]>) => void;
  removeTransition: (id: string) => void;
};

let nameCounter = 1;
export function suggestStateName(existing: Set<string>): string {
  let n = nameCounter++;
  let candidate = `State ${n}`;
  while (existing.has(candidate)) {
    candidate = `State ${++n}`;
  }
  return candidate;
}

function ensureSingleInitial(def: WorkflowGraphDefinition, preferredInitialId: string | null): WorkflowGraphDefinition {
  if (!def.states.length) return def;
  const initialId =
    preferredInitialId && def.states.some((s) => s.id === preferredInitialId)
      ? preferredInitialId
      : def.states.find((s) => s.isInitial)?.id ?? def.states[0].id;
  return {
    ...def,
    states: def.states.map((s) => ({ ...s, isInitial: s.id === initialId })),
  };
}

export const useWorkflowBuilderStore = create<BuilderState>((set, get) => ({
  definition: { states: [], transitions: [] },
  positions: {},
  selection: null,
  visualRevision: 0,
  lastSource: 'init',
  jsonError: null,

  reset: (def) => {
    const positions: Record<string, NodePosition> = {};
    const states = def.states.map((s) => ({ ...s, id: s.id ?? crypto.randomUUID() }));
    const stateMap = new Map(states.map((s) => [s.name, s.id!]));

    const transitions = def.transitions.map((t) => ({
      ...t,
      id: t.id ?? crypto.randomUUID(),
      fromStateId: t.fromStateId ?? (t.fromStateName ? stateMap.get(t.fromStateName) : undefined),
      toStateId: t.toStateId ?? (t.toStateName ? stateMap.get(t.toStateName) : undefined),
      fromStateName: undefined,
      toStateName: undefined,
    }));

    states.forEach((s, i) => {
      positions[s.id!] = { x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 };
    });

    set({
      definition: { states, transitions },
      positions,
      selection: null,
      visualRevision: 0,
      lastSource: 'init',
      jsonError: null,
    });
  },

  setJsonError: (msg) => set({ jsonError: msg }),

  bumpVisual: () =>
    set((s) => ({
      visualRevision: s.visualRevision + 1,
      lastSource: 'visual',
    })),

  setSelection: (selection) => set({ selection }),

  applyDefinitionFromJson: (def) => {
    const prevPos = get().positions;
    const nextPos: Record<string, NodePosition> = {};

    const states = def.states.map((s) => ({ ...s, id: s.id ?? crypto.randomUUID() }));
    const stateMap = new Map(states.map((s) => [s.name, s.id!]));

    const transitions = def.transitions.map((t) => ({
      ...t,
      id: t.id ?? crypto.randomUUID(),
      fromStateId: t.fromStateId ?? (t.fromStateName ? stateMap.get(t.fromStateName) : undefined),
      toStateId: t.toStateId ?? (t.toStateName ? stateMap.get(t.toStateName) : undefined),
      fromStateName: undefined,
      toStateName: undefined,
    }));

    states.forEach((st, i) => {
      nextPos[st.id!] = prevPos[st.id!] ?? { x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 };
    });

    set({
      definition: { states, transitions },
      positions: nextPos,
      lastSource: 'json',
      jsonError: null,
      visualRevision: get().visualRevision + 1,
    });
  },

  setDefinition: (def, source) =>
    set({
      definition: structuredClone(def),
      lastSource: source,
    }),

  updatePositions: (id, pos) =>
    set((s) => ({
      positions: { ...s.positions, [id]: pos },
      lastSource: 'visual',
    })),

  addState: (name, pos) => {
    const { definition, positions } = get();
    const existingNames = new Set(definition.states.map((x) => x.name));
    if (existingNames.has(name)) return;
    const isFirst = definition.states.length === 0;
    const newId = crypto.randomUUID();
    const nextStates = [...definition.states, { id: newId, name, isInitial: isFirst }];
    const nextDef = ensureSingleInitial({ ...definition, states: nextStates }, isFirst ? newId : null);
    const p = pos ?? { x: 120 + existingNames.size * 40, y: 120 + existingNames.size * 30 };
    set((s) => ({
      definition: nextDef,
      positions: { ...positions, [newId]: p },
      selection: { kind: 'state', stateId: newId },
      lastSource: 'visual',
      visualRevision: s.visualRevision + 1,
    }));
  },

  updateState: (id, next) => {
    const { definition } = get();
    if (!definition.states.some((s) => s.id === id)) return;
    const nameConflict =
      definition.states.some((s) => s.name === next.name && s.id !== id);
    if (nameConflict) return;

    let states = definition.states.map((s) =>
      s.id === id ? { ...s, name: next.name, isInitial: next.isInitial } : { ...s },
    );
    const initialCount = states.filter((s) => s.isInitial).length;
    if (states.length) {
      if (next.isInitial) {
        states = states.map((s) => ({ ...s, isInitial: s.id === id }));
      } else if (initialCount === 0) {
        const fallbackId = states[0].id;
        states = states.map((s) => ({ ...s, isInitial: s.id === fallbackId }));
      } else if (initialCount > 1) {
        states = states.map((s) => ({ ...s, isInitial: s.id === id }));
      }
    }

    // When renaming a state, we don't need to update transition references 
    // because they are already bound to state IDs.
    // The display in WorkflowInspector and Canvas will update automatically 
    // as they pull names from the definition states.

    set((s) => ({
      definition: { ...definition, states },
      lastSource: 'visual',
      visualRevision: s.visualRevision + 1,
    }));
  },

  removeState: (id) => {
    const { definition, positions, selection } = get();
    const states = definition.states.filter((s) => s.id !== id);
    const transitions = definition.transitions.filter(
      (t) => t.fromStateId !== id && t.toStateId !== id,
    );
    const nextPos = { ...positions };
    delete nextPos[id];
    let nextStates = states;
    if (states.length && !states.some((s) => s.isInitial)) {
      nextStates = states.map((s, i) => ({ ...s, isInitial: i === 0 }));
    }
    set((s) => ({
      definition: { states: nextStates, transitions },
      positions: nextPos,
      selection: selection?.kind === 'state' && selection.stateId === id ? null : selection,
      lastSource: 'visual',
      visualRevision: s.visualRevision + 1,
    }));
  },

  addTransition: (t) => {
    const { definition } = get();
    const newId = crypto.randomUUID();
    const key = `${t.fromStateId}|${t.toStateId}|${t.name}`;
    const dup = definition.transitions.some((x) => `${x.fromStateId}|${x.toStateId}|${x.name}` === key);
    if (dup) return;
    set((s) => ({
      definition: {
        ...definition,
        transitions: [
          ...definition.transitions,
          {
            ...t,
            id: newId,
            requiresApproval: t.requiresApproval ?? false,
            approvalMode: t.approvalMode ?? 'SINGLE',
            approverUserIds: t.approverUserIds ?? [],
            quorumCount: t.approvalMode === 'QUORUM' ? t.quorumCount : undefined,
          },
        ],
      },
      selection: { kind: 'transition', id: newId },
      lastSource: 'visual',
      visualRevision: s.visualRevision + 1,
    }));
  },

  updateTransition: (id, patch) => {
    const { definition } = get();
    const index = definition.transitions.findIndex((t) => t.id === id);
    if (index === -1) return;
    const next = [...definition.transitions];
    const mergedRaw = { ...next[index], ...patch };
    const merged = {
      ...mergedRaw,
      quorumCount: mergedRaw.approvalMode === 'QUORUM' ? mergedRaw.quorumCount : undefined,
    };
    const key = `${merged.fromStateId}|${merged.toStateId}|${merged.name}`;
    const dupIdx = next.findIndex(
      (x, i) => i !== index && `${x.fromStateId}|${x.toStateId}|${x.name}` === key,
    );
    if (dupIdx !== -1) return;
    next[index] = merged;
    set((s) => ({
      definition: { ...definition, transitions: next },
      lastSource: 'visual',
      visualRevision: s.visualRevision + 1,
    }));
  },

  removeTransition: (id) => {
    const { definition, selection } = get();
    const transitions = definition.transitions.filter((t) => t.id !== id);
    let nextSel = selection;
    if (selection?.kind === 'transition' && selection.id === id) {
      nextSel = null;
    }
    set((s) => ({
      definition: { ...definition, transitions },
      selection: nextSel,
      lastSource: 'visual',
      visualRevision: s.visualRevision + 1,
    }));
  },
}));
