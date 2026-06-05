"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); } else { router.push("/login"); }
      setLoading(false);
    });
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchStats = async () => {
    try { const res = await fetch("/api/stats"); const data = await res.json(); setStats(data); } catch (e) {}
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;

  const todayStats = stats?.today || { total_requests: 0, tokens_saved: 0, cache_hits: 0 };
  const cacheRate = todayStats.total_requests > 0 ? Math.round((todayStats.cache_hits / todayStats.total_requests) * 100) : 0;
  const moneySaved = (todayStats.tokens_saved * 0.000003).toFixed(2);

  const statCards = [
    { label: "Total Requests", value: todayStats.total_requests.toLocaleString(), color: "text-cyan-400" },
    { label: "Tokens Saved", value: todayStats.tokens_saved.toLocaleString(), color: "text-green-400" },
    { label: "Money Saved", value: "$" + moneySaved, color: "text-emerald-400" },
    { label: "Cache Hit Rate", value: cacheRate + "%", color: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="fixed left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8"><span className="text-2xl">⚡</span><span className="text-xl font-bold text-cyan-400">TokenSave</span></div>
        <nav className="flex flex-col gap-1">
          {["overview", "api-keys", "playground", "analytics", "settings"].map((tab) => (
            <button key={tab} onClick={() => tab === "playground" ? router.push("/playground") : setActiveTab(tab)} className={"text-left px-3 py-2 rounded-lg text-sm capitalize transition-colors " + (activeTab === tab ? "bg-cyan-400/10 text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800")}>
              {tab === "overview" ? "📊 " : tab === "api-keys" ? "🔑 " : tab === "playground" ? "🧪 " : tab === "analytics" ? "📈 " : "⚙️ "}{tab}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-auto px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg text-left">🚪 Log Out</button>
      </div>
      <div className="ml-56 p-8">
        <div className="flex justify-between items-center mb-8">
          <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-gray-500 text-sm">{user?.email}</p></div>
          <span className="text-xs bg-green-400/10 text-green-400 px-3 py-1 rounded-full">● Live</span>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (<div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5"><p className="text-gray-500 text-xs mb-1">{stat.label}</p><p className={"text-2xl font-bold " + stat.color}>{stat.value}</p></div>))}
        </div>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Your API Endpoint</h2><p className="text-gray-400 text-sm mb-3">Replace your AI provider URL with this:</p><div className="bg-gray-800 rounded-lg p-4 font-mono text-cyan-400 text-sm break-all">https://tokensave.vercel.app/api/proxy</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Quick Start</h2><pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">{etch("https://tokensave.vercel.app/api/proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "anthropic",
    apiKey: "your-api-key",
    messages: [{ role: "user", content: "Hello!" }]
  })
})}</pre></div>
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Recent Requests</h2>
            {stats?.recent_logs?.length > 0 ? (
              <table className="w-full"><thead><tr className="text-gray-500 text-xs text-left border-b border-gray-800"><th className="pb-3">Provider</th><th className="pb-3">Model</th><th className="pb-3">Cache</th><th className="pb-3">Saved</th></tr></thead>
              <tbody>{stats.recent_logs.map((log, i) => (<tr key={i} className="border-b border-gray-800/50 text-sm"><td className="py-3">{log.provider || "-"}</td><td className="py-3"><span className="px-2 py-0.5 rounded text-xs bg-cyan-400/10 text-cyan-400">{log.model || "-"}</span></td><td className="py-3">{log.cache_hit ? <span className="text-green-400">Yes</span> : "No"}</td><td className="py-3 text-green-400">+{log.tokens_saved || 0}</td></tr>))}</tbody></table>
            ) : <p className="text-gray-500 text-sm">No requests yet. Try the playground!</p>}
          </div>
        )}
        {activeTab === "settings" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Account</h2>
            <div className="space-y-3"><div><p className="text-gray-400 text-sm">Email</p><p>{user?.email}</p></div><div><p className="text-gray-400 text-sm">Plan</p><p className="text-cyan-400 font-semibold">Free Trial</p></div></div>
          </div>
        )}
      </div>
    </div>
  );
}
