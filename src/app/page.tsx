'use client';

import { useState, useEffect } from 'react';

interface Post {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
  status?: 'published' | 'flagged';
}

export default function AutonomousAgentDashboard() {
  const [name, setName] = useState('Ada');
  const [domain, setDomain] = useState('AI Security & Systems');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [feed, setFeed] = useState<Post[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingInit, setLoadingInit] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Telemetry Reasoning Stream
  useEffect(() => {
    if (!agentId) return;

    const operationalPhases = [
      "🔄 Monitoring global research feeds (arXiv & GitHub)...",
      "🔍 Running candidate discovery & duplicate memory check...",
      "💡 Evaluating topic relevance & prompt injection defense impact...",
      "✅ Post published autonomously to public feed stream."
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${timestamp}] ${operationalPhases[currentPhase % operationalPhases.length]}`, ...prev]);
      currentPhase++;
    }, 5000);

    return () => clearInterval(interval);
  }, [agentId]);

  // Autonomous Feed Synchronization (Polls every 30 seconds)
  useEffect(() => {
    if (!agentId) return;

    const interval = setInterval(() => {
      fetchFeed(agentId);
    }, 30000);

    return () => clearInterval(interval);
  }, [agentId]);

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingInit(true);
    setError('');
    setLogs([`[${new Date().toLocaleTimeString()}] 🚀 Initiating autonomous agent runtime instance...`]);

    try {
      const res = await fetch('/api/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: { name, domain } }),
      });
      if (!res.ok) throw new Error('Failed to initialize agent configuration.');
      const data = await res.json();
      setAgentId(data.agentId);

      await fetchFeed(data.agentId);
    } catch (err: any) {
      setError(err.message || 'Initialization failure.');
    } finally {
      setLoadingInit(false);
    }
  };

  const fetchFeed = async (activeAgentId: string) => {
    try {
      const res = await fetch(`/api/agent/feed?agentId=${encodeURIComponent(activeAgentId)}`);
      const data = await res.json();
      const structuredPosts = (data.posts || []).map((p: Post) => ({
        ...p,
        status: p.status || 'published'
      }));
      setFeed(structuredPosts);
      setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ✅ Synchronized ${structuredPosts.length} posts from serverless memory.`, ...prev]);
    } catch (err: any) {
      setError('Feed retrieval error.');
    }
  };

  const handleFlag = (id: string) => {
    setFeed((prev) =>
      prev.map((post) => (post.id === id ? { ...post, status: 'flagged' } : post))
    );
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] 🛡️ Observability Note: Post ${id} flagged for human review.`,
      ...prev,
    ]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans selection:bg-cyan-500/30">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text uppercase tracking-wider">
              Autonomous AI Creator Engine
            </h1>
            <p className="text-xs text-slate-500 font-mono">Platform Vector: Continuous Background Publishing Enabled</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${agentId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-slate-400 shadow-inner">
              {agentId ? `CORE_ID: ${agentId}` : 'STATE: OFFLINE'}
            </span>
          </div>
        </header>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-4 rounded-xl text-xs font-mono">
            ⚠️ CORE_ERR: {error}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column Controls */}
          <div className="lg:col-span-4 space-y-6">

            {/* Agent Configuration */}
            <section className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl backdrop-blur-md shadow-xl">
              <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-800 pb-2 flex justify-between items-center">
                <span>Agent Identity Vector</span>
                <span className="text-[10px] text-cyan-400 font-normal lowercase font-mono">v1.0.4</span>
              </h2>
              <form onSubmit={handleInitialize} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 tracking-wider">AGENT IDENTITY</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!agentId}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded p-2.5 text-xs outline-none text-slate-200 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 tracking-wider">OPERATIONAL DOMAIN</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={!!agentId}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded p-2.5 text-xs outline-none text-slate-200 transition font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingInit || !!agentId}
                  className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-bold py-3 rounded transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-cyan-900/20 active:scale-[0.99]"
                >
                  {loadingInit ? 'Spawning Instance...' : agentId ? 'Autonomous Engine Active' : 'Initialize Autonomous Agent'}
                </button>
              </form>
            </section>

            {/* Reasoning Telemetry Log */}
            <section className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl backdrop-blur-md shadow-xl flex flex-col">
              <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-800 pb-2">
                🤖 Telemetry Reasoning Log
              </h2>
              <div className="h-44 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[11px] font-mono">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic text-center pt-12">Awaiting activation signature tracking sequences...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-slate-400 border-l-2 border-slate-800 pl-2 py-0.5 leading-relaxed bg-slate-950/30 p-1.5 rounded">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column Stream */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>Autonomous Dispatch Stream</span>
              <span className="text-[10px] text-slate-500 font-normal font-mono normal-case bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Live Feed Observability Enabled
              </span>
            </h2>

            {!agentId && (
              <div className="border border-dashed border-slate-800/80 rounded-xl p-16 text-center text-slate-500 font-mono text-xs bg-slate-900/10">
                Awaiting agent initialization to view live streaming feed items.
              </div>
            )}

            {feed.map((post) => (
              <article key={post.id} className={`bg-slate-900/40 border p-5 rounded-xl space-y-4 transition-all duration-300 shadow-md ${
                post.status === 'flagged' ? 'border-amber-500/30 bg-amber-950/5' : 'border-slate-800/80'
              }`}>
                {/* Meta Header */}
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-bold">POST_ID: {post.id}</span>
                    <span>•</span>
                    <span>{mounted ? new Date(post.createdAt).toLocaleTimeString() : ''} UTC</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                    post.status === 'flagged' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {post.status === 'flagged' ? 'Flagged for Audit' : 'Published Autonomously'}
                  </span>
                </div>

                {/* Content */}
                <p className="text-sm text-slate-200 leading-relaxed font-sans">{post.text}</p>

                {/* Sources */}
                {post.sources && post.sources.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Verified Sources:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {post.sources.map((src, idx) => (
                        <a key={idx} href={src} target="_blank" rel="noreferrer" className="text-[10px] font-mono bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 hover:text-indigo-200 px-2 py-0.5 rounded transition hover:border-indigo-600">
                          🔗 {src.replace('https://', '')}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategic Context / Rationale */}
                <div className="pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                  <span className="text-indigo-400 font-bold">Publishing Rationale: </span>
                  {post.rationale}
                </div>

                {/* Optional Governance Action */}
                {post.status !== 'flagged' && (
                  <div className="flex justify-end pt-2 border-t border-slate-800/40">
                    <button onClick={() => handleFlag(post.id)} className="text-slate-500 hover:text-amber-400 font-mono text-[10px] uppercase tracking-wider transition-colors">
                      🚩 Flag Post for Observability Audit
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}