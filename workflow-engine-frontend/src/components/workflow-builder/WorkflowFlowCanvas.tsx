import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { WorkflowGraphDefinition } from '@/types/workflow-graph';
import { useWorkflowBuilderStore, type Selection } from '@/store/workflowBuilderStore';
import { StateNode, type StateNodeData } from './StateNode';

const nodeTypes = { stateNode: StateNode };

function computeNodes(
  def: WorkflowGraphDefinition,
  positions: Record<string, { x: number; y: number }>,
  sel: Selection,
): Node[] {
  return def.states.map((s, i) => ({
    id: s.id!,
    type: 'stateNode',
    position: positions[s.id!] ?? { x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 },
    data: { label: s.name, isInitial: s.isInitial } satisfies StateNodeData,
    selected: sel?.kind === 'state' && sel.stateId === s.id,
  }));
}

function computeEdges(
  def: WorkflowGraphDefinition,
  sel: Selection,
): Edge[] {
  return def.transitions.map((t) => ({
    id: t.id!,
    source: t.fromStateId!,
    target: t.toStateId!,
    label: t.name,
    data: { id: t.id },
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: 'var(--color-text-tertiary)' },
    style: { stroke: 'var(--color-text-tertiary)' },
    labelStyle: { fill: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 500 },
    selected: sel?.kind === 'transition' && sel.id === t.id,
  }));
}

export function WorkflowFlowCanvas() {
  const definition = useWorkflowBuilderStore((s) => s.definition);
  const positions = useWorkflowBuilderStore((s) => s.positions);
  const selection = useWorkflowBuilderStore((s) => s.selection);
  const setSelection = useWorkflowBuilderStore((s) => s.setSelection);
  const updatePositions = useWorkflowBuilderStore((s) => s.updatePositions);
  const addTransition = useWorkflowBuilderStore((s) => s.addTransition);
  const removeState = useWorkflowBuilderStore((s) => s.removeState);
  const removeTransition = useWorkflowBuilderStore((s) => s.removeTransition);

  const staticNodes = useMemo(
    () => computeNodes(definition, positions, selection),
    [definition, positions, selection],
  );
  const staticEdges = useMemo(() => computeEdges(definition, selection), [definition, selection]);

  const [nodes, setNodes] = useState<Node[]>(staticNodes);
  const [edges, setEdges] = useState<Edge[]>(staticEdges);

  /* React Flow keeps transient UI (drag handles, selection wiring); mirror structural updates from Zustand. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNodes(staticNodes);
  }, [staticNodes]);

  useEffect(() => {
    setEdges(staticEdges);
  }, [staticEdges]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return;
      const n = useWorkflowBuilderStore.getState().definition.transitions.length + 1;
      addTransition({
        name: `transition_${n}`,
        fromStateId: conn.source,
        toStateId: conn.target,
        requiresApproval: false,
        approvalMode: 'SINGLE',
        approverUserIds: [],
      });
    },
    [addTransition],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updatePositions(node.id, node.position);
    },
    [updatePositions],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((dn) => removeState(dn.id));
    },
    [removeState],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((e) => removeTransition(e.id));
    },
    [removeTransition],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelection({ kind: 'state', stateId: node.id });
    },
    [setSelection],
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelection({ kind: 'transition', id: edge.id });
    },
    [setSelection],
  );

  const onPaneClick = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  return (
    <div className="h-full min-h-[320px] w-full rounded-md border border-border-secondary bg-bg-primary">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView={false}
        deleteKeyCode={['Backspace', 'Delete']}
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap zoomable pannable className="!bg-bg-secondary" />
      </ReactFlow>
    </div>
  );
}
