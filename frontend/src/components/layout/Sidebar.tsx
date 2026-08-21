import { NavLink } from 'react-router-dom';
import { ShieldCheck, SquaresFour, Robot, ListChecks, ListMagnifyingGlass, GitMerge, Pulse, X } from '@phosphor-icons/react';

const navGroups = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/app', icon: SquaresFour },
    ]
  },
  {
    title: 'AGENTS',
    items: [
      { name: 'Agents', href: '/app/agents', icon: Robot },
    ]
  },
  {
    title: 'TESTING',
    items: [
      { name: 'Scenarios', href: '/app/scenarios', icon: ListMagnifyingGlass },
      { name: 'Evaluations', href: '/app/evaluations', icon: Pulse },
    ]
  },
  {
    title: 'ANALYSIS',
    items: [
      { name: 'Failures', href: '/app/failures', icon: ListChecks }, // Changed to proper failures route
      { name: 'Compare', href: '/app/compare', icon: GitMerge },
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-canvas border-r border-border-subtle 
        transition-transform duration-300 ease-ui-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck weight="fill" className="text-safe w-6 h-6" />
            <span className="font-semibold tracking-tight text-content-primary">AgentEval</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-content-muted hover:text-content-primary lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6 hide-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <div className="text-label text-content-muted px-2 mb-1">
                {group.title}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/app'}
                  onClick={onClose} // Close on mobile after navigation
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ease-ui-out ${
                      isActive
                        ? 'bg-panel-hover text-content-primary shadow-sm'
                        : 'text-content-secondary hover:text-content-primary hover:bg-panel'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-border-subtle bg-panel/30 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-safe-muted flex items-center justify-center border border-safe/20">
              <span className="text-safe text-xs font-bold">SA</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-content-primary">System Admin</span>
              <span className="text-xs text-content-secondary">Local Dev</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
