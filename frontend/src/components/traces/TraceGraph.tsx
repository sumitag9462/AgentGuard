import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import type { Trace } from '../../types';

interface NodeData {
  step: string;
  label: string;
  status?: string;
  metadata?: unknown;
  fullLabel?: string;
}

export function AnimatedNode({ data }: { data: NodeData }) {
  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`px-3 py-2 shadow-xl rounded-md border ${
        data.status === 'success' ? 'bg-safe-muted border-safe/30 text-safe' : 
        data.status === 'danger' ? 'bg-critical-muted border-critical/30 text-critical' : 
        'bg-panel border-border-subtle text-content-primary'
      } text-xs font-mono cursor-pointer`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-full border-none bg-content-muted" />
      <div className="font-semibold mb-1 opacity-50 text-[10px] uppercase tracking-wider">{data.step}</div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-full border-none bg-content-muted" />
    </motion.div>
  );
}

const nodeTypes = {
  animated: AnimatedNode,
};

export default function TraceGraph({ trace }: { trace: Trace }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);

  useEffect(() => {
    if (!trace || !trace.events) return;
    
    const newNodes: Node[] = trace.events.map((event, index) => ({
      id: event.eventId || `node-${index}`,
      type: 'animated',
      position: { x: 250, y: 50 + index * 100 },
      data: { 
        step: event.type.replace('_', ' '),
        label: event.label.length > 30 ? event.label.substring(0, 30) + '...' : event.label,
        status: event.status,
        metadata: event.metadata,
        fullLabel: event.label
      }
    }));

    const newEdges: Edge[] = [];
    for (let i = 0; i < trace.events.length - 1; i++) {
      const e1 = trace.events[i];
      const e2 = trace.events[i + 1];
      newEdges.push({
        id: `e${e1.eventId || i}-${e2.eventId || i+1}`,
        source: e1.eventId || `node-${i}`,
        target: e2.eventId || `node-${i+1}`,
        animated: true,
        style: { stroke: e2.status === 'danger' ? 'var(--color-critical)' : e2.status === 'success' ? 'var(--color-safe)' : '#52525b', strokeWidth: 2 }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [trace, setNodes, setEdges]);

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data);
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-canvas relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--color-border-subtle)" gap={16} size={1} />
      </ReactFlow>

      {/* Metadata Overlay */}
      {selectedNodeData && (
        <div className="absolute top-4 right-4 w-80 bg-panel/90 backdrop-blur-md border border-border-subtle rounded-lg p-5 shadow-2xl z-10">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[11px] font-bold text-content-secondary uppercase tracking-wider">Node Metadata</div>
            <button onClick={() => setSelectedNodeData(null)} className="text-content-muted hover:text-content-primary">✕</button>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-content-muted text-[11px]">Step Type</span>
              <div className="text-content-primary font-mono text-[13px]">{selectedNodeData.step}</div>
            </div>
            <div>
              <span className="text-content-muted text-[11px]">Content</span>
              <div className="text-content-secondary text-[13px] bg-canvas p-2 rounded-sm mt-1 border border-border-subtle break-all max-h-40 overflow-y-auto">
                {selectedNodeData.fullLabel}
              </div>
            </div>
            {selectedNodeData.metadata && Object.keys(selectedNodeData.metadata).length > 0 ? (
              <div>
                <span className="text-content-muted text-[11px]">Arguments / Result</span>
                <pre className="text-safe font-mono text-[11px] bg-canvas p-2 rounded-sm mt-1 border border-border-subtle overflow-x-auto">
                  {JSON.stringify(selectedNodeData.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
