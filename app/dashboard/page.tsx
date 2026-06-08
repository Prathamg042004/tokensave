"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const proxyUrl = "https://tokensave.vercel.app/api/proxy";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); } else { router.push("/login"); }
      setLoading(false);
    });
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchStats = async () => {
    try { const res = await fetch("/api/stats"); const data = await res.json(); setStats(data); } catch (e) {}
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const copyUrl = () => { navigator.clipboard.writeText(proxyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Loading...</div>;

  const t = stats?.today || { total_requests: 0, tokens_saved: 0, cache_hits: 0 };
  const cacheRate = t.total_requests > 0 ? Math.round((t.cache_hits / t.total_requests) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-800/50 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-400 transition-colors">Log out</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Monitor your API usage and savings</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-400 text-sm">System active</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Requests today</p>
            <p className="text-3xl font-bold text-gray-100">{t.total_requests}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Tokens saved</p>
            <p className="text-3xl font-bold text-green-400">{t.tokens_saved.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Cache hit rate</p>
            <p className="text-3xl font-bold text-cyan-400">{cacheRate}%</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Est. saved</p>
            <p className="text-3xl font-bold text-emerald-400">${(t.tokens_saved * 0.000003).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Your proxy endpoint</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 font-mono text-cyan-400 text-sm truncate">{proxyUrl}</div>
              <button onClick={copyUrl} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="mt-4 bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Example request</p>
              <pre className="text-sm text-gray-400 overflow-x-auto">{`curl -X POST ${proxyUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "anthropic",
    "apiKey": "your-key",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}</pre>
            </div>
          </div>

          <div className="space-y-4">
            <a href="/playground" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400/50 transition-colors group">
              <div className="w-9 h-9 bg-cyan-400/10 rounded-lg flex items-center justify-center text-cyan-400 font-bold text-sm mb-3">P</div>
              <h3 className="font-semibold mb-1 group-hover:text-cyan-400 transition-colors">Playground</h3>
              <p className="text-gray-500 text-sm">Test the proxy with your API key</p>
            </a>
            <a href="/api/proxy" target="_blank" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400/50 transition-colors group">
              <div className="w-9 h-9 bg-green-400/10 rounded-lg flex items-center justify-center text-green-400 font-bold text-sm mb-3">A</div>
              <h3 className="font-semibold mb-1 group-hover:text-green-400 transition-colors">API Status</h3>
              <p className="text-gray-500 text-sm">Check if the proxy is running</p>
            </a>
          </div>
        </div>

        {stats?.recent_logs?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Recent requests</h2>
            <table className="w-full">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Model</th>
                  <th className="pb-3">Cached</th>
                  <th className="pb-3">Tokens saved</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_logs.slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-b border-gray-800/50 text-sm">
                    <td className="py-3 text-gray-300">{log.provider || "—"}</td>
                    <td className="py-3"><span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-300">{log.model || "—"}</span></td>
                    <td className="py-3">{log.cache_hit ? <span className="text-green-400 text-xs font-medium">Yes</span> : <span className="text-gray-600 text-xs">No</span>}</td>
                    <td className="py-3 text-green-400 text-sm">+{log.tokens_saved || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}