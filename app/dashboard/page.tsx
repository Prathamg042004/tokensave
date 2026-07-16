"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

function TSKeyManager({ userId, email }: { userId: string; email: string }) {
  const [tsKey, setTsKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [rotateMsg, setRotateMsg] = useState("");

  useEffect(() => {
    if (userId) {
      fetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email }) })
        .then(r => r.json()).then(d => { if (d.key) setTsKey(d.key); }).catch(() => {});
    }
  }, [userId, email]);

  if (!tsKey) return <p className="text-gray-500 text-sm">Generating...</p>;
  const masked = tsKey.slice(0, 12) + "•".repeat(20) + tsKey.slice(-4);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 font-mono text-cyan-400 text-sm truncate">{showKey ? tsKey : masked}</div>
        <button onClick={() => setShowKey(!showKey)} className="px-3 py-3 bg-gray-800 hover:bg-gray-750 rounded-lg text-xs text-gray-400">{showKey ? "Hide" : "Show"}</button>
        <button onClick={() => { navigator.clipboard.writeText(tsKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-3 py-3 bg-gray-800 hover:bg-gray-750 rounded-lg text-xs text-gray-400">{copied ? "Done!" : "Copy"}</button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-gray-600 text-xs">Pass as <span className="font-mono text-gray-500">tsKey</span> in requests</p>
        {!rotateConfirm ? (
          <button onClick={() => setRotateConfirm(true)} className="text-xs text-gray-600 hover:text-red-400">Rotate</button>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-amber-400 text-xs">Sure?</span>
            <button onClick={async () => { setRotateLoading(true); const r = await fetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email, action: "rotate" }) }).then(r => r.json()); if (r.key) { setTsKey(r.key); setRotateMsg("Rotated!"); setTimeout(() => setRotateMsg(""), 3000); } setRotateLoading(false); setRotateConfirm(false); }} className="text-xs text-red-400">{rotateLoading ? "..." : "Yes"}</button>
            <button onClick={() => setRotateConfirm(false)} className="text-xs text-gray-500">No</button>
          </div>
        )}
      </div>
      {rotateMsg && <p className="text-amber-400 text-xs mt-2">{rotateMsg}</p>}
    </div>
  );
}

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", models: "Claude Haiku, Sonnet, Opus", color: "#D4A574", letter: "A" },
  { id: "openai", name: "OpenAI", models: "GPT-4o, GPT-4o Mini", color: "#74AA9C", letter: "O" },
  { id: "google", name: "Google", models: "Gemini Flash, Flash Lite, Pro", color: "#4285F4", letter: "G" },
  { id: "groq", name: "Groq", models: "Llama 3.1, 3.3, Mixtral, DeepSeek", color: "#F55036", letter: "Q" },
];

