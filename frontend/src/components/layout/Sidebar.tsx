import { NavLink } from 'react-router-dom';
import { ShieldCheck, SquaresFour, Robot, ListChecks, ListMagnifyingGlass, GitMerge } from '@phosphor-icons/react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: SquaresFour },
  { name: 'Agents', href: '/agents', icon: Robot },
  { name: 'Evaluations', href: '/evaluations', icon: ListChecks },
  { name: 'Scenarios', href: '/scenarios', icon: ListMagnifyingGlass },
  { name: 'Regression', href: '/compare', icon: GitMerge },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/5 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" className="text-emerald-500 w-6 h-6" />
          <span className="font-semibold tracking-tight text-zinc-100">AgentGuard</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Platform</div>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-ui-out ${
                isActive
                  ? 'bg-zinc-800/50 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </div>
      
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <span className="text-emerald-500 text-xs font-bold">SA</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-200">System Admin</span>
            <span className="text-xs text-zinc-500">Local Dev</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
