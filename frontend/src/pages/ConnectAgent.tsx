export default function ConnectAgent() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Connect Agent</h1>
        <p className="text-content-secondary">Register a new autonomous agent for evaluation.</p>
      </header>
      <div className="glass-panel p-6 rounded-xl">
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold uppercase tracking-widest text-content-muted">Agent Name</label>
            <input type="text" className="bg-raised border border-border-strong rounded-md px-4 py-2 text-white outline-none focus:border-accent" placeholder="e.g. Sales Copilot" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold uppercase tracking-widest text-content-muted">OpenAPI Schema URL</label>
            <input type="url" className="bg-raised border border-border-strong rounded-md px-4 py-2 text-white outline-none focus:border-accent" placeholder="https://api.example.com/openapi.json" />
          </div>
          <button type="button" className="mt-4 bg-white text-black font-bold px-4 py-2 rounded-md hover:bg-gray-200 w-fit">Register Agent</button>
        </form>
      </div>
    </div>
  );
}
