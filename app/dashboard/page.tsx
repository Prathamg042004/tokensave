"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

function TSKeyManager({ userId, email }: { userId: string; email: string }) {
  const [tsKey, setTsKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (userId) fetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email }) }).then(r => r.json()).then(d => { if (d.key) setTsKey(d.key); }).catch(() => {});
  }, [userId, email]);
  if (!tsKey) return <div className="h-10 bg-white/[0.03] rounded-lg animate-pulse"></div>;
  return (
    <div>
      <div className="flex gap-2"><div className="flex-1 bg-black/40 border border-white/5 rounded-lg px-4 py-3 font-mono text-cyan-400 text-sm truncate">{show ? tsKey : tsKey.slice(0, 12) + "•".repeat(16) + tsKey.slice(-4)}</div>
        <button onClick={() => setShow(!show)} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400">{show ? "Hide" : "Show"}</button>
        <button onClick={() => { navigator.clipboard.writeText(tsKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400">{copied ? "✓" : "Copy"}</button>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-gray-600">Include as <code className="text-gray-500">tsKey</code> in requests</span>
        {!confirmRotate ? <button onClick={() => setConfirmRotate(true)} className="text-[11px] text-gray-600 hover:text-red-400">Rotate</button> :
          <div className="flex gap-2"><button onClick={async () => { const r = await fetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email, action: "rotate" }) }).then(r => r.json()); if (r.key) { setTsKey(r.key); setMsg("Rotated!"); setTimeout(() => setMsg(""), 3000); } setConfirmRotate(false); }} className="text-[11px] text-red-400">Yes, rotate</button><button onClick={() => setConfirmRotate(false)} className="text-[11px] text-gray-600">Cancel</button></div>}
      </div>
      {msg && <p className="text-amber-400 text-[11px] mt-1">{msg}</p>}
    </div>
  );
}

