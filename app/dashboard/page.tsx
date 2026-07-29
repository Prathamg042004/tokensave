"use client";
import { useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";
import { ProviderLogo } from "../icons";

// Attaches the signed-in user's Supabase access token to dashboard API calls.
// The API routes no longer trust a userId sent in the body.
function fetchWithAuth(input: string, init: RequestInit = {}) {
  return supabase.auth.getSession().then(({ data }) => {
    const accessToken = data.session?.access_token;
    return fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
        ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
      },
    });
  });
}


// Animations
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold }); o.observe(el); return () => o.disconnect(); }, [threshold]);
  return { ref, v };
}

function FadeUp({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, v } = useInView();
  return <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(20px)", transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>{children}</div>;
}

function CountUp({ end, prefix = "", suffix = "", decimals = 0 }: { end: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const { ref, v } = useInView(0.5);
  useEffect(() => {
    if (!v || end === 0) return;
    const dur = 1200; const start = performance.now();
    const anim = (now: number) => { const t = Math.min((now - start) / dur, 1); const ease = 1 - Math.pow(1 - t, 4); setVal(ease * end); if (t < 1) requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
  }, [v, end]);
  return <span ref={ref}>{prefix}{decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString()}{suffix}</span>;
}

// Charts
function AreaChart({ data, labels, color, height = 120 }: { data: number[]; labels?: string[]; color: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) data = [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...data, 1);
  const w = 300; const pad = 30;
  const pts = data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: 10 + (height - 30) - (v / max) * (height - 40) }));
  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${pad},${height - 20} ${line} ${w - pad},${height - 20}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={`ag-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = 10 + (height - 30) - pct * (height - 40);
        return <g key={i}><line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.03)" /><text x={pad - 5} y={y + 3} textAnchor="end" fill="#3D4654" fontSize="8" fontFamily="system-ui">{Math.round(max * pct)}</text></g>;
      })}
      <polygon points={area} fill={`url(#ag-${color.replace("#","")})`}>
        <animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze" />
      </polygon>
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="1.5s" fill="freeze" />
        <animate attributeName="stroke-dasharray" from="1000" to="1000" dur="0.01s" fill="freeze" />
      </polyline>
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "default" }}>
          <rect x={p.x - 15} y={0} width={30} height={height} fill="transparent" />
          {hover === i && <>
            <line x1={p.x} y1={10} x2={p.x} y2={height - 20} stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="3,3" />
            <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="#0A0D12" strokeWidth="2" />
            <rect x={p.x - 25} y={p.y - 28} width={50} height={20} rx={5} fill="#1a1f2e" stroke={color} strokeWidth="0.5" />
            <text x={p.x} y={p.y - 15} textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">{data[i]}</text>
          </>}
        </g>
      ))}
      {labels && labels.map((l, i) => (
        <text key={i} x={pts[i]?.x || 0} y={height - 5} textAnchor="middle" fill="#3D4654" fontSize="9" fontFamily="system-ui">{l}</text>
      ))}
    </svg>
  );
}

function DonutChart({ value, total, color, label, size = 100 }: { value: number; total: number; color: string; label: string; size?: number }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const r = 38; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round" transform="rotate(-90 50 50)">
        <animate attributeName="stroke-dashoffset" from={circ} to={circ - pct * circ} dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.16 1 0.3 1" />
      </circle>
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="system-ui">{Math.round(pct * 100)}%</text>
      <text x="50" y="62" textAnchor="middle" fill="#5A6577" fontSize="9" fontFamily="system-ui">{label}</text>
    </svg>
  );
}

function Skeleton({ w = "100%", h = 20 }: { w?: string | number; h?: number }) {
  return <div className="animate-pulse rounded-lg bg-white/[0.03]" style={{ width: w, height: h }} />;
}

