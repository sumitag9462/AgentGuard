import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function ProblemSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  const nodes = [
    { label: "HALLUCINATION", x: "20%", y: "20%", color: "varwarning" },
    { label: "TOOL LOOP", x: "10%", y: "50%", color: "varcritical" },
    { label: "AGENT", x: "50%", y: "50%", color: "varinfo", isCenter: true },
    { label: "GOAL DRIFT", x: "80%", y: "40%", color: "varwarning" },
    { label: "UNSAFE ACTION", x: "70%", y: "80%", color: "varcritical" },
    { label: "PROMPT INJECTION", x: "30%", y: "80%", color: "varcritical" },
  ];

  return (
    <section id="problem" ref={ref} className="py-32 relative overflow-hidden bg-canvas">
      <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6"
        >
          Agents fail <span className="text-content-muted italic font-medium">differently</span> in production.
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: 0.2 }}
          className="text-xl text-content-secondary max-w-2xl mx-auto mb-20"
        >
          AgentEval turns these unknowns into measurable tests.
        </motion.p>
      </div>

      {/* Interactive Failure Network */}
      <motion.div style={{ y }} className="relative h-[600px] w-full max-w-5xl mx-auto border border-border-subtle rounded-2xl bg-surface overflow-hidden shadow-2xl glass-panel">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.filter(n => !n.isCenter).map((node, i) => (
            <motion.line
              key={i}
              x1="50%" y1="50%"
              x2={node.x} y2={node.y}
              stroke="varborder-strong"
              strokeWidth="2"
              strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.5 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
            />
          ))}
        </svg>

        {nodes.map((node, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: node.isCenter ? 0.3 : 0.8 + i * 0.1, type: "spring" }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group cursor-pointer`}
            style={{ left: node.x, top: node.y }}
          >
            <div 
              className={`w-4 h-4 rounded-full ${node.isCenter ? 'w-8 h-8' : ''}`}
              style={{ 
                backgroundColor: node.color, 
                boxShadow: `0 0 20px ${node.color}`,
                animation: node.isCenter ? 'pulse 2s infinite' : 'none' 
              }}
            />
            <div className={`text-xs font-mono font-bold tracking-widest ${node.isCenter ? 'text-white' : 'text-content-muted group-hover:text-white'} transition-colors uppercase`}>
              {node.label}
            </div>
            
            {!node.isCenter && (
              <div className="absolute top-full mt-2 w-48 p-3 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border-strong">
                <div className="text-[10px] uppercase text-content-secondary mb-1">Detection</div>
                <div className="text-xs text-white">Semantic Evaluator detects deviation from expected state machine constraints.</div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
