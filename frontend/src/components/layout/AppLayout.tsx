import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SquaresFour, 
  Robot, 
  Bug, 
  ShieldCheck, 
  ChartLineUp, 
  Files, 
  MagnifyingGlass,
  List,
  Command
} from '@phosphor-icons/react';
import { CommandPalette } from '../ui/CommandPalette';

const NAV_ITEMS = [
  { path: '/app', label: 'Overview', icon: SquaresFour },
  { path: '/app/agents', label: 'Agents', icon: Robot },
  { path: '/app/scenarios', label: 'Scenarios', icon: Bug },
  { path: '/app/evaluations', label: 'Evaluations', icon: ShieldCheck },
  { path: '/app/failures', label: 'Failures', icon: ChartLineUp },
  { path: '/app/compare', label: 'CI / Gates', icon: Files },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? '64px' : '240px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-screen border-r border-border-subtle bg-surface flex flex-col z-20 shrink-0"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle">
          <Link to="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 rounded-md bg-accent-muted border border-accent flex items-center justify-center shrink-0">
              <ShieldCheck weight="fill" className="text-accent text-xl" />
            </div>
            {!collapsed && <span className="font-semibold tracking-tight text-white">AgentEval</span>}
          </Link>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-content-secondary hover:text-white transition-colors"
          >
            <List className="text-xl" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-(--radius-sm) transition-all ${
                  active 
                    ? 'bg-panel-hover text-white shadow-sm' 
                    : 'text-content-secondary hover:text-white hover:bg-panel'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="text-xl shrink-0" weight={active ? 'fill' : 'regular'} />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
                {!collapsed && active && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-accent rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <button 
            onClick={() => setCmdOpen(true)}
            className={`flex items-center justify-between w-full p-2 bg-panel border border-border-strong rounded-md text-content-muted hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? (
              <MagnifyingGlass className="text-lg" />
            ) : (
              <>
                <span className="text-xs font-mono">Search</span>
                <span className="flex items-center gap-1 text-[10px] bg-raised px-1.5 py-0.5 rounded border border-border-strong">
                  <Command /> K
                </span>
              </>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'linear-gradient(varborder-subtle 1px, transparent 1px), linear-gradient(90deg, varborder-subtle 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        <div className="flex-1 overflow-y-auto relative z-10 p-6 md:p-10">
          <Outlet />
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  );
}