// Key Manager
function KeyManager({ userId, email }: { userId: string; email: string }) {
const [key, setKey] = useState(""); const [preview, setPreview] = useState(""); const [loading, setLoading] = useState(true); const [copied, setCopied] = useState(false); const [show, setShow] = useState(false); const [confirmR, setConfirmR] = useState(false); const [msg, setMsg] = useState("");
useEffect(() => { if (!userId) return; fetchWithAuth("/api/generate-key", { method: "POST", body: JSON.stringify({ action: "create" }) }).then(r => r.json()).then(d => { if (d.key) setKey(d.key); if (d.preview) setPreview(d.preview); }).catch(() => {}).finally(() => setLoading(false)); }, [userId, email]);
if (loading) return <div className="space-y-2"><Skeleton h={48} /><Skeleton w="60%" h={12} /></div>;
const display = key || preview;
if (!display) return <p className="text-[11px] text-[#5A6577]">No key yet. Use Rotate to issue one.</p>;
return (
<div>
<div className="flex gap-2">
<div className="flex-1 bg-[#0A0D12] border border-white/[0.06] rounded-xl px-4 py-3 font-mono text-[#5B8DEF] text-[13px] truncate">{key && show ? key : display}</div>
{key && <button onClick={() => setShow(!show)} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[11px] text-[#5A6577] transition-colors">{show ? "Hide" : "Show"}</button>}
{key && <button onClick={() => { navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[11px] text-[#5A6577] transition-colors">{copied ? "✓" : "Copy"}</button>}
</div>
<div className="flex justify-between mt-2">
<span className="text-[10px] text-[#3D4654]">{key ? "Copy it now — only a hash is stored, so it cannot be shown again" : "Only a hash of your key is stored. Rotate to issue a new one."}</span>
{!confirmR ? <button onClick={() => setConfirmR(true)} className="text-[10px] text-[#3D4654] hover:text-[#FF5F57] transition-colors">Rotate</button>
: <div className="flex gap-2"><button onClick={async () => { const r = await fetchWithAuth("/api/generate-key", { method: "POST", body: JSON.stringify({ action: "rotate" }) }).then(r => r.json()); if (r.key) { setKey(r.key); setPreview(r.preview || ""); setShow(true); setMsg("Rotated. Copy the new key now."); setTimeout(() => setMsg(""), 8000); } setConfirmR(false); }} className="text-[10px] text-[#FF5F57]">Confirm</button><button onClick={() => setConfirmR(false)} className="text-[10px] text-[#3D4654]">Cancel</button></div>}
</div>
{msg && <p className="text-[#E8B94B] text-[10px] mt-1">{msg}</p>}
</div>
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
  const [statsLoading, setStatsLoading] = useState(true);
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
  const [lastUpdated, setLastUpdated] = useState("");
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

  const fetchStats = async () => { try { const r = await (await fetchWithAuth("/api/stats")).json(); setStats(r); setLastUpdated(new Date().toLocaleTimeString()); setStatsLoading(false); } catch { setStatsLoading(false); } };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0D12] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-2xl flex items-center justify-center text-white font-bold shadow-xl shadow-[#5B8DEF]/30">TS</div>
      <div className="w-5 h-5 border-2 border-[#5B8DEF] border-t-transparent rounded-full animate-spin" />
      <p className="text-[12px] text-[#3D4654]">Loading dashboard...</p>
    </div>
  );

  const t = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0, errors: 0, total_cost: 0, total_saved: 0 };
  const days = stats?.days || [];
  const perf = stats?.performance || {};
  const cacheRate = t.total_requests > 0 ? Math.round((t.cache_hits / t.total_requests) * 100) : 0;
  const errorRate = t.total_requests > 0 ? Math.round(((t.errors || 0) / t.total_requests) * 100) : 0;
  const reqData = days.map((d: any) => d.total_requests);
  const savedData = days.map((d: any) => d.tokens_saved);
  const dayLabels = days.map((d: any) => d.label);
  const hasData = t.total_requests > 0;

  const filteredLogs = (stats?.recent_logs || []).filter((l: any) => {
    const s = !logSearch || JSON.stringify(l).toLowerCase().includes(logSearch.toLowerCase());
    const f = logFilter === "all" || (logFilter === "cached" && l.cache_hit) || (logFilter === "not_cached" && !l.cache_hit) || logFilter === l.provider;
    return s && f;
  });

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4]">
      <style jsx global>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .slide-down { animation: slideDown 0.3s ease; }
      `}</style>

      <nav className="sticky top-0 z-50 bg-[#0A0D12]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1400px] mx-auto">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20 group-hover:shadow-[#5B8DEF]/40 transition-shadow">TS</div>
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
          <div className="bg-[#FF5F57]/[0.03] border border-[#FF5F57]/10 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3 slide-down">
            <div className="w-2.5 h-2.5 bg-[#FF5F57] rounded-full animate-pulse" />
            <p className="text-[#FF5F57] text-[13px]"><span className="font-semibold">Budget alert:</span> {t.total_requests}/{budgetLimit} requests ({Math.round((t.total_requests / budgetLimit) * 100)}%)</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <FadeUp><div><p className="text-[#3D4654] text-[13px]">Welcome back</p><h1 className="text-[32px] font-bold tracking-tight font-display">Dashboard</h1></div></FadeUp>
          <FadeUp delay={0.1}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#4ADE80]/5 border border-[#4ADE80]/10 rounded-full px-3.5 py-1.5">
                <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse" />
                <span className="text-[#4ADE80] text-[11px] font-medium">Live</span>
              </div>
              {lastUpdated && <span className="text-[10px] text-[#3D4654]">Updated {lastUpdated}</span>}
              {perf.avg_latency_ms > 0 && <span className="text-[10px] text-[#3D4654] bg-white/[0.02] px-2.5 py-1 rounded-full">{perf.avg_latency_ms}ms avg</span>}
            </div>
          </FadeUp>
        </div>

        <div className="flex gap-1 mb-8 overflow-x-auto">
          {[{ id: "overview", l: "Overview", i: "📊" }, { id: "keys", l: "API Keys", i: "🔑" }, { id: "logs", l: "Logs", i: "📋" }, { id: "routing", l: "Routing", i: "🔀" }, { id: "settings", l: "Settings", i: "⚙️" }].map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-1.5 ${tab === tb.id ? "bg-[#5B8DEF]/10 text-[#5B8DEF] shadow-inner" : "text-[#5A6577] hover:text-white hover:bg-white/[0.02]"}`}>{tb.i} {tb.l}</button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            {!hasData && !statsLoading && (
              <FadeUp>
                <div className="bg-gradient-to-r from-[#5B8DEF]/5 via-[#A78BFA]/5 to-[#4ADE80]/5 border border-white/[0.06] rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5B8DEF]/10 to-[#A78BFA]/10 border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🚀</div>
                  <h2 className="text-[20px] font-bold font-display">Welcome to TokenSave!</h2>
                  <p className="text-[#5A6577] text-[14px] mt-2 max-w-[400px] mx-auto">Send your first request to see real-time analytics, cost savings, and optimization stats here.</p>
                  <div className="flex gap-3 justify-center mt-6">
                    <a href="/playground" className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">Open Playground</a>
                    <a href="/docs" className="px-5 py-2.5 border border-white/[0.08] text-[#7A8599] rounded-xl text-[13px] hover:bg-white/[0.03]">Read Docs</a>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    {PROVIDERS.map(p => <div key={p.id} className="flex items-center gap-1.5 opacity-40"><ProviderLogo provider={p.id} size={16} /><span className="text-[10px] text-[#3D4654]">{p.name}</span></div>)}
                  </div>
                </div>
              </FadeUp>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Requests", value: t.total_requests, suffix: "", color: "#5B8DEF", chart: reqData },
                { label: "Tokens Saved", value: t.tokens_saved, suffix: "", color: "#4ADE80", chart: savedData },
                { label: "Cost Saved", value: t.total_saved || t.tokens_saved * 0.000003 || 0, suffix: "", color: "#E8B94B", prefix: "$", decimals: 4, chart: null },
                { label: "Error Rate", value: errorRate, suffix: "%", color: errorRate > 5 ? "#FF5F57" : "#4ADE80", chart: null },
              ].map((s, i) => (
                <FadeUp key={i} delay={i * 0.05}>
                  <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all group">
                    <p className="text-[10px] text-[#5A6577] uppercase tracking-wider">{s.label}</p>
                    {statsLoading ? <Skeleton h={36} w="70%" /> : (
                      <p className="text-[28px] font-bold tracking-tight mt-1 font-display" style={{ color: s.color }}>
                        <CountUp end={typeof s.value === "number" ? s.value : 0} prefix={s.prefix || ""} suffix={s.suffix} decimals={s.decimals || 0} />
                      </p>
                    )}
                    <p className="text-[10px] text-[#3D4654] mt-0.5">7-day total</p>
                    {s.chart && <div className="mt-2 opacity-60 group-hover:opacity-100 transition-opacity"><AreaChart data={s.chart.length > 0 ? s.chart : [0,0,0,0,0,0,0]} color={s.color} height={40} /></div>}
                  </div>
                </FadeUp>
              ))}
              <FadeUp delay={0.2}>
                <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5 flex flex-col items-center justify-center hover:border-white/[0.12] transition-all">
                  {statsLoading ? <Skeleton h={90} w={90} /> : <DonutChart value={t.cache_hits || 0} total={t.total_requests || 1} color="#A78BFA" label="cache hit rate" />}
                </div>
              </FadeUp>
            </div>

            <FadeUp delay={0.15}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-[15px] font-semibold font-display">Request Volume</h2>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse" /><span className="text-[10px] text-[#3D4654]">Live · 15s</span></div>
                  </div>
                  {statsLoading ? <Skeleton h={160} /> : <AreaChart data={reqData.length > 0 ? reqData : [0,0,0,0,0,0,0]} labels={dayLabels} color="#5B8DEF" height={160} />}
                </div>
                <div className="lg:col-span-2 space-y-3">
                  <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5">
                    <p className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-3">Endpoint</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-[11px] text-[#5B8DEF] bg-[#0A0D12] rounded-xl px-3 py-2.5 truncate font-mono">{proxy}</code>
                      <button onClick={() => { navigator.clipboard.writeText(proxy); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[11px] text-[#5A6577] transition-colors">{copied ? "✓" : "Copy"}</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ l: "Playground", h: "/playground", d: "Test · Chat · Compare", i: "⚡" }, { l: "API Docs", h: "/docs", d: "8 languages", i: "📖" }].map(link => (
                      <a key={link.l} href={link.h} className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-4 hover:border-[#5B8DEF]/20 transition-all group">
                        <p className="text-lg mb-1">{link.i}</p>
                        <p className="text-[13px] font-semibold group-hover:text-[#5B8DEF] transition-colors">{link.l}</p>
                        <p className="text-[10px] text-[#3D4654]">{link.d}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <h2 className="text-[15px] font-semibold font-display mb-4">Supported Providers</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PROVIDERS.map((p, i) => (
                  <FadeUp key={p.id} delay={0.25 + i * 0.05}>
                    <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all group cursor-default">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: p.color + "10", boxShadow: `0 0 0 0 ${p.color}00`, transition: "box-shadow 0.3s, transform 0.3s" }} onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 20px ${p.color}20`)} onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 ${p.color}00`)}>
                        <ProviderLogo provider={p.id} size={24} />
                      </div>
                      <div><p className="text-[13px] font-semibold">{p.name}</p><p className="text-[10px] text-[#3D4654]">{p.models}</p></div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.3}>
              <h2 className="text-[15px] font-semibold font-display mb-4">Optimization Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { t: "Semantic Cache", d: "Same query = instant cached response, zero cost", m: "100% savings", c: "#4ADE80" },
                  { t: "Smart Routing", d: "Simple → cheap model, complex → smart model", m: "Up to 66%", c: "#5B8DEF" },
                  { t: "Compression", d: "Strip filler words while preserving meaning", m: "5-15% saved", c: "#E8B94B" },
                  { t: "Auto-Fallback", d: "Rate limited? Auto-switch to backup provider", m: "Zero downtime", c: "#F472B6" },
                  { t: "Quality Modes", d: "auto · max_savings · max_quality", m: "Full control", c: "#A78BFA" },
                  { t: "Context Summary", d: "Compress 50-message conversations by 88%", m: "Heavy users", c: "#FB923C" },
                ].map((f, i) => (
                  <FadeUp key={i} delay={0.35 + i * 0.05}>
                    <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all group">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full group-hover:scale-150 transition-transform duration-300" style={{ backgroundColor: f.c, boxShadow: `0 0 10px ${f.c}30` }} />
                        <h3 className="text-[13px] font-semibold">{f.t}</h3>
                      </div>
                      <p className="text-[11px] text-[#5A6577] leading-relaxed">{f.d}</p>
                      <p className="text-[11px] font-medium mt-2" style={{ color: f.c }}>{f.m}</p>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </FadeUp>
          </div>
        )}

        {tab === "keys" && (
          <div className="max-w-2xl space-y-6">
            <FadeUp><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">TokenSave API Key</h2>
              <p className="text-[12px] text-[#5A6577] mb-4">For usage tracking and higher rate limits.</p>
              <KeyManager userId={user?.id} email={user?.email} />
            </div></FadeUp>
            <FadeUp delay={0.1}><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Provider Keys</h2>
              <p className="text-[12px] text-[#5A6577] mb-5">Stored in your browser. Never sent to our servers.</p>
              <div className="space-y-3">
                {PROVIDERS.map(p => (
                  <div key={p.id}>
                    <label className="flex items-center gap-2 text-[12px] text-[#5A6577] mb-1.5"><ProviderLogo provider={p.id} size={16} />{p.name}</label>
                    <input type="password" placeholder={p.id === "anthropic" ? "sk-ant-..." : p.id === "openai" ? "sk-..." : p.id === "google" ? "AIza..." : "gsk_..."} value={(savedKeys as any)[p.id]} onChange={e => setSavedKeys({ ...savedKeys, [p.id]: e.target.value })} className="w-full px-4 py-3 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#3D4654] font-mono focus:outline-none focus:border-[#5B8DEF]/30 transition-colors" />
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_keys_" + user.id, JSON.stringify(savedKeys)); setKeyMsg("Saved!"); setTimeout(() => setKeyMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">{keyMsg || "Save Keys"}</button>
              </div>
            </div></FadeUp>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <FadeUp><div className="flex flex-col sm:flex-row gap-3">
              <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search logs..." className="flex-1 px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#3D4654] focus:outline-none focus:border-[#5B8DEF]/30" />
              <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4]"><option value="all">All</option><option value="cached">Cached</option><option value="not_cached">Not cached</option>{PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button onClick={fetchStats} className="px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[13px] text-[#5A6577] transition-colors">Refresh</button>
            </div></FadeUp>
            <FadeUp delay={0.1}><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl overflow-hidden">
              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto"><table className="w-full min-w-[650px]"><thead><tr className="text-[10px] text-[#5A6577] uppercase tracking-wider text-left border-b border-white/[0.04]"><th className="px-5 py-3">Time</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Model</th><th className="px-5 py-3">Cache</th><th className="px-5 py-3">Saved</th><th className="px-5 py-3">Complexity</th></tr></thead>
                <tbody>{filteredLogs.map((l: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors">
                    <td className="px-5 py-3 text-[11px] text-[#3D4654]">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-[13px] text-[#7A8599] capitalize">{l.provider || "—"}</td>
                    <td className="px-5 py-3"><span className="text-[11px] text-[#5A6577] bg-white/[0.03] px-2 py-0.5 rounded font-mono">{l.model || "cached"}</span></td>
                    <td className="px-5 py-3">{l.cache_hit ? <span className="text-[#4ADE80] text-[11px] font-medium bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">Hit</span> : <span className="text-[#3D4654] text-[11px]">Miss</span>}</td>
                    <td className="px-5 py-3 text-[#4ADE80] text-[13px] font-medium">+{l.tokens_saved || 0}</td>
                    <td className="px-5 py-3 text-[#5A6577] text-[11px] capitalize">{l.complexity || "—"}</td>
                  </tr>
                ))}</tbody></table></div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="text-[#5A6577] text-[14px] mb-2">{logSearch || logFilter !== "all" ? "No matching requests" : "No requests logged yet"}</p>
                  <a href="/playground" className="text-[#5B8DEF] text-[13px] hover:underline">Send your first request →</a>
                </div>
              )}
            </div></FadeUp>
          </div>
        )}

        {tab === "routing" && (
          <div className="max-w-2xl space-y-6">
            <FadeUp><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Model Routing Rules</h2>
              <p className="text-[12px] text-[#5A6577] mb-5">Choose which models handle simple vs complex tasks.</p>
              <div className="space-y-4">
                <div><label className="text-[12px] text-[#5A6577] block mb-1.5">Word count threshold</label><input type="number" value={routingRules.threshold} onChange={e => setRoutingRules({ ...routingRules, threshold: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none focus:border-[#5B8DEF]/30" /><p className="text-[10px] text-[#3D4654] mt-1">Below = simple · Above = complex</p></div>
                {[
                  { l: "Anthropic", s: "anthropic_simple", c: "anthropic_complex", m: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"], p: "anthropic" },
                  { l: "OpenAI", s: "openai_simple", c: "openai_complex", m: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"], p: "openai" },
                  { l: "Google", s: "google_simple", c: "google_complex", m: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"], p: "google" },
                  { l: "Groq", s: "groq_simple", c: "groq_complex", m: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"], p: "groq" },
                ].map(p => (
                  <div key={p.l} className="bg-[#0A0D12] border border-white/[0.04] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3"><ProviderLogo provider={p.p} size={18} /><p className="text-[13px] font-medium">{p.l}</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-[#3D4654] block mb-1">Simple</label><select value={(routingRules as any)[p.s]} onChange={e => setRoutingRules({ ...routingRules, [p.s]: e.target.value })} className="w-full px-3 py-2 bg-[#12161E] border border-white/[0.06] rounded-lg text-[#4ADE80] text-[11px] font-mono focus:outline-none">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                      <div><label className="text-[10px] text-[#3D4654] block mb-1">Complex</label><select value={(routingRules as any)[p.c]} onChange={e => setRoutingRules({ ...routingRules, [p.c]: e.target.value })} className="w-full px-3 py-2 bg-[#12161E] border border-white/[0.06] rounded-lg text-[#5B8DEF] text-[11px] font-mono focus:outline-none">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_routing_" + user.id, JSON.stringify(routingRules)); setRoutingMsg("Saved!"); setTimeout(() => setRoutingMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">{routingMsg || "Save Rules"}</button>
              </div>
            </div></FadeUp>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <FadeUp><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-4">Account</h2>
              {[{ l: "Email", v: user?.email }, { l: "User ID", v: user?.id?.slice(0, 18) + "...", m: true }, { l: "Plan", v: "Free Trial — 14 days", h: true }, { l: "Endpoint", v: proxy, m: true }].map((r, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-white/[0.03] last:border-0">
                  <span className="text-[#5A6577] text-[13px]">{r.l}</span>
                  <span className={`text-[13px] ${r.h ? "text-[#5B8DEF] font-medium" : r.m ? "font-mono text-[#5A6577] text-[11px]" : "text-[#E8ECF4]"}`}>{r.v}</span>
                </div>
              ))}
            </div></FadeUp>
            <FadeUp delay={0.1}><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Budget Alerts</h2>
              <p className="text-[12px] text-[#5A6577] mb-4">Warn when approaching daily limit.</p>
              <div className="space-y-3">
                <div><label className="text-[12px] text-[#5A6577] block mb-1.5">Daily limit</label><input type="number" value={budgetLimit} onChange={e => setBudgetLimit(Number(e.target.value))} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none focus:border-[#5B8DEF]/30" /></div>
                <div><label className="text-[12px] text-[#5A6577] block mb-1.5">Alert at</label><select value={budgetAlert} onChange={e => setBudgetAlert(Number(e.target.value))} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4]"><option value={50}>50%</option><option value={75}>75%</option><option value={80}>80%</option><option value={90}>90%</option></select></div>
                <button onClick={() => { if (user) { localStorage.setItem("ts_budget_" + user.id, JSON.stringify({ limit: budgetLimit, alertPercent: budgetAlert })); setBudgetMsg("Saved!"); setTimeout(() => setBudgetMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20">{budgetMsg || "Save Budget"}</button>
                {t.total_requests > 0 && budgetLimit > 0 && (
                  <div className="bg-[#0A0D12] rounded-xl p-4 mt-2">
                    <div className="flex justify-between text-[11px] mb-2"><span className="text-[#3D4654]">Usage</span><span className={t.total_requests >= budgetLimit * (budgetAlert / 100) ? "text-[#FF5F57]" : "text-[#5A6577]"}>{t.total_requests}/{budgetLimit}</span></div>
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${t.total_requests >= budgetLimit * (budgetAlert / 100) ? "bg-gradient-to-r from-[#FF5F57] to-[#FF8A65]" : "bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA]"}`} style={{ width: `${Math.min((t.total_requests / budgetLimit) * 100, 100)}%` }} /></div>
                  </div>
                )}
              </div>
            </div></FadeUp>
            <FadeUp delay={0.2}><div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-2">Support</h2>
              <p className="text-[12px] text-[#5A6577] mb-3">Need help with integration?</p>
              <a href="mailto:prathamg200404@gmail.com" className="text-[#5B8DEF] text-[13px] hover:underline">prathamg200404@gmail.com</a>
            </div></FadeUp>
          </div>
        )}
      </div>
    </div>
  );
}
