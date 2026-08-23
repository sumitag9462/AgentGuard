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
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, CheckCircle, Robot, User, Code, ShieldWarning, ArrowsLeftRight } from '@phosphor-icons/react';
import type { Trace } from '../../types';

interface NodeData {
  step: string;
  label: string;
  status?: string;
  metadata?: unknown;
  fullLabel?: string;
  isActive?: boolean;
  isPast?: boolean;
  isReplaying?: boolean;
}

// Icon mapper
const getIconForStep = (step: string) => {
  const s = step.toLowerCase();
  if (s.includes('user')) return <User weight="fill" className="w-4 h-4" />;
  if (s.includes('llm') || s.includes('model') || s.includes('think')) return <Robot weight="fill" className="w-4 h-4" />;
  if (s.includes('tool')) return <Code weight="bold" className="w-4 h-4" />;
  if (s.includes('safety') || s.includes('policy')) return <ShieldWarning weight="fill" className="w-4 h-4" />;
  return <ArrowsLeftRight className="w-4 h-4" />;
};

export function AnimatedNode({ data }: { data: NodeData }) {
  const isFailed = data.status === 'danger';
  const isSuccess = data.status === 'success';
  
  // Logic for replay visibility
  const opacity = !data.isReplaying ? 1 : (data.isPast || data.isActive ? 1 : 0.2);
  const scale = data.isActive ? 1.05 : 1;
  const boxShadow = data.isActive && isFailed ? '0 0 20px rgba(239, 68, 68, 0.4)' : 
                    data.isActive ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none';

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale, opacity, boxShadow }}
      transition={{ type: "spring", duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={`relative w-64 p-4 shadow-xl rounded-lg border-2 bg-canvas transition-colors duration-300
        ${isFailed ? 'border-critical/50' : isSuccess ? 'border-safe/30' : 'border-border-strong'}
        ${data.isActive ? 'ring-2 ring-offset-2 ring-offset-canvas ' + (isFailed ? 'ring-critical' : 'ring-accent') : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-canvas bg-content-muted" />
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center
            ${isFailed ? 'bg-critical-muted text-critical' : isSuccess ? 'bg-safe-muted text-safe' : 'bg-panel border border-border-subtle text-content-primary'}
          `}>
            {getIconForStep(data.step)}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{data.step}</span>
        </div>
        {isFailed && <Warning weight="fill" className="w-4 h-4 text-critical animate-pulse" />}
        {isSuccess && <CheckCircle weight="fill" className="w-4 h-4 text-safe" />}
      </div>
      
      <div className={`text-[13px] font-medium leading-relaxed line-clamp-3 ${isFailed ? 'text-critical' : 'text-content-primary'}`}>
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-canvas bg-content-muted" />
    </motion.div>
  );
}

const nodeTypes = {
  animated: AnimatedNode,
};

export default function TraceGraph({ trace, activeEventIndex, isReplaying }: { trace: Trace, activeEventIndex: number, isReplaying: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);

  useEffect(() => {
    if (!trace || !trace.events) return;
    
    const newNodes: Node[] = trace.events.map((event, index) => {
      const isActive = index === activeEventIndex;
      const isPast = index <= activeEventIndex;
      
      return {
        id: event.eventId || `node-${index}`,
        type: 'animated',
        position: { x: 250, y: 50 + index * 160 }, // Spaced further apart for vertical timeline feel
        data: { 
          step: event.type.replace(/_/g, ' '),
          label: event.label,
          status: event.status,
          metadata: event.metadata,
          fullLabel: event.label,
          isActive,
          isPast,
          isReplaying
        }
      };
    });

    const newEdges: Edge[] = [];
    for (let i = 0; i < trace.events.length - 1; i++) {
      const e1 = trace.events[i];
      const e2 = trace.events[i + 1];
      
      const isPastEdge = (i + 1) <= activeEventIndex;
      const isEdgeActive = (i + 1) === activeEventIndex;
      const edgeOpacity = !isReplaying ? 1 : (isPastEdge ? 1 : 0.1);
      const isFailedTarget = e2.status === 'danger';

      newEdges.push({
        id: `e${e1.eventId || i}-${e2.eventId || i+1}`,
        source: e1.eventId || `node-${i}`,
        target: e2.eventId || `node-${i+1}`,
        animated: isEdgeActive || !isReplaying,
        style: { 
          stroke: isFailedTarget && isPastEdge ? 'varcritical' : 'varborder-strong', 
          strokeWidth: isEdgeActive ? 3 : 2,
          opacity: edgeOpacity,
          transition: 'stroke 0.3s, opacity 0.3s'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: isFailedTarget && isPastEdge ? 'varcritical' : 'varborder-strong',
        },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);

    // Auto-select node if we're replaying and it's active
    if (isReplaying && activeEventIndex >= 0 && activeEventIndex < trace.events.length) {
      setSelectedNodeData(newNodes[activeEventIndex].data);
    }

  }, [trace, activeEventIndex, isReplaying, setNodes, setEdges]);

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
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
      >
        <Background color="rgba(255,255,255,0.05)" gap={24} size={2} />
      </ReactFlow>

      {/* Progressive Metadata Overlay */}
      <AnimatePresence>
        {selectedNodeData && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 bottom-4 w-[calc(100%-2rem)] md:w-96 bg-panel/95 backdrop-blur-xl border border-border-subtle rounded-lg p-6 shadow-2xl z-10 flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border
                  ${selectedNodeData.status === 'danger' ? 'bg-critical-muted text-critical border-critical/30' : 'bg-surface text-content-primary border-border-strong'}
                `}>
                  {getIconForStep(selectedNodeData.step)}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Selected Step</div>
                  <div className="text-sm font-semibold text-content-primary uppercase">{selectedNodeData.step}</div>
                </div>
              </div>
              <button onClick={() => setSelectedNodeData(null)} className="text-content-muted hover:text-content-primary transition-colors p-2 rounded-full hover:bg-surface">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-content-secondary uppercase tracking-widest flex items-center gap-2">
                  Content <span className="flex-1 h-px bg-border-subtle" />
                </span>
                <div className="text-[13px] text-content-primary bg-canvas p-4 rounded-md border border-border-subtle break-all shadow-inner leading-relaxed">
                  {selectedNodeData.fullLabel || 'No content'}
                </div>
              </div>

              {!!selectedNodeData.metadata && typeof selectedNodeData.metadata === 'object' && Object.keys(selectedNodeData.metadata as Record<string, unknown>).length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-content-secondary uppercase tracking-widest flex items-center gap-2">
                    Payload / Arguments <span className="flex-1 h-px bg-border-subtle" />
                  </span>
                  <pre className="text-content-primary font-mono text-[11px] bg-canvas p-4 rounded-md border border-border-subtle overflow-x-auto shadow-inner">
                    {JSON.stringify(selectedNodeData.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedNodeData.status === 'danger' && (
                <div className="flex flex-col gap-2 mt-auto">
                  <div className="bg-critical/10 p-4 rounded-md border border-critical/20">
                    <div className="text-critical font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Warning weight="fill" /> Violation Detected
                    </div>
                    <div className="text-[13px] text-critical-strong opacity-90 leading-relaxed">
                      This step contains a policy violation, unexpected output, or failure to recover. See failure details for root cause analysis.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
