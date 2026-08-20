import { NavLink } from 'react-router-dom';
import { ShieldCheck, SquaresFour, Robot, ListChecks, ListMagnifyingGlass, GitMerge, Pulse } from '@phosphor-icons/react';

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
      { name: 'Failures', href: '/app/evaluations', icon: ListChecks }, // Uses evaluations list for now
      { name: 'Compare', href: '/app/compare', icon: GitMerge },
    ]
  }
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border-subtle bg-canvas flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" className="text-safe w-6 h-6" />
          <span className="font-semibold tracking-tight text-content-primary">AgentEval</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest px-2 mb-1">
              {group.title}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/app'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ease-ui-out ${
                    isActive
                      ? 'bg-panel-hover text-content-primary shadow-sm'
                      : 'text-content-secondary hover:text-content-primary hover:bg-panel'
                  }`
                }
              >
                <item.icon className={`w-4 h-4 ${/* Active styling handled by text color inheritance */ ''}`} />
                {item.name}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-border-subtle bg-panel/30">
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
  );
}