const FEATURES = [
  { title: "Semantic Caching", desc: "Identical queries return cached responses instantly", stat: "100% savings on repeats", icon: "↻" },
  { title: "Smart Routing", desc: "Auto-routes simple tasks to cheaper models", stat: "Up to 66% per request", icon: "⇢" },
  { title: "Prompt Compression", desc: "Removes filler words while preserving meaning", stat: "5-15% token reduction", icon: "⊟" },
  { title: "Quality Modes", desc: "Choose auto, max_savings, or max_quality", stat: "You control the tradeoff", icon: "◈" },
  { title: "Multi-Provider Fallback", desc: "Auto-switches provider on rate limits", stat: "Zero downtime", icon: "⟳" },
  { title: "Context Summarization", desc: "Compresses long conversations by 88%", stat: "For heavy users", icon: "⊞" },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("overview");
  const [savedKeys, setSavedKeys] = useState({ anthropic: "", openai: "", google: "", groq: "" });
  const [keyMsg, setKeyMsg] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  const [budgetLimit, setBudgetLimit] = useState(1000);
  const [budgetAlert, setBudgetAlert] = useState(80);
  const [budgetMsg, setBudgetMsg] = useState("");
  const [routingRules, setRoutingRules] = useState({
    anthropic_simple: "claude-haiku-4-5-20251001", anthropic_complex: "claude-sonnet-4-6",
    openai_simple: "gpt-4o-mini", openai_complex: "gpt-4o",
    google_simple: "gemini-2.0-flash-lite", google_complex: "gemini-2.0-flash",
    groq_simple: "llama-3.1-8b-instant", groq_complex: "llama-3.3-70b-versatile",
    threshold: 100,
  });
  const [routingMsg, setRoutingMsg] = useState("");
  const router = useRouter();
  const proxyUrl = "https://tokensave.vercel.app/api/proxy";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        try {
          const sk = localStorage.getItem("ts_keys_" + data.user.id);
          if (sk) setSavedKeys(JSON.parse(sk));
          const sb = localStorage.getItem("ts_budget_" + data.user.id);
          if (sb) { const b = JSON.parse(sb); setBudgetLimit(b.limit || 1000); setBudgetAlert(b.alertPercent || 80); }
          const sr = localStorage.getItem("ts_routing_" + data.user.id);
          if (sr) setRoutingRules(JSON.parse(sr));
        } catch (e) {}
      } else { router.push("/login"); }
      setLoading(false);
    });
    fetchStats();
    const i = setInterval(fetchStats, 15000);
    return () => clearInterval(i);
  }, [router]);

  const fetchStats = async () => { try { const r = await fetch("/api/stats"); setStats(await r.json()); } catch (e) {} };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return (
    <div className="min-h-screen bg-[#0B0D11] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center text-[#0B0D11] font-bold">TS</div>
      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const t = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0, errors: 0, total_cost: 0, total_saved: 0 };
  const days = stats?.days || [];
  const perf = stats?.performance || {};
  const cacheRate = t.total_requests > 0 ? Math.round((t.cache_hits / t.total_requests) * 100) : 0;
  const maxReqs = Math.max(...days.map((d: any) => d.total_requests), 1);

  const filteredLogs = (stats?.recent_logs || []).filter((log: any) => {
    const s = !logSearch || JSON.stringify(log).toLowerCase().includes(logSearch.toLowerCase());
    const f = logFilter === "all" || (logFilter === "cached" && log.cache_hit) || (logFilter === "not_cached" && !log.cache_hit) || logFilter === log.provider;
    return s && f;
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "keys", label: "API Keys" },
    { id: "logs", label: "Logs" },
    { id: "routing", label: "Routing" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D11] text-gray-100">
      <nav className="border-b border-white/5">
        <div className="flex justify-between items-center px-6 lg:px-10 py-4 max-w-[1400px] mx-auto">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center text-[#0B0D11] font-bold text-sm">TS</div>
            <span className="text-lg font-semibold tracking-tight">TokenSave</span>
          </a>
          <div className="flex items-center gap-5">
            <a href="/playground" className="text-sm text-gray-500 hover:text-gray-300 hidden sm:block">Playground</a>
            <a href="/docs" className="text-sm text-gray-500 hover:text-gray-300 hidden sm:block">Docs</a>
            <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
            <span className="text-gray-500 text-sm hidden md:block">{user?.email}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-400">Log out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
        {budgetLimit > 0 && t.total_requests >= budgetLimit * (budgetAlert / 100) && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <p className="text-red-400 text-sm"><span className="font-medium">Budget alert:</span> {Math.round((t.total_requests / budgetLimit) * 100)}% of daily limit — {t.total_requests}/{budgetLimit} requests</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Dashboard</h1>
            <p className="text-gray-500 text-[15px] mt-0.5">Real-time usage monitoring and cost optimization</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-500/5 border border-green-500/10 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs font-medium">Active</span>
            </div>
            {perf.avg_latency_ms > 0 && <span className="text-gray-600 text-xs">{perf.avg_latency_ms}ms avg</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Requests", value: t.total_requests, sub: "7-day total", color: "text-white" },
            { label: "Tokens saved", value: t.tokens_saved.toLocaleString(), sub: "across all requests", color: "text-emerald-400" },
            { label: "Cache hit rate", value: cacheRate + "%", sub: t.cache_hits + " cache hits", color: "text-cyan-400" },
            { label: "Est. cost saved", value: "$" + (t.total_saved || t.tokens_saved * 0.000003).toFixed(4), sub: "vs direct API calls", color: "text-green-400" },
            { label: "Error rate", value: (perf.error_rate_percent || 0) + "%", sub: (t.errors || 0) + " total errors", color: t.errors > 0 ? "text-red-400" : "text-gray-400" },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-2xl font-semibold tracking-tight ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/5 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.id ? "text-cyan-400 border-cyan-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}>{t.label}</button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-medium">Request volume</h2>
                  <span className="text-[11px] text-gray-600">Last 7 days • auto-refresh</span>
                </div>
                <div className="flex items-end gap-[6px] h-36">
                  {days.map((day: any, i: number) => {
                    const h = maxReqs > 0 ? Math.max((day.total_requests / maxReqs) * 100, 3) : 3;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        {day.total_requests > 0 && <span className="text-[10px] text-gray-500">{day.total_requests}</span>}
                        <div className="w-full flex items-end" style={{ height: "110px" }}>
                          <div className={`w-full rounded-[4px] transition-all duration-700 ${day.total_requests > 0 ? "bg-gradient-to-t from-cyan-500/80 to-cyan-400/40" : "bg-white/[0.03]"}`} style={{ height: `${h}%` }}></div>
                        </div>
                        <span className="text-[10px] text-gray-600">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                  <h3 className="text-[13px] text-gray-400 mb-3">Proxy endpoint</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[12px] text-cyan-400 bg-black/30 rounded-lg px-3 py-2.5 truncate">{proxyUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(proxyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 transition-colors">{copied ? "✓" : "Copy"}</button>
                  </div>
                </div>
                <a href="/playground" className="block bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:border-cyan-400/20 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-medium group-hover:text-cyan-400 transition-colors">Playground</h3>
                      <p className="text-[11px] text-gray-600 mt-0.5">Test with chat, compare, or single prompt</p>
                    </div>
                    <span className="text-gray-700 group-hover:text-cyan-400 transition-colors">→</span>
                  </div>
                </a>
                <a href="/docs" className="block bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:border-cyan-400/20 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-medium group-hover:text-cyan-400 transition-colors">API Docs</h3>
                      <p className="text-[11px] text-gray-600 mt-0.5">Integration guide in 8 languages</p>
                    </div>
                    <span className="text-gray-700 group-hover:text-cyan-400 transition-colors">→</span>
                  </div>
                </a>
              </div>
            </div>

            <div>
              <h2 className="text-[15px] font-medium mb-4">Supported providers</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PROVIDERS.map(p => (
                  <div key={p.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0" style={{ backgroundColor: p.color + "15", color: p.color }}>{p.letter}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{p.models}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-[15px] font-medium mb-4">What TokenSave does for you</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FEATURES.map((f, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-cyan-400/60 text-lg">{f.icon}</span>
                      <h3 className="text-[13px] font-medium">{f.title}</h3>
                    </div>
                    <p className="text-[12px] text-gray-500 leading-relaxed mb-2">{f.desc}</p>
                    <p className="text-[11px] text-cyan-400/70 font-medium">{f.stat}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-3">Quick integration</h2>
              <pre className="bg-black/40 rounded-lg p-4 text-[12px] text-gray-400 overflow-x-auto leading-relaxed"><span className="text-gray-600">// One line change — that&apos;s it</span>{"\n"}<span className="text-gray-500">const</span> response = <span className="text-gray-500">await</span> <span className="text-cyan-400/80">fetch</span>(<span className="text-green-400/70">&quot;{proxyUrl}&quot;</span>, {"{"}{"\n"}  method: <span className="text-green-400/70">&quot;POST&quot;</span>,{"\n"}  headers: {"{"} <span className="text-green-400/70">&quot;Content-Type&quot;</span>: <span className="text-green-400/70">&quot;application/json&quot;</span> {"}"},
{"\n"}  body: JSON.stringify({"{"}{"\n"}    provider: <span className="text-green-400/70">&quot;anthropic&quot;</span>,{"\n"}    apiKey: <span className="text-green-400/70">&quot;your-key&quot;</span>,{"\n"}    messages: [{"{"} role: <span className="text-green-400/70">&quot;user&quot;</span>, content: <span className="text-green-400/70">&quot;Hello&quot;</span> {"}"}]{"\n"}  {"}"})
{"\n"}{"}"});</pre>
            </div>
          </div>
        )}

        {tab === "keys" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-1">TokenSave API key</h2>
              <p className="text-[12px] text-gray-500 mb-4">Include in requests for usage tracking and higher rate limits.</p>
              <TSKeyManager userId={user?.id} email={user?.email} />
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-1">Provider keys</h2>
              <p className="text-[12px] text-gray-500 mb-5">Stored locally in your browser. Never sent to our servers.</p>
              <div className="space-y-4">
                {PROVIDERS.map(p => (
                  <div key={p.id}>
                    <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: p.color + "15", color: p.color }}>{p.letter}</span>
                      {p.name}
                    </label>
                    <input type="password" placeholder={p.id === "anthropic" ? "sk-ant-..." : p.id === "openai" ? "sk-..." : p.id === "google" ? "AIza..." : "gsk_..."} value={(savedKeys as any)[p.id]} onChange={e => setSavedKeys({ ...savedKeys, [p.id]: e.target.value })} className="w-full px-3.5 py-2.5 bg-black/30 border border-white/5 rounded-lg text-gray-200 placeholder-gray-700 text-sm font-mono focus:outline-none focus:border-cyan-400/30" />
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_keys_" + user.id, JSON.stringify(savedKeys)); setKeyMsg("Saved!"); setTimeout(() => setKeyMsg(""), 2000); } }} className="px-5 py-2 bg-cyan-400 text-[#0B0D11] rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">{keyMsg || "Save keys"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search logs..." className="flex-1 px-3.5 py-2 bg-black/30 border border-white/5 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400/30" />
              <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="px-3.5 py-2 bg-black/30 border border-white/5 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-cyan-400/30">
                <option value="all">All</option><option value="cached">Cached</option><option value="not_cached">Not cached</option>
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={fetchStats} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition-colors">Refresh</button>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead><tr className="text-[11px] text-gray-500 uppercase tracking-wider text-left border-b border-white/5">
                      <th className="px-5 py-3">Time</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Model</th><th className="px-5 py-3">Cache</th><th className="px-5 py-3">Saved</th><th className="px-5 py-3">Complexity</th>
                    </tr></thead>
                    <tbody>
                      {filteredLogs.map((l: any, i: number) => (
                        <tr key={i} className="border-b border-white/[0.03] text-sm hover:bg-white/[0.02]">
                          <td className="px-5 py-3 text-gray-600 text-xs">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</td>
                          <td className="px-5 py-3 text-gray-300 capitalize">{l.provider || "—"}</td>
                          <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400 font-mono">{l.model || "cached"}</span></td>
                          <td className="px-5 py-3">{l.cache_hit ? <span className="text-green-400 text-xs">Hit</span> : <span className="text-gray-600 text-xs">Miss</span>}</td>
                          <td className="px-5 py-3 text-emerald-400 text-sm">+{l.tokens_saved || 0}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs capitalize">{l.complexity || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16"><p className="text-gray-600 mb-2">No requests yet</p><a href="/playground" className="text-cyan-400 text-sm hover:underline">Send your first request →</a></div>
              )}
            </div>
          </div>
        )}

        {tab === "routing" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-1">Routing rules</h2>
              <p className="text-[12px] text-gray-500 mb-5">Choose which models handle simple vs complex tasks.</p>
              <div className="space-y-5">
                <div>
                  <label className="text-sm text-gray-400 mb-1.5 block">Complexity threshold (words)</label>
                  <input type="number" value={routingRules.threshold} onChange={e => setRoutingRules({ ...routingRules, threshold: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-black/30 border border-white/5 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400/30" />
                  <p className="text-[11px] text-gray-600 mt-1">Below this = simple (cheap model). Above = complex (smart model).</p>
                </div>
                {[
                  { label: "Anthropic", s: "anthropic_simple", c: "anthropic_complex", models: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"] },
                  { label: "OpenAI", s: "openai_simple", c: "openai_complex", models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
                  { label: "Google", s: "google_simple", c: "google_complex", models: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"] },
                  { label: "Groq", s: "groq_simple", c: "groq_complex", models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
                ].map(p => (
                  <div key={p.label} className="bg-black/20 border border-white/[0.03] rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-300 mb-3">{p.label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">Simple</label>
                        <select value={(routingRules as any)[p.s]} onChange={e => setRoutingRules({ ...routingRules, [p.s]: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-emerald-400 text-xs font-mono focus:outline-none">{p.models.map(m => <option key={m} value={m}>{m}</option>)}</select>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">Complex</label>
                        <select value={(routingRules as any)[p.c]} onChange={e => setRoutingRules({ ...routingRules, [p.c]: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-cyan-400 text-xs font-mono focus:outline-none">{p.models.map(m => <option key={m} value={m}>{m}</option>)}</select>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_routing_" + user.id, JSON.stringify(routingRules)); setRoutingMsg("Saved!"); setTimeout(() => setRoutingMsg(""), 2000); } }} className="px-5 py-2 bg-cyan-400 text-[#0B0D11] rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">{routingMsg || "Save rules"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-4">Account</h2>
              <div className="space-y-3">
                {[
                  { label: "Email", value: user?.email },
                  { label: "User ID", value: user?.id?.slice(0, 20) + "...", mono: true },
                  { label: "Plan", value: "Free Trial — 14 days", highlight: true },
                  { label: "Proxy endpoint", value: proxyUrl, mono: true },
                ].map((r, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                    <span className="text-gray-500 text-sm">{r.label}</span>
                    <span className={`text-sm ${r.highlight ? "text-cyan-400 font-medium" : r.mono ? "font-mono text-gray-400" : "text-gray-200"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-1">Budget alerts</h2>
              <p className="text-[12px] text-gray-500 mb-4">Get warned when approaching your daily limit.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1.5 block">Daily request limit</label>
                  <input type="number" value={budgetLimit} onChange={e => setBudgetLimit(Number(e.target.value))} className="w-full px-3.5 py-2.5 bg-black/30 border border-white/5 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400/30" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1.5 block">Alert threshold</label>
                  <select value={budgetAlert} onChange={e => setBudgetAlert(Number(e.target.value))} className="w-full px-3.5 py-2.5 bg-black/30 border border-white/5 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400/30">
                    <option value={50}>50%</option><option value={75}>75%</option><option value={80}>80%</option><option value={90}>90%</option>
                  </select>
                </div>
                <button onClick={() => { if (user) { localStorage.setItem("ts_budget_" + user.id, JSON.stringify({ limit: budgetLimit, alertPercent: budgetAlert })); setBudgetMsg("Saved!"); setTimeout(() => setBudgetMsg(""), 2000); } }} className="px-5 py-2 bg-cyan-400 text-[#0B0D11] rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">{budgetMsg || "Save budget"}</button>
                {t.total_requests > 0 && budgetLimit > 0 && (
                  <div className="bg-black/20 border border-white/[0.03] rounded-lg p-4 mt-2">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-500">Usage today</span>
                      <span className={t.total_requests >= budgetLimit * (budgetAlert / 100) ? "text-red-400" : "text-gray-400"}>{t.total_requests}/{budgetLimit}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${t.total_requests >= budgetLimit * (budgetAlert / 100) ? "bg-red-400" : "bg-cyan-400"}`} style={{ width: `${Math.min((t.total_requests / budgetLimit) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-[15px] font-medium mb-2">Support</h2>
              <p className="text-[12px] text-gray-500 mb-3">Need help with integration or have questions?</p>
              <a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 text-sm hover:underline">prathamg200404@gmail.com</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}