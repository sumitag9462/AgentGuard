import { Outlet, NavLink } from 'react-router-dom';
import { 
  ShieldCheck, 
  SquaresFour, 
  Robot, 
  TestTube, 
  ListMagnifyingGlass,
  Gear
} from '@phosphor-icons/react';

function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: SquaresFour },
    { name: 'Agents', path: '/agents', icon: Robot },
    { name: 'Evaluations', path: '/evaluations', icon: TestTube },
    { name: 'Scenarios', path: '/scenarios', icon: ListMagnifyingGlass },
  ];

  return (
    <div className="w-64 border-r border-white/5 bg-zinc-950/50 flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" className="text-emerald-500 w-6 h-6" />
          <span className="font-semibold tracking-tight text-zinc-100">AgentGuard</span>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-3 flex flex-col gap-1">
        <div className="px-3 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-ui-out
              ${isActive 
                ? 'bg-zinc-800/50 text-zinc-100' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 transition-all duration-200 ease-ui-out">
          <Gear className="w-5 h-5" />
          Settings
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans flex selection:bg-emerald-500/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
