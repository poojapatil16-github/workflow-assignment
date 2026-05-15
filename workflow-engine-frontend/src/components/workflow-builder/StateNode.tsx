import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export type StateNodeData = {
  label: string;
  isInitial: boolean;
};

function StateNodeInner({ data, selected }: NodeProps & { data: StateNodeData }) {
  return (
    <div
      className={`wf-state-node rounded-lg border bg-bg-secondary px-3 py-2 shadow-sm transition-colors ${
        selected ? 'border-border-primary ring-2 ring-bg-info' : 'border-border-secondary'
      }`}
      style={{ minWidth: 140 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-border-primary !bg-bg-secondary"
      />
      <div className="text-sm font-semibold text-fg-primary">{data.label}</div>
      {data.isInitial ? (
        <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-fg-secondary">Initial</div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-border-primary !bg-bg-secondary"
      />
    </div>
  );
}

export const StateNode = memo(StateNodeInner);
