import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { List, ShieldCheck } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-canvas text-content-primary font-sans selection:bg-safe-muted flex flex-col lg:flex-row">
      {/* Mobile Top Navigation */}
      <div className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-border-subtle shrink-0 bg-canvas sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" className="text-safe w-5 h-5" />
          <span className="font-semibold tracking-tight text-content-primary">AgentEval</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 -mr-2 text-content-muted hover:text-content-primary rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          aria-label="Open menu"
        >
          <List className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 min-w-0 flex flex-col min-h-[calc(100vh-64px)] lg:min-h-screen overflow-x-hidden">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
