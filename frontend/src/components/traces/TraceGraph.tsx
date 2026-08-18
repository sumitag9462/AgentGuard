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
  metadata?: any;
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
      className={`px-3 py-2 shadow-xl rounded-lg border ${
        data.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
        data.status === 'danger' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 
        'bg-zinc-900 border-zinc-700 text-zinc-100'
      } text-xs font-mono cursor-pointer`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-full border-none bg-zinc-600" />
      <div className="font-semibold mb-1 opacity-50 text-[10px] uppercase tracking-wider">{data.step}</div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-full border-none bg-zinc-600" />
    </motion.div>
  );
}

const nodeTypes = {
  animated: AnimatedNode,
};

export default function TraceGraph({ trace }: { trace: Trace }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

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
        style: { stroke: e2.status === 'danger' ? '#f43f5e' : e2.status === 'success' ? '#10b981' : '#52525b', strokeWidth: 2 }
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
    <div className="w-full h-full rounded-lg overflow-hidden bg-zinc-950 relative">
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
        <Background color="#27272a" gap={16} size={1} />
      </ReactFlow>

      {/* Metadata Overlay */}
      {selectedNodeData && (
        <div className="absolute top-4 right-4 w-80 bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl z-10">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Node Metadata</div>
            <button onClick={() => setSelectedNodeData(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-zinc-500 text-xs">Step Type</span>
              <div className="text-zinc-200 font-mono text-sm">{selectedNodeData.step}</div>
            </div>
            <div>
              <span className="text-zinc-500 text-xs">Content</span>
              <div className="text-zinc-300 text-sm bg-zinc-900 p-2 rounded mt-1 border border-white/5 wrap-break-word max-h-40 overflow-y-auto">
                {selectedNodeData.fullLabel}
              </div>
            </div>
            {selectedNodeData.metadata && Object.keys(selectedNodeData.metadata).length > 0 && (
              <div>
                <span className="text-zinc-500 text-xs">Arguments / Result</span>
                <pre className="text-emerald-400 font-mono text-xs bg-zinc-900 p-2 rounded mt-1 border border-white/5 overflow-x-auto wrap-break-word">
                  {JSON.stringify(selectedNodeData.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
