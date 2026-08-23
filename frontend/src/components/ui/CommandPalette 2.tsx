import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="z-50 w-full max-w-2xl bg-surface border border-border-strong shadow-2xl rounded-xl overflow-hidden glass-panel"
      >
        <Command className="w-full" onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}>
          <Command.Input 
            autoFocus 
            placeholder="Search agents, scenarios, or commands..." 
            className="w-full bg-transparent text-white px-5 py-4 outline-none border-b border-border-subtle placeholder-content-muted text-lg"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto p-2 hide-scrollbar">
            <Command.Empty className="py-6 text-center text-content-muted text-sm">No results found.</Command.Empty>
            
            <Command.Group heading={<div className="px-3 py-2 text-xs font-semibold text-content-muted tracking-wider">Navigation</div>}>
              <Command.Item 
                onSelect={() => { navigate('/app'); setOpen(false); }}
                className="px-3 py-2.5 rounded-md flex items-center gap-2 cursor-pointer text-sm text-content-primary aria-selected:bg-panel-hover aria-selected:text-white"
              >
                Go to Dashboard
              </Command.Item>
              <Command.Item 
                onSelect={() => { navigate('/app/agents'); setOpen(false); }}
                className="px-3 py-2.5 rounded-md flex items-center gap-2 cursor-pointer text-sm text-content-primary aria-selected:bg-panel-hover aria-selected:text-white"
              >
                View Agents
              </Command.Item>
              <Command.Item 
                onSelect={() => { navigate('/app/scenarios'); setOpen(false); }}
                className="px-3 py-2.5 rounded-md flex items-center gap-2 cursor-pointer text-sm text-content-primary aria-selected:bg-panel-hover aria-selected:text-white"
              >
                Manage Scenarios
              </Command.Item>
              <Command.Item 
                onSelect={() => { navigate('/app/compare'); setOpen(false); }}
                className="px-3 py-2.5 rounded-md flex items-center gap-2 cursor-pointer text-sm text-content-primary aria-selected:bg-panel-hover aria-selected:text-white"
              >
                CI / Quality Gates
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading={<div className="px-3 py-2 text-xs font-semibold text-content-muted tracking-wider">Actions</div>}>
              <Command.Item 
                onSelect={() => { navigate('/app/agents/connect'); setOpen(false); }}
                className="px-3 py-2.5 rounded-md flex items-center gap-2 cursor-pointer text-sm text-content-primary aria-selected:bg-panel-hover aria-selected:text-white"
              >
                <div className="w-2 h-2 rounded-full bg-accent" />
                Connect New Agent
              </Command.Item>
              <Command.Item 
                onSelect={() => { alert('Not implemented in demo'); setOpen(false); }}
                className="px-3 py-2.5 rounded-md flex items-center gap-2 cursor-pointer text-sm text-content-primary aria-selected:bg-panel-hover aria-selected:text-white"
              >
                <div className="w-2 h-2 rounded-full bg-warning" />
                Trigger Evaluation
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </motion.div>
    </div>
  );
}
