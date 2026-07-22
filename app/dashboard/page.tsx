"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";
import { ProviderLogo } from "../icons";

function KeyManager({ userId, email }: { userId: string; email: string }) {
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (userId) fetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email }) }).then(r => r.json()).then(d => { if (d.key) setKey(d.key); }).catch(() => {}); }, [userId, email]);
  if (!key) return <div className="h-12 bg-white/[0.02] rounded-xl animate-pulse" />;
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1 bg-[#0A0D12] border border-white/[0.06] rounded-xl px-4 py-3 font-mono text-[#5B8DEF] text-[13px] truncate">{show ? key : key.slice(0, 12) + "•".repeat(16) + key.slice(-4)}</div>
        <button onClick={() => setShow(!show)} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[11px] text-[#5A6577] transition-colors">{show ? "Hide" : "Show"}</button>
        <button onClick={() => { navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[11px] text-[#5A6577] transition-colors">{copied ? "✓" : "Copy"}</button>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-[#3D4654]">Include as <code className="text-[#5A6577]">tsKey</code> in requests</span>
        {!confirmRotate ? <button onClick={() => setConfirmRotate(true)} className="text-[10px] text-[#3D4654] hover:text-[#FF5F57] transition-colors">Rotate key</button>
        : <div className="flex gap-2"><button onClick={async () => { const r = await fetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email, action: "rotate" }) }).then(r => r.json()); if (r.key) { setKey(r.key); setMsg("Rotated!"); setTimeout(() => setMsg(""), 3000); } setConfirmRotate(false); }} className="text-[10px] text-[#FF5F57]">Confirm</button><button onClick={() => setConfirmRotate(false)} className="text-[10px] text-[#3D4654]">Cancel</button></div>}
      </div>
      {msg && <p className="text-[#E8B94B] text-[10px] mt-1">{msg}</p>}
    </div>
  );
}

function AreaChart({ data, color, height = 100 }: { data: number[]; color: string; height?: number }) {
  if (data.length === 0) data = [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...data, 1);
  const w = 100;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: height - 8 - (v / max) * (height - 20) }));
  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `0,${height} ${line} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`g-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g-${color.replace("#","")})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3 : 0} fill={color} />)}
    </svg>
  );
}