function MiniChart({ data, height = 60, color = "#22d3ee" }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 10)}`).join(" ");
  const areaPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={height - (v / max) * (height - 10)} r="2" fill={color} opacity={i === data.length - 1 ? 1 : 0} />
      ))}
    </svg>
  );
}

function DonutChart({ value, max, color = "#22d3ee", size = 80 }: { value: number; max: number; color?: string; size?: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 40 40)" className="transition-all duration-1000" />
      <text x="40" y="38" textAnchor="middle" className="fill-white text-[14px] font-semibold">{Math.round(pct * 100)}%</text>
      <text x="40" y="50" textAnchor="middle" className="fill-gray-500 text-[8px]">hit rate</text>
    </svg>
  );
}

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", models: "Claude Haiku · Sonnet · Opus", color: "#D4A574", bg: "from-[#D4A574]/10 to-transparent" },
  { id: "openai", name: "OpenAI", models: "GPT-4o · GPT-4o Mini", color: "#74AA9C", bg: "from-[#74AA9C]/10 to-transparent" },
  { id: "google", name: "Google", models: "Gemini Flash · Flash Lite · Pro", color: "#4285F4", bg: "from-[#4285F4]/10 to-transparent" },
  { id: "groq", name: "Groq", models: "Llama 3.1 · 3.3 · Mixtral · DeepSeek", color: "#F55036", bg: "from-[#F55036]/10 to-transparent" },
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
  const [routingRules, setRoutingRules] = useState({ anthropic_simple: "claude-haiku-4-5-20251001", anthropic_complex: "claude-sonnet-4-6", openai_simple: "gpt-4o-mini", openai_complex: "gpt-4o", google_simple: "gemini-2.0-flash-lite", google_complex: "gemini-2.0-flash", groq_simple: "llama-3.1-8b-instant", groq_complex: "llama-3.3-70b-versatile", threshold: 100 });
  const [routingMsg, setRoutingMsg] = useState("");
  const router = useRouter();
  const proxy = "https://tokensave.vercel.app/api/proxy";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        try { const k = localStorage.getItem("ts_keys_" + data.user.id); if (k) setSavedKeys(JSON.parse(k)); } catch {}
        try { const b = localStorage.getItem("ts_budget_" + data.user.id); if (b) { const p = JSON.parse(b); setBudgetLimit(p.limit || 1000); setBudgetAlert(p.alertPercent || 80); } } catch {}
        try { const r = localStorage.getItem("ts_routing_" + data.user.id); if (r) setRoutingRules(JSON.parse(r)); } catch {}
      } else router.push("/login");
      setLoading(false);
    });
    fetchStats();
    const i = setInterval(fetchStats, 15000);
    return () => clearInterval(i);
  }, [router]);

  const fetchStats = async () => { try { setStats(await (await fetch("/api/stats")).json()); } catch {} };

  if (loading) return <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">TS</div><div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;

  const t = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0, errors: 0, total_saved: 0 };
  const days = stats?.days || [];
  const perf = stats?.performance || {};
  const cacheRate = t.total_requests > 0 ? Math.round((t.cache_hits / t.total_requests) * 100) : 0;
  const reqData = days.map((d: any) => d.total_requests);
  const savedData = days.map((d: any) => d.tokens_saved);
  const filteredLogs = (stats?.recent_logs || []).filter((l: any) => {
    const s = !logSearch || JSON.stringify(l).toLowerCase().includes(logSearch.toLowerCase());
    const f = logFilter === "all" || (logFilter === "cached" && l.cache_hit) || (logFilter === "not_cached" && !l.cache_hit) || logFilter === l.provider;
    return s && f;
  });
  const tabs = ["overview", "keys", "logs", "routing", "settings"];

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100">
      <nav className="border-b border-white/[0.04] backdrop-blur-sm sticky top-0 z-10 bg-[#08090C]/80">
        <div className="flex justify-between items-center px-6 lg:px-10 py-3.5 max-w-[1440px] mx-auto">
          <a href="/" className="flex items-center gap-2.5"><div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">TS</div><span className="text-lg font-semibold tracking-tight">TokenSave</span></a>
          <div className="flex items-center gap-5">
            <a href="/playground" className="text-[13px] text-gray-500 hover:text-gray-300 hidden sm:block transition-colors">Playground</a>
            <a href="/docs" className="text-[13px] text-gray-500 hover:text-gray-300 hidden sm:block transition-colors">Docs</a>
            <div className="h-4 w-px bg-white/[0.06] hidden sm:block"></div>
            <span className="text-gray-600 text-[13px] hidden md:block">{user?.email}</span>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="text-[13px] text-gray-500 hover:text-red-400 transition-colors">Log out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        {budgetLimit > 0 && t.total_requests >= budgetLimit * (budgetAlert / 100) && (
          <div className="bg-gradient-to-r from-red-500/5 to-transparent border border-red-500/10 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div></div>
            <div><p className="text-red-400 text-sm font-medium">Budget alert</p><p className="text-gray-500 text-xs">{t.total_requests}/{budgetLimit} requests ({Math.round((t.total_requests / budgetLimit) * 100)}%)</p></div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div><p className="text-gray-500 text-[13px] mb-1">Welcome back</p><h1 className="text-[32px] font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Dashboard</h1></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full px-3.5 py-1.5"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div><span className="text-emerald-400 text-xs font-medium">System active</span></div>
            {perf.avg_latency_ms > 0 && <span className="text-gray-600 text-xs bg-white/[0.02] px-3 py-1.5 rounded-full">{perf.avg_latency_ms}ms avg latency</span>}
          </div>
        </div>

        <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
          {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[13px] font-medium rounded-lg capitalize transition-all ${tab === t ? "bg-white/[0.06] text-cyan-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"}`}>{t === "keys" ? "API Keys" : t}</button>)}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-cyan-500/5 to-transparent border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Requests</p>
                <p className="text-3xl font-bold mt-1 text-white">{t.total_requests}</p>
                <div className="mt-3"><MiniChart data={reqData.length > 0 ? reqData : [0, 0, 0, 0, 0, 0, 0]} color="#22d3ee" height={40} /></div>
                <p className="text-[10px] text-gray-600 mt-1">7-day trend</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Tokens saved</p>
                <p className="text-3xl font-bold mt-1 text-emerald-400">{t.tokens_saved.toLocaleString()}</p>
                <div className="mt-3"><MiniChart data={savedData.length > 0 ? savedData : [0, 0, 0, 0, 0, 0, 0]} color="#34d399" height={40} /></div>
                <p className="text-[10px] text-gray-600 mt-1">7-day trend</p>
              </div>
              <div className="bg-gradient-to-br from-violet-500/5 to-transparent border border-white/[0.04] rounded-2xl p-5 flex flex-col items-center justify-center">
                <DonutChart value={t.cache_hits} max={t.total_requests || 1} color="#a78bfa" />
                <p className="text-[11px] text-gray-500 mt-2">Cache performance</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Est. saved</p>
                <p className="text-3xl font-bold mt-1 text-amber-400">${(t.total_saved || t.tokens_saved * 0.000003).toFixed(4)}</p>
                <p className="text-[11px] text-gray-600 mt-2">vs direct API calls</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${Math.min(cacheRate, 100)}%` }}></div></div>
                  <span className="text-[10px] text-amber-400">{cacheRate}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5"><h2 className="text-[15px] font-semibold">Request volume</h2><span className="text-[10px] text-gray-600 bg-white/[0.03] px-2.5 py-1 rounded-full">Live · 15s refresh</span></div>
                <div className="flex items-end gap-[5px] h-44">
                  {days.map((d: any, i: number) => {
                    const max = Math.max(...days.map((x: any) => x.total_requests), 1);
                    const h = Math.max((d.total_requests / max) * 100, 3);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <span className="text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">{d.total_requests}</span>
                        <div className="w-full flex items-end" style={{ height: "140px" }}>
                          <div className="w-full rounded-md transition-all duration-700 group-hover:opacity-80" style={{ height: `${h}%`, background: d.total_requests > 0 ? `linear-gradient(to top, rgba(34,211,238,0.6), rgba(34,211,238,0.15))` : "rgba(255,255,255,0.02)" }}></div>
                        </div>
                        <span className="text-[10px] text-gray-600">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-5">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">Endpoint</p>
                  <div className="flex gap-2"><code className="flex-1 text-[11px] text-cyan-400 bg-black/40 rounded-lg px-3 py-2.5 truncate font-mono">{proxy}</code><button onClick={() => { navigator.clipboard.writeText(proxy); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] text-gray-400 transition-colors shrink-0">{copied ? "✓" : "Copy"}</button></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a href="/playground" className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 hover:border-cyan-400/20 transition-all group"><p className="text-[13px] font-medium group-hover:text-cyan-400 transition-colors">Playground</p><p className="text-[10px] text-gray-600 mt-0.5">Chat · Compare · Test</p></a>
                  <a href="/docs" className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 hover:border-cyan-400/20 transition-all group"><p className="text-[13px] font-medium group-hover:text-cyan-400 transition-colors">API Docs</p><p className="text-[10px] text-gray-600 mt-0.5">8 languages</p></a>
                </div>
              </div>
            </div>

            <div><h2 className="text-[15px] font-semibold mb-4">Supported providers</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PROVIDERS.map(p => (
                  <div key={p.id} className={`bg-gradient-to-br ${p.bg} border border-white/[0.04] rounded-2xl p-4`}>
                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: p.color + "18", color: p.color }}>{p.id[0].toUpperCase()}</div><span className="text-[14px] font-semibold">{p.name}</span></div>
                    <p className="text-[11px] text-gray-500">{p.models}</p>
                  </div>
                ))}
              </div>
            </div>

            <div><h2 className="text-[15px] font-semibold mb-4">How we optimize</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { t: "Semantic Cache", d: "Same query? Return cached answer instantly.", s: "100% saved on repeats", c: "#22d3ee" },
                  { t: "Smart Routing", d: "Simple → cheap model, complex → smart model.", s: "Up to 66% per request", c: "#a78bfa" },
                  { t: "Prompt Compression", d: "Strip filler words, preserve meaning.", s: "5-15% token savings", c: "#34d399" },
                  { t: "Quality Modes", d: "auto · max_savings · max_quality — you choose.", s: "Full control", c: "#fbbf24" },
                  { t: "Provider Fallback", d: "Rate limited? Auto-switch to backup provider.", s: "Zero downtime", c: "#f472b6" },
                  { t: "Context Summary", d: "Long conversations compressed by 88%.", s: "Heavy user support", c: "#fb923c" },
                ].map((f, i) => (
                  <div key={i} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 hover:border-white/[0.08] transition-colors">
                    <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.c }}></div><h3 className="text-[13px] font-medium">{f.t}</h3></div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{f.d}</p>
                    <p className="text-[10px] mt-2 font-medium" style={{ color: f.c }}>{f.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "keys" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6"><h2 className="text-[15px] font-semibold mb-1">TokenSave API key</h2><p className="text-[12px] text-gray-500 mb-4">For usage tracking and higher rate limits.</p><TSKeyManager userId={user?.id} email={user?.email} /></div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6"><h2 className="text-[15px] font-semibold mb-1">Provider keys</h2><p className="text-[12px] text-gray-500 mb-5">Browser-only storage. Never touches our servers.</p>
              <div className="space-y-3">
                {PROVIDERS.map(p => (<div key={p.id}><label className="text-[12px] text-gray-400 mb-1 block">{p.name}</label><input type="password" placeholder={p.id === "anthropic" ? "sk-ant-..." : p.id === "openai" ? "sk-..." : p.id === "google" ? "AIza..." : "gsk_..."} value={(savedKeys as any)[p.id]} onChange={e => setSavedKeys({ ...savedKeys, [p.id]: e.target.value })} className="w-full px-3.5 py-2.5 bg-black/40 border border-white/5 rounded-lg text-gray-200 placeholder-gray-700 text-sm font-mono focus:outline-none focus:border-cyan-400/30 transition-colors" /></div>))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_keys_" + user.id, JSON.stringify(savedKeys)); setKeyMsg("Saved!"); setTimeout(() => setKeyMsg(""), 1500); } }} className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">{keyMsg || "Save keys"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search..." className="flex-1 px-3.5 py-2 bg-black/40 border border-white/5 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400/30" />
              <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="px-3.5 py-2 bg-black/40 border border-white/5 rounded-lg text-gray-300 text-sm"><option value="all">All</option><option value="cached">Cached</option><option value="not_cached">Not cached</option>{PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button onClick={fetchStats} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition-colors">Refresh</button>
            </div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl overflow-hidden">
              {filteredLogs.length > 0 ? (<div className="overflow-x-auto"><table className="w-full min-w-[650px]"><thead><tr className="text-[10px] text-gray-500 uppercase tracking-wider text-left border-b border-white/[0.04]"><th className="px-5 py-3">Time</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Model</th><th className="px-5 py-3">Cache</th><th className="px-5 py-3">Saved</th><th className="px-5 py-3">Complexity</th></tr></thead>
                <tbody>{filteredLogs.map((l: any, i: number) => (<tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors"><td className="px-5 py-3 text-gray-600 text-[11px]">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</td><td className="px-5 py-3 text-gray-300 text-sm capitalize">{l.provider || "—"}</td><td className="px-5 py-3"><span className="px-2 py-0.5 bg-white/[0.03] rounded text-[11px] text-gray-400 font-mono">{l.model || "cached"}</span></td><td className="px-5 py-3">{l.cache_hit ? <span className="text-emerald-400 text-[11px] font-medium">Hit</span> : <span className="text-gray-600 text-[11px]">Miss</span>}</td><td className="px-5 py-3 text-emerald-400 text-sm font-medium">+{l.tokens_saved || 0}</td><td className="px-5 py-3 text-gray-500 text-[11px] capitalize">{l.complexity || "—"}</td></tr>))}</tbody></table></div>
              ) : (<div className="text-center py-16"><p className="text-gray-600 text-sm mb-2">No requests found</p><a href="/playground" className="text-cyan-400 text-sm hover:underline">Send your first request →</a></div>)}
            </div>
          </div>
        )}

        {tab === "routing" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold mb-1">Model routing</h2><p className="text-[12px] text-gray-500 mb-5">Choose which models handle simple vs complex tasks.</p>
              <div className="space-y-4">
                <div><label className="text-[12px] text-gray-400 block mb-1">Word count threshold</label><input type="number" value={routingRules.threshold} onChange={e => setRoutingRules({ ...routingRules, threshold: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-black/40 border border-white/5 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400/30" /><p className="text-[10px] text-gray-600 mt-1">Below = simple · Above = complex</p></div>
                {[
                  { l: "Anthropic", s: "anthropic_simple", c: "anthropic_complex", m: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"] },
                  { l: "OpenAI", s: "openai_simple", c: "openai_complex", m: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
                  { l: "Google", s: "google_simple", c: "google_complex", m: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"] },
                  { l: "Groq", s: "groq_simple", c: "groq_complex", m: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
                ].map(p => (<div key={p.l} className="bg-black/20 border border-white/[0.03] rounded-xl p-4"><p className="text-sm font-medium mb-3">{p.l}</p><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-gray-500 block mb-1">Simple</label><select value={(routingRules as any)[p.s]} onChange={e => setRoutingRules({ ...routingRules, [p.s]: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-emerald-400 text-[11px] font-mono">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div><label className="text-[10px] text-gray-500 block mb-1">Complex</label><select value={(routingRules as any)[p.c]} onChange={e => setRoutingRules({ ...routingRules, [p.c]: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-cyan-400 text-[11px] font-mono">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div></div>))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_routing_" + user.id, JSON.stringify(routingRules)); setRoutingMsg("Saved!"); setTimeout(() => setRoutingMsg(""), 1500); } }} className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-sm font-semibold hover:opacity-90">{routingMsg || "Save rules"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6"><h2 className="text-[15px] font-semibold mb-4">Account</h2>
              {[{ l: "Email", v: user?.email }, { l: "User ID", v: user?.id?.slice(0, 18) + "...", m: true }, { l: "Plan", v: "Free Trial — 14 days", h: true }, { l: "Endpoint", v: proxy, m: true }].map((r, i) => (<div key={i} className="flex justify-between py-2.5 border-b border-white/[0.03] last:border-0"><span className="text-gray-500 text-sm">{r.l}</span><span className={`text-sm ${r.h ? "text-cyan-400 font-medium" : r.m ? "font-mono text-gray-400 text-[12px]" : "text-gray-200"}`}>{r.v}</span></div>))}
            </div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6"><h2 className="text-[15px] font-semibold mb-1">Budget alerts</h2><p className="text-[12px] text-gray-500 mb-4">Warn when approaching daily limit.</p>
              <div className="space-y-3">
                <div><label className="text-[12px] text-gray-400 block mb-1">Daily limit</label><input type="number" value={budgetLimit} onChange={e => setBudgetLimit(Number(e.target.value))} className="w-full px-3.5 py-2.5 bg-black/40 border border-white/5 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400/30" /></div>
                <div><label className="text-[12px] text-gray-400 block mb-1">Alert at</label><select value={budgetAlert} onChange={e => setBudgetAlert(Number(e.target.value))} className="w-full px-3.5 py-2.5 bg-black/40 border border-white/5 rounded-lg text-gray-200 text-sm"><option value={50}>50%</option><option value={75}>75%</option><option value={80}>80%</option><option value={90}>90%</option></select></div>
                <button onClick={() => { if (user) { localStorage.setItem("ts_budget_" + user.id, JSON.stringify({ limit: budgetLimit, alertPercent: budgetAlert })); setBudgetMsg("Saved!"); setTimeout(() => setBudgetMsg(""), 1500); } }} className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-sm font-semibold hover:opacity-90">{budgetMsg || "Save budget"}</button>
                {t.total_requests > 0 && budgetLimit > 0 && (<div className="bg-black/20 rounded-xl p-4 mt-2"><div className="flex justify-between text-[11px] mb-2"><span className="text-gray-500">Usage</span><span className={t.total_requests >= budgetLimit * (budgetAlert / 100) ? "text-red-400" : "text-gray-400"}>{t.total_requests}/{budgetLimit}</span></div><div className="w-full bg-white/[0.03] rounded-full h-1.5"><div className={`h-1.5 rounded-full transition-all ${t.total_requests >= budgetLimit * (budgetAlert / 100) ? "bg-gradient-to-r from-red-400 to-red-500" : "bg-gradient-to-r from-cyan-400 to-blue-500"}`} style={{ width: `${Math.min((t.total_requests / budgetLimit) * 100, 100)}%` }}></div></div></div>)}
              </div>
            </div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6"><h2 className="text-[15px] font-semibold mb-2">Support</h2><p className="text-[12px] text-gray-500 mb-3">Need help?</p><a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 text-sm hover:underline">prathamg200404@gmail.com</a></div>
          </div>
        )}
      </div>
    </div>
  );
}