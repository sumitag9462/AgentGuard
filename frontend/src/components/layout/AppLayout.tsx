import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas text-content-primary font-sans selection:bg-safe-muted flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-w-0">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