function DonutChart({ value, total, color, size = 90 }: { value: number; total: number; color: string; size?: number }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const r = 34; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 1.5s ease" }} />
      <text x="45" y="42" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="system-ui">{Math.round(pct * 100)}%</text>
      <text x="45" y="56" textAnchor="middle" fill="#5A6577" fontSize="9" fontFamily="system-ui">hit rate</text>
    </svg>
  );
}

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", models: "Claude Haiku · Sonnet", color: "#D4A574" },
  { id: "openai", name: "OpenAI", models: "GPT-4o · 4o Mini", color: "#74AA9C" },
  { id: "google", name: "Google", models: "Gemini Flash · Pro", color: "#4285F4" },
  { id: "groq", name: "Groq", models: "Llama · Mixtral", color: "#F55036" },
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

  if (loading) return <div className="min-h-screen bg-[#0A0D12] flex flex-col items-center justify-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-xl flex items-center justify-center text-white font-bold">TS</div><div className="w-5 h-5 border-2 border-[#5B8DEF] border-t-transparent rounded-full animate-spin" /></div>;

  const t = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0, errors: 0, total_cost: 0, total_saved: 0 };
  const days = stats?.days || [];
  const perf = stats?.performance || {};
  const cacheRate = t.total_requests > 0 ? Math.round((t.cache_hits / t.total_requests) * 100) : 0;
  const errorRate = t.total_requests > 0 ? Math.round(((t.errors || 0) / t.total_requests) * 100) : 0;
  const reqData = days.map((d: any) => d.total_requests);
  const savedData = days.map((d: any) => d.tokens_saved);
  const filteredLogs = (stats?.recent_logs || []).filter((l: any) => {
    const s = !logSearch || JSON.stringify(l).toLowerCase().includes(logSearch.toLowerCase());
    const f = logFilter === "all" || (logFilter === "cached" && l.cache_hit) || (logFilter === "not_cached" && !l.cache_hit) || logFilter === l.provider;
    return s && f;
  });

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4]">
      <nav className="sticky top-0 z-50 bg-[#0A0D12]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1400px] mx-auto">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20">TS</div>
            <span className="text-[17px] font-semibold tracking-tight">TokenSave</span>
          </a>
          <div className="flex items-center gap-5">
            <a href="/playground" className="text-[13px] text-[#5A6577] hover:text-white transition-colors hidden sm:block">Playground</a>
            <a href="/docs" className="text-[13px] text-[#5A6577] hover:text-white transition-colors hidden sm:block">Docs</a>
            <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />
            <span className="text-[#3D4654] text-[13px] hidden md:block">{user?.email}</span>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="text-[13px] text-[#5A6577] hover:text-[#FF5F57] transition-colors">Log out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8">
        {budgetLimit > 0 && t.total_requests >= budgetLimit * (budgetAlert / 100) && (
          <div className="bg-[#FF5F57]/[0.03] border border-[#FF5F57]/10 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-[#FF5F57] rounded-full animate-pulse" />
            <p className="text-[#FF5F57] text-[13px]"><span className="font-semibold">Budget alert:</span> {t.total_requests}/{budgetLimit} requests ({Math.round((t.total_requests / budgetLimit) * 100)}%)</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[#3D4654] text-[13px]">Welcome back</p>
            <h1 className="text-[32px] font-bold tracking-tight font-display">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#4ADE80]/5 border border-[#4ADE80]/10 rounded-full px-3.5 py-1.5">
              <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse" />
              <span className="text-[#4ADE80] text-[11px] font-medium">System active</span>
            </div>
            {perf.avg_latency_ms > 0 && <span className="text-[11px] text-[#3D4654] bg-white/[0.02] px-3 py-1.5 rounded-full">{perf.avg_latency_ms}ms avg</span>}
          </div>
        </div>

        <div className="flex gap-1 mb-8 overflow-x-auto">
          {[{ id: "overview", l: "Overview", i: "📊" }, { id: "keys", l: "API Keys", i: "🔑" }, { id: "logs", l: "Logs", i: "📋" }, { id: "routing", l: "Routing", i: "🔀" }, { id: "settings", l: "Settings", i: "⚙️" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-1.5 ${tab === t.id ? "bg-[#5B8DEF]/10 text-[#5B8DEF]" : "text-[#5A6577] hover:text-white hover:bg-white/[0.02]"}`}>{t.i} {t.l}</button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Total Requests", value: t.total_requests || 0, sub: "7-day total", color: "#5B8DEF", chart: reqData },
                { label: "Tokens Saved", value: (t.tokens_saved || 0).toLocaleString(), sub: "across all requests", color: "#4ADE80", chart: savedData },
                { label: "Est. Cost Saved", value: "$" + (t.total_saved || t.tokens_saved * 0.000003 || 0).toFixed(4), sub: "vs direct API calls", color: "#E8B94B", chart: null },
                { label: "Error Rate", value: errorRate + "%", sub: (t.errors || 0) + " total errors", color: errorRate > 5 ? "#FF5F57" : "#4ADE80", chart: null },
              ].map((s, i) => (
                <div key={i} className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all">
                  <p className="text-[10px] text-[#5A6577] uppercase tracking-wider">{s.label}</p>
                  <p className="text-[28px] font-bold tracking-tight mt-1 font-display" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-[#3D4654] mt-0.5">{s.sub}</p>
                  {s.chart && <div className="mt-2"><AreaChart data={s.chart.length > 0 ? s.chart : [0,0,0,0,0,0,0]} color={s.color} height={40} /></div>}
                </div>
              ))}
              <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5 flex flex-col items-center justify-center hover:border-white/[0.1] transition-all">
                <DonutChart value={t.cache_hits || 0} total={t.total_requests || 1} color="#A78BFA" />
                <p className="text-[10px] text-[#3D4654] mt-1">Cache performance</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-[15px] font-semibold font-display">Request volume</h2>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse" /><span className="text-[10px] text-[#3D4654]">Live · 15s refresh</span></div>
                </div>
                <div className="flex items-end gap-[6px] h-44">
                  {days.map((d: any, i: number) => {
                    const maxR = Math.max(...days.map((x: any) => x.total_requests), 1);
                    const h = Math.max((d.total_requests / maxR) * 100, 3);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                        <span className="text-[9px] text-[#3D4654] opacity-0 group-hover:opacity-100 transition-opacity">{d.total_requests}</span>
                        <div className="w-full flex items-end" style={{ height: 130 }}>
                          <div className="w-full rounded-md transition-all duration-500 group-hover:opacity-80" style={{ height: `${h}%`, background: d.total_requests > 0 ? "linear-gradient(to top, rgba(91,141,239,0.6), rgba(91,141,239,0.15))" : "rgba(255,255,255,0.02)" }} />
                        </div>
                        <span className="text-[10px] text-[#3D4654]">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5">
                  <p className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-3">Proxy endpoint</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-[11px] text-[#5B8DEF] bg-[#0A0D12] rounded-xl px-3 py-2.5 truncate font-mono">{proxy}</code>
                    <button onClick={() => { navigator.clipboard.writeText(proxy); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[11px] text-[#5A6577] transition-colors shrink-0">{copied ? "✓" : "Copy"}</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a href="/playground" className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-4 hover:border-[#5B8DEF]/20 transition-all group">
                    <p className="text-[13px] font-semibold group-hover:text-[#5B8DEF] transition-colors">Playground</p>
                    <p className="text-[10px] text-[#3D4654] mt-0.5">Test · Chat · Compare</p>
                  </a>
                  <a href="/docs" className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-4 hover:border-[#5B8DEF]/20 transition-all group">
                    <p className="text-[13px] font-semibold group-hover:text-[#5B8DEF] transition-colors">API Docs</p>
                    <p className="text-[10px] text-[#3D4654] mt-0.5">8 languages</p>
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[15px] font-semibold font-display mb-4">Supported providers</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PROVIDERS.map(p => (
                  <div key={p.id} className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: p.color + "10" }}>
                      <ProviderLogo provider={p.id} size={22} />
                    </div>
                    <div><p className="text-[13px] font-semibold">{p.name}</p><p className="text-[10px] text-[#3D4654]">{p.models}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-[15px] font-semibold font-display mb-4">Optimization features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { t: "Semantic cache", d: "Same query = cached response, $0 cost", m: "100% savings", c: "#4ADE80" },
                  { t: "Smart routing", d: "Simple → cheap, complex → smart model", m: "Up to 66%", c: "#5B8DEF" },
                  { t: "Compression", d: "Strip filler words, preserve meaning", m: "5-15% saved", c: "#E8B94B" },
                  { t: "Auto-fallback", d: "Rate limited? Auto-switch provider", m: "Zero downtime", c: "#F472B6" },
                  { t: "Quality modes", d: "auto · max_savings · max_quality", m: "Full control", c: "#A78BFA" },
                  { t: "Context summary", d: "Compress long conversations 88%", m: "Heavy users", c: "#FB923C" },
                ].map((f, i) => (
                  <div key={i} className="bg-[#12161E]/60 border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all group">
                    <div className="flex items-center gap-2 mb-2"><div className="w-2.5 h-2.5 rounded-full group-hover:scale-150 transition-transform" style={{ backgroundColor: f.c, boxShadow: `0 0 10px ${f.c}30` }} /><h3 className="text-[13px] font-semibold">{f.t}</h3></div>
                    <p className="text-[11px] text-[#5A6577]">{f.d}</p>
                    <p className="text-[11px] font-medium mt-2" style={{ color: f.c }}>{f.m}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "keys" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">TokenSave API key</h2>
              <p className="text-[12px] text-[#5A6577] mb-4">For usage tracking and higher rate limits.</p>
              <KeyManager userId={user?.id} email={user?.email} />
            </div>
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Provider keys</h2>
              <p className="text-[12px] text-[#5A6577] mb-5">Stored in your browser only. Never sent to our servers.</p>
              <div className="space-y-3">
                {PROVIDERS.map(p => (
                  <div key={p.id}>
                    <label className="flex items-center gap-2 text-[12px] text-[#5A6577] mb-1.5"><ProviderLogo provider={p.id} size={16} />{p.name}</label>
                    <input type="password" placeholder={p.id === "anthropic" ? "sk-ant-..." : p.id === "openai" ? "sk-..." : p.id === "google" ? "AIza..." : "gsk_..."} value={(savedKeys as any)[p.id]} onChange={e => setSavedKeys({ ...savedKeys, [p.id]: e.target.value })} className="w-full px-4 py-3 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#3D4654] font-mono focus:outline-none focus:border-[#5B8DEF]/30 transition-colors" />
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_keys_" + user.id, JSON.stringify(savedKeys)); setKeyMsg("Saved!"); setTimeout(() => setKeyMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">{keyMsg || "Save keys"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search logs..." className="flex-1 px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#3D4654] focus:outline-none focus:border-[#5B8DEF]/30" />
              <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none">
                <option value="all">All</option><option value="cached">Cached</option><option value="not_cached">Not cached</option>
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={fetchStats} className="px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[13px] text-[#5A6577] transition-colors">Refresh</button>
            </div>
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl overflow-hidden">
              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px]">
                    <thead><tr className="text-[10px] text-[#5A6577] uppercase tracking-wider text-left border-b border-white/[0.04]">
                      <th className="px-5 py-3">Time</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Model</th><th className="px-5 py-3">Cache</th><th className="px-5 py-3">Saved</th><th className="px-5 py-3">Complexity</th>
                    </tr></thead>
                    <tbody>{filteredLogs.map((l: any, i: number) => (
                      <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors">
                        <td className="px-5 py-3 text-[11px] text-[#3D4654]">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-5 py-3 text-[13px] text-[#7A8599] capitalize">{l.provider || "—"}</td>
                        <td className="px-5 py-3"><span className="text-[11px] text-[#5A6577] bg-white/[0.03] px-2 py-0.5 rounded font-mono">{l.model || "cached"}</span></td>
                        <td className="px-5 py-3">{l.cache_hit ? <span className="text-[#4ADE80] text-[11px] font-medium">Hit</span> : <span className="text-[#3D4654] text-[11px]">Miss</span>}</td>
                        <td className="px-5 py-3 text-[#4ADE80] text-[13px] font-medium">+{l.tokens_saved || 0}</td>
                        <td className="px-5 py-3 text-[#5A6577] text-[11px] capitalize">{l.complexity || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16"><p className="text-[#3D4654] mb-2">No requests yet</p><a href="/playground" className="text-[#5B8DEF] text-[13px] hover:underline">Send your first request →</a></div>
              )}
            </div>
          </div>
        )}

        {tab === "routing" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Model routing rules</h2>
              <p className="text-[12px] text-[#5A6577] mb-5">Choose which models handle simple vs complex tasks.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-[#5A6577] block mb-1.5">Word count threshold</label>
                  <input type="number" value={routingRules.threshold} onChange={e => setRoutingRules({ ...routingRules, threshold: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none focus:border-[#5B8DEF]/30" />
                  <p className="text-[10px] text-[#3D4654] mt-1">Below = simple · Above = complex</p>
                </div>
                {[
                  { l: "Anthropic", s: "anthropic_simple", c: "anthropic_complex", m: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"] },
                  { l: "OpenAI", s: "openai_simple", c: "openai_complex", m: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
                  { l: "Google", s: "google_simple", c: "google_complex", m: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"] },
                  { l: "Groq", s: "groq_simple", c: "groq_complex", m: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
                ].map(p => (
                  <div key={p.l} className="bg-[#0A0D12] border border-white/[0.04] rounded-xl p-4">
                    <p className="text-[13px] font-medium mb-3">{p.l}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-[#3D4654] block mb-1">Simple</label><select value={(routingRules as any)[p.s]} onChange={e => setRoutingRules({ ...routingRules, [p.s]: e.target.value })} className="w-full px-3 py-2 bg-[#12161E] border border-white/[0.06] rounded-lg text-[#4ADE80] text-[11px] font-mono focus:outline-none">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                      <div><label className="text-[10px] text-[#3D4654] block mb-1">Complex</label><select value={(routingRules as any)[p.c]} onChange={e => setRoutingRules({ ...routingRules, [p.c]: e.target.value })} className="w-full px-3 py-2 bg-[#12161E] border border-white/[0.06] rounded-lg text-[#5B8DEF] text-[11px] font-mono focus:outline-none">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_routing_" + user.id, JSON.stringify(routingRules)); setRoutingMsg("Saved!"); setTimeout(() => setRoutingMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">{routingMsg || "Save rules"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-4">Account</h2>
              {[{ l: "Email", v: user?.email }, { l: "User ID", v: user?.id?.slice(0, 18) + "...", m: true }, { l: "Plan", v: "Free Trial — 14 days", h: true }, { l: "Endpoint", v: proxy, m: true }].map((r, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-white/[0.03] last:border-0">
                  <span className="text-[#5A6577] text-[13px]">{r.l}</span>
                  <span className={`text-[13px] ${r.h ? "text-[#5B8DEF] font-medium" : r.m ? "font-mono text-[#5A6577] text-[11px]" : "text-[#E8ECF4]"}`}>{r.v}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Budget alerts</h2>
              <p className="text-[12px] text-[#5A6577] mb-4">Warn when approaching daily limit.</p>
              <div className="space-y-3">
                <div><label className="text-[12px] text-[#5A6577] block mb-1.5">Daily limit</label><input type="number" value={budgetLimit} onChange={e => setBudgetLimit(Number(e.target.value))} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none focus:border-[#5B8DEF]/30" /></div>
                <div><label className="text-[12px] text-[#5A6577] block mb-1.5">Alert at</label><select value={budgetAlert} onChange={e => setBudgetAlert(Number(e.target.value))} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4]"><option value={50}>50%</option><option value={75}>75%</option><option value={80}>80%</option><option value={90}>90%</option></select></div>
                <button onClick={() => { if (user) { localStorage.setItem("ts_budget_" + user.id, JSON.stringify({ limit: budgetLimit, alertPercent: budgetAlert })); setBudgetMsg("Saved!"); setTimeout(() => setBudgetMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">{budgetMsg || "Save budget"}</button>
                {t.total_requests > 0 && budgetLimit > 0 && (
                  <div className="bg-[#0A0D12] rounded-xl p-4 mt-2">
                    <div className="flex justify-between text-[11px] mb-2"><span className="text-[#3D4654]">Usage</span><span className={t.total_requests >= budgetLimit * (budgetAlert / 100) ? "text-[#FF5F57]" : "text-[#5A6577]"}>{t.total_requests}/{budgetLimit}</span></div>
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${t.total_requests >= budgetLimit * (budgetAlert / 100) ? "bg-gradient-to-r from-[#FF5F57] to-[#FF8A65]" : "bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA]"}`} style={{ width: `${Math.min((t.total_requests / budgetLimit) * 100, 100)}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-2">Support</h2>
              <p className="text-[12px] text-[#5A6577] mb-3">Need help?</p>
              <a href="mailto:prathamg200404@gmail.com" className="text-[#5B8DEF] text-[13px] hover:underline">prathamg200404@gmail.com</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}