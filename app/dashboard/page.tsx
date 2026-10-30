"use client";
import { useState, useEffect, useRef, useId, useCallback, ReactNode } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { StatsResponse, Provider } from "../types";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";
import { ProviderLogo } from "../icons";

async function accountFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sign in required.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Bearer " + data.session.access_token);
  return fetch(path, {...options, headers});
}

// Keep operational numbers stable; motion is decorative only.
function FadeUp({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={"dash-enter " + className} style={{ animationDelay: Math.min(delay, .15) + "s" }}>{children}</div>;
}
function CountUp({ end, prefix = "", suffix = "", decimals = 0 }: { end: number; prefix?: string; suffix?: string; decimals?: number }) {
  return <span>{prefix}{end.toLocaleString("en-US", {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}{suffix}</span>;
}

// Charts
function AreaChart({ data, labels, color, height = 120 }: { data: number[]; labels?: string[]; color: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const chartId = useId();
  const values = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...values, 1);
  const w = 300; const pad = 30;
  const pts = values.map((v, i) => ({ x: pad + (i / (Math.max(values.length - 1, 1))) * (w - pad * 2), y: 10 + (height - 30) - (v / max) * (height - 40) }));
  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${pad},${height - 20} ${line} ${w - pad},${height - 20}`;

  return (
    <svg role="img" aria-label={"Daily values: " + values.map((v, i) => (labels?.[i] || "Day " + (i + 1)) + ": " + v).join(", ")} viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = 10 + (height - 30) - pct * (height - 40);
        return <g key={i}><line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.03)" /><text x={pad - 5} y={y + 3} textAnchor="end" fill="#94a2b9" fontSize="8" fontFamily="system-ui">{Math.round(max * pct)}</text></g>;
      })}
      <polygon points={area} fill={`url(#${chartId})`}>
      </polygon>
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      </polyline>
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "default" }}>
          <rect x={p.x - 15} y={0} width={30} height={height} fill="transparent" />
          {hover === i && <>
            <line x1={p.x} y1={10} x2={p.x} y2={height - 20} stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="3,3" />
            <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="#0A0D12" strokeWidth="2" />
            <rect x={p.x - 25} y={p.y - 28} width={50} height={20} rx={5} fill="#1a1f2e" stroke={color} strokeWidth="0.5" />
            <text x={p.x} y={p.y - 15} textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">{values[i]}</text>
          </>}
        </g>
      ))}
      {labels && labels.map((l, i) => (
        <text key={i} x={pts[i]?.x || 0} y={height - 5} textAnchor="middle" fill="#94a2b9" fontSize="9" fontFamily="system-ui">{l}</text>
      ))}
    </svg>
  );
}

function DonutChart({ value, total, color, label, size = 100 }: { value: number; total: number; color: string; label: string; size?: number }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const r = 38; const circ = 2 * Math.PI * r;
  return (
    <svg role="img" aria-label={label + ": " + Math.round(pct * 100) + "%"} width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round" transform="rotate(-90 50 50)">
      </circle>
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="system-ui">{Math.round(pct * 100)}%</text>
      <text x="50" y="62" textAnchor="middle" fill="#a9b5c8" fontSize="9" fontFamily="system-ui">{label}</text>
    </svg>
  );
}

function Skeleton({ w = "100%", h = 20 }: { w?: string | number; h?: number }) {
  return <div className="animate-pulse rounded-lg bg-white/[0.03]" style={{ width: w, height: h }} />;
}

// Key Manager
function KeyManager({ userId, email }: { userId: string; email: string }) {
  const [key, setKey] = useState(""); const [copied, setCopied] = useState(false); const [show, setShow] = useState(false); const [confirmR, setConfirmR] = useState(false); const [msg, setMsg] = useState("");
  useEffect(() => { if (userId) accountFetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email }) }).then(r => r.json()).then(d => { if (d.key) setKey(d.key); }).catch(() => {}); }, [userId, email]);
  if (!key) return <div className="space-y-2"><Skeleton h={48} /><Skeleton w="60%" h={12} /></div>;
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1 bg-[#0A0D12] border border-white/[0.10] rounded-xl px-4 py-3 font-mono text-[#bba6ed] text-[13px] truncate">{show ? key : key.slice(0, 12) + "•".repeat(16) + key.slice(-4)}</div>
        <button onClick={() => setShow(!show)} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[12px] text-[#a9b5c8] transition-colors">{show ? "Hide" : "Show"}</button>
        <button onClick={() => { navigator.clipboard.writeText(key).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);}).catch(()=>setMsg("Copy failed. Use Show and copy the key manually.")); }} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[12px] text-[#a9b5c8] transition-colors">{copied ? "✓" : "Copy"}</button>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[12px] text-[#94a2b9]">Include as <code className="text-[#a9b5c8]">tsKey</code> in requests</span>
        {!confirmR ? <button onClick={() => setConfirmR(true)} className="text-[12px] text-[#94a2b9] hover:text-[#FF5F57] transition-colors">Rotate</button>
        : <div className="flex gap-2"><button onClick={async () => { const r = await accountFetch("/api/generate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email, action: "rotate" }) }).then(r => r.json()); if (r.key) { setKey(r.key); setMsg("Rotated!"); setTimeout(() => setMsg(""), 3000); } setConfirmR(false); }} className="text-[12px] text-[#FF5F57]">Confirm</button><button onClick={() => setConfirmR(false)} className="text-[12px] text-[#94a2b9]">Cancel</button></div>}
      </div>
      {msg && <p className="text-[#E8B94B] text-[12px] mt-1">{msg}</p>}
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("overview");
  const [savedKeys, setSavedKeys] = useState({ anthropic: "", openai: "", google: "", groq: "" });
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  const [budgetLimit, setBudgetLimit] = useState(1000);
  const [budgetAlert, setBudgetAlert] = useState(80);
  const [budgetMsg, setBudgetMsg] = useState("");
  const [routingRules, setRoutingRules] = useState({ anthropic_simple: "claude-haiku-4-5-20251001", anthropic_complex: "claude-sonnet-4-6", openai_simple: "gpt-4o-mini", openai_complex: "gpt-4o", google_simple: "gemini-2.0-flash-lite", google_complex: "gemini-2.0-flash", groq_simple: "llama-3.1-8b-instant", groq_complex: "llama-3.3-70b-versatile", threshold: 100 });
  const [routingMsg, setRoutingMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [statsError, setStatsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const statsBusy = useRef(false);
  const router = useRouter();
  const proxy = "https://tokensave.in/api/proxy";

  const fetchStats = useCallback(async () => {
    if (statsBusy.current) return;
    statsBusy.current = true; setRefreshing(true);
    try {
      const response = await accountFetch("/api/stats");
      if (!response.ok) throw new Error("Stats unavailable");
      const result = await response.json();
      if (!result.totals || !Array.isArray(result.days)) throw new Error("Invalid statistics");
      setStats(result); setStatsError(""); setLastUpdated(new Date().toLocaleTimeString());
    } catch { setStatsError("Unable to refresh statistics. Previously loaded data may be out of date."); }
    finally { setStatsLoading(false); setRefreshing(false); statsBusy.current = false; }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        void fetchStats();
        try { for (const key of Object.keys(localStorage)) if (key.startsWith("ts_keys_")) localStorage.removeItem(key); } catch {}
        try { const b = localStorage.getItem("ts_budget_" + data.user.id); if (b) { const p = JSON.parse(b); setBudgetLimit(p.limit || 1000); setBudgetAlert(p.alertPercent || 80); } } catch {}
        try { const r = localStorage.getItem("ts_routing_" + data.user.id); if (r) setRoutingRules(JSON.parse(r)); } catch {}
      } else router.push("/login");
      setLoading(false);
    }).catch(()=>{router.replace("/login");});
    const i = setInterval(fetchStats, 15000);
    return () => clearInterval(i);
  }, [router, fetchStats]);



  if (loading) return (
    <div className="min-h-screen bg-[#0A0D12] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-gradient-to-br from-[#bba6ed] to-[#A78BFA] rounded-2xl flex items-center justify-center text-white font-bold shadow-xl shadow-[#bba6ed]/30">TS</div>
      <div className="w-5 h-5 border-2 border-[#bba6ed] border-t-transparent rounded-full animate-spin" />
      <p className="text-[12px] text-[#94a2b9]">Loading dashboard...</p>
    </div>
  );

  const t = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0, errors: 0, total_cost: 0, total_saved: 0, unknown_cost_requests: 0 };
  const days = stats?.days || [];
  const todayRequests = days.length ? days[days.length - 1].total_requests : 0;
  const errorRate = t.total_requests > 0 ? Math.round(((t.errors || 0) / t.total_requests) * 100) : 0;
  const reqData = days.map((d) => d.total_requests);
  const savedData = days.map((d) => d.tokens_saved);
  const dayLabels = days.map((d) => d.label);
  const hasData = t.total_requests > 0;

  const filteredLogs = (stats?.recent_logs || []).filter((l) => {
    const s = !logSearch || JSON.stringify(l).toLowerCase().includes(logSearch.toLowerCase());
    const f = logFilter === "all" || (logFilter === "cached" && l.cache_hit) || (logFilter === "not_cached" && !l.cache_hit) || logFilter === l.provider;
    return s && f;
  });

  return (
    <div className="dash-shell min-h-screen bg-[#090d15] text-[#E8ECF4]">
      <style jsx global>{`
        .dash-shell {font-size:14px;line-height:1.6;color-scheme:dark;--dash-line:#263041}
        .dash-shell * {box-sizing:border-box}
        .dash-shell button,.dash-shell a,.dash-shell input,.dash-shell select {transition:background .18s,border-color .18s,color .18s}
        .dash-shell button {cursor:pointer;min-height:40px}
        .dash-shell button:disabled {opacity:.55;cursor:wait}
        .dash-shell :is(a,button,input,select):focus-visible {outline:2px solid #bbaaef;outline-offset:4px}
        .dash-shell input,.dash-shell select {min-width:0;min-height:44px}
        .dash-shell input::placeholder {color:#8895ab}
        .dash-sidebar {position:fixed;inset:0 auto 0 0;width:216px;padding:28px 18px;background:#0e131d;border-right:1px solid var(--dash-line);display:flex;flex-direction:column;z-index:30}
        .dash-brand {display:flex;align-items:center;gap:10px;color:#f4f5fa;font-size:21px;font-weight:700;letter-spacing:-.7px;padding:0 8px 30px}
        .dash-logo {width:33px;height:33px;background:linear-gradient(135deg,#a5dccb,#bba6ed);border-radius:10px;color:#202238;display:grid;place-items:center}
        .dash-eyebrow {font-size:11px;letter-spacing:1.8px;color:#9eaac0;text-transform:uppercase;font-weight:600}
        .dash-sidebar nav {display:grid;gap:5px;margin-top:15px}
        .dash-sidebar nav button {display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:9px;text-align:left;color:#a9b5c8;font-size:14px;border:1px solid transparent;white-space:nowrap}
        .dash-sidebar nav button:hover {background:#192131;color:#fff}
        .dash-sidebar nav button[aria-pressed=true] {background:#bba6ed15;border-color:#bba6ed32;color:#d4c4ff}
        .dash-nav-icon {width:20px;text-align:center;font-size:19px}
        .dash-side-bottom {margin-top:auto;display:grid;gap:13px;padding:24px 12px 0;color:#a9b5c8;font-size:13px}
        .dash-side-bottom a:hover {color:#d4c4ff}
        .dash-main {margin-left:216px;min-width:0}
        .dash-topbar {height:73px;border-bottom:1px solid var(--dash-line);padding:0 34px;display:flex;align-items:center;justify-content:space-between;gap:18px;color:#a9b5c8;font-size:13px;background:#0c111b}
        .dash-account {display:flex;align-items:center;gap:16px;min-width:0}
        .dash-account span {overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}
        .dash-content {max-width:1480px;margin:auto;padding:34px}
        .dash-heading {display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}
        .dash-heading h1 {font-size:32px;line-height:1.2;font-weight:650;letter-spacing:-1px;margin:8px 0}
        .dash-heading p {color:#a9b5c8;font-size:14px}
        .dash-actions {display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .dash-primary,.dash-secondary {display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:9px;padding:10px 16px;font-size:13px;font-weight:600;white-space:nowrap}
        .dash-primary {background:#c1adff;color:#211a36;border:1px solid #c1adff}
        .dash-primary:hover {background:#d2c2ff}
        .dash-secondary {background:#151c29;color:#d2daea;border:1px solid #303b4d}
        .dash-secondary:hover {background:#212b3b}
        .dash-scope {display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 0 20px;color:#9faec4;font-size:12px}
        .dash-scope strong {color:#d7dfee;font-weight:500}
        .dash-notice {padding:14px 18px;border:1px solid #eab66a50;background:#eab66a0a;color:#f0cd9b;border-radius:12px;margin-bottom:20px;font-size:13px}
        .dash-setup {display:grid;grid-template-columns:1.15fr 1fr;gap:24px;padding:26px;border:1px solid #bda5ff33;border-radius:16px;background:linear-gradient(110deg,#1c2036,#101c24);margin-bottom:24px}
        .dash-setup h2 {font-size:21px;font-weight:600;letter-spacing:-.4px;margin:7px 0}
        .dash-setup p {color:#aab7cc;font-size:13px;max-width:440px;margin-bottom:16px}
        .dash-steps {display:grid;gap:10px;align-content:center}
        .dash-step {display:flex;gap:12px;align-items:center;padding:9px 12px;border:1px solid #ffffff0b;border-radius:9px;background:#ffffff03;color:#d8e0ee;font-size:13px}
        .dash-step b {border:1px solid #bcadff40;color:#c5b5f5;border-radius:50%;width:25px;height:25px;text-align:center;font-size:11px;line-height:23px}
        .dash-enter {animation:dash-enter .3s ease both}
        .dash-shell .grid>div {min-width:0}
        .dash-shell .metric-grid>div>.rounded-2xl {height:100%}
        .dash-shell .max-w-2xl {max-width:850px}
        .dash-shell .font-display {font-family:inherit}
        .dash-shell .metric-grid .uppercase {min-height:38px}
        .dash-shell .metric-grid .font-display {margin-top:6px}
        .dash-shell table th {font-weight:500}
        .dash-shell table td {white-space:nowrap}
        .dash-shell code {overflow-wrap:anywhere}
        .dash-shell .account-row {gap:20px;flex-wrap:wrap}
        .dash-footer {margin-top:32px;padding-top:20px;border-top:1px solid var(--dash-line);display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;color:#94a2b9;font-size:12px}
        @keyframes dash-enter {from{opacity:.5;transform:translateY(5px)}to{opacity:1;transform:none}}
        @media(min-width:1200px){.dash-shell .metric-grid{gap:16px}}
        @media(max-width:1050px){.dash-sidebar{width:180px;padding:25px 12px}.dash-main{margin-left:180px}.dash-content{padding:26px}.dash-heading{align-items:flex-start;flex-direction:column}.dash-setup{grid-template-columns:1fr}.dash-steps{grid-template-columns:repeat(3,1fr)}.dash-step{align-items:flex-start;flex-direction:column}}
        @media(max-width:700px){.dash-sidebar{position:relative;width:100%;padding:18px 16px 10px;border-right:0;border-bottom:1px solid var(--dash-line)}.dash-brand{padding:0 0 14px;font-size:20px}.dash-sidebar>.dash-eyebrow,.dash-side-bottom{display:none}.dash-sidebar nav{display:flex;overflow-x:auto;gap:4px;margin:0}.dash-sidebar nav button{padding:9px 11px;font-size:13px;flex-shrink:0}.dash-nav-icon{display:none}.dash-main{margin-left:0}.dash-topbar{height:56px;padding:0 18px}.dash-topbar>span{display:none}.dash-account{justify-content:space-between;width:100%}.dash-content{padding:24px 16px}.dash-heading h1{font-size:28px}.dash-setup{padding:20px}.dash-steps{grid-template-columns:1fr}.dash-step{flex-direction:row;align-items:center}.dash-shell .metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-shell .metric-grid>div:last-child{grid-column:1/-1}.dash-shell .metric-grid .p-5{padding:18px}.dash-shell .p-6{padding:20px}.dash-shell .routing-grid{grid-template-columns:1fr}.dash-shell input,.dash-shell select{font-size:16px}.dash-shell .provider-grid{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){.dash-shell *{animation:none!important;transition:none!important}}
      `}</style>
      <a href="#dashboard-content" className="sr-only focus:not-sr-only">Skip to dashboard</a>
      <aside className="dash-sidebar">
        <Link className="dash-brand" href="/" aria-label="TokenSave home"><span className="dash-logo" aria-hidden="true">≋</span>TokenSave.</Link>
        <span className="dash-eyebrow" style={{paddingLeft:14}}>Workspace</span>
        <nav aria-label="Dashboard sections">
          {[{id:"overview",l:"Overview",i:"◫"},{id:"keys",l:"API keys",i:"⌘"},{id:"logs",l:"Request logs",i:"≡"},{id:"routing",l:"Routing",i:"⇄"},{id:"settings",l:"Settings",i:"⚙"}].map(item=><button key={item.id} aria-pressed={tab===item.id} aria-controls="dashboard-content" onClick={()=>setTab(item.id)}><span className="dash-nav-icon" aria-hidden="true">{item.i}</span>{item.l}</button>)}
        </nav>
        <div className="dash-side-bottom"><span className="dash-eyebrow">Build with TokenSave</span><a href="/playground">Playground ↗</a><a href="/docs">Documentation ↗</a><a href="/security">Security &amp; data handling</a></div>
      </aside>
      <div className="dash-main">
      <header className="dash-topbar"><span>Workspace <span style={{margin:"0 10px",color:"#526078"}}>/</span> Dashboard</span><div className="dash-account"><span>{user?.email}</span><button onClick={async()=>{setSavedKeys({anthropic:"",openai:"",google:"",groq:""});await supabase.auth.signOut();router.push("/login");}}>Log out ↗</button></div></header>
      <main id="dashboard-content" className="dash-content">
        <div className="dash-heading"><div><span className="dash-eyebrow">AI operations</span><h1>{({overview:"Workspace overview",keys:"API keys",logs:"Request logs",routing:"Model routing",settings:"Workspace settings"} as Record<string, string>)[tab]}</h1><p>{({overview:"Understand traffic. Inspect savings. Make your next request count.",keys:"Manage your integration credentials in one place.",logs:"Inspect the latest requests recorded by the service.",routing:"Review model preferences for simple and complex prompts.",settings:"Your account and local workspace preferences."} as Record<string, string>)[tab]}</p></div><div className="dash-actions"><button className="dash-secondary" disabled={refreshing} onClick={fetchStats}>{refreshing?"Refreshing…":"↻ Refresh data"}</button><a className="dash-primary" href="/playground">Open playground ↗</a></div></div>
        {statsError && <div className="dash-notice" role="alert">{statsError} <button onClick={fetchStats} disabled={refreshing}>Try again</button></div>}
        <div className="dash-scope"><span><strong>Your account activity</strong> · {tab === "logs" ? "Latest 50 recorded requests" : "Last 7 days"} · Verified account only</span><span>{lastUpdated?"Updated "+lastUpdated:"Waiting for statistics"} · Refreshes every 15s</span></div>
        {budgetLimit>0 && todayRequests>=budgetLimit*(budgetAlert/100) && <div className="dash-notice">Daily request reminder: {todayRequests.toLocaleString()} / {budgetLimit.toLocaleString()} account requests. This is a local reminder, not a spending cap.</div>}
        {tab === "overview" && (
          <div className="space-y-6">
            <section className="dash-setup" aria-label="Integration quick start"><div><span className="dash-eyebrow">Build your first integration</span><h2>From API key to first request.</h2><p>Connect a provider, try a prompt and inspect the response. The charts below show requests attributed to your verified account.</p><div className="dash-actions"><button className="dash-primary" onClick={()=>setTab("keys")}>Manage API keys →</button><a className="dash-secondary" href="/docs">Integration guide</a></div></div><div className="dash-steps"><div className="dash-step"><b>01</b>Choose your provider and API key</div><div className="dash-step"><b>02</b>Send a request in the playground</div><div className="dash-step"><b>03</b>Inspect routing and token estimates</div></div></section>
            <p className="text-[12px] text-[#a9b5c8] mb-3">Published-rate USD estimates for known costs only. {t.unknown_cost_requests || 0} requests have unavailable cost. Savings cover cache repeats; routing savings are unmeasured. Older estimates are excluded.</p>
            <div className="metric-grid grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Requests", value: t.total_requests, suffix: "", color: "#bba6ed", chart: reqData },
                { label: "Cache tokens avoided", value: t.tokens_saved, suffix: "", color: "#4ADE80", chart: savedData },
                { label: "Est. cache cost avoided", value: t.total_saved || 0, suffix: "", color: "#E8B94B", prefix: "$", decimals: 2, chart: null },
                { label: "Error Rate", value: errorRate, suffix: "%", color: errorRate > 5 ? "#FF5F57" : "#4ADE80", chart: null },
              ].map((s, i) => (
                <FadeUp key={i} delay={i * 0.05}>
                  <div className="bg-[#121a27] backdrop-blur border border-white/[0.10] rounded-2xl p-5 hover:border-white/[0.12] transition-all group">
                    <p className="text-[12px] text-[#a9b5c8] uppercase tracking-wider">{s.label}</p>
                    {statsLoading ? <Skeleton h={36} w="70%" /> : (
                      <p className="text-[28px] font-bold tracking-tight mt-1 font-display" style={{ color: s.color }}>
                        <CountUp end={typeof s.value === "number" ? s.value : 0} prefix={s.prefix || ""} suffix={s.suffix} decimals={s.decimals || 0} />
                      </p>
                    )}
                    <p className="text-[12px] text-[#94a2b9] mt-0.5">{s.suffix === "%" ? "Share of requests · 7 days" : "Across the service · 7 days"}</p>
                    
                  </div>
                </FadeUp>
              ))}
              <FadeUp delay={0.2}>
                <div className="bg-[#121a27] backdrop-blur border border-white/[0.10] rounded-2xl p-5 flex flex-col items-center justify-center hover:border-white/[0.12] transition-all">
                  {statsLoading ? <Skeleton h={90} w={90} /> : <DonutChart value={t.cache_hits || 0} total={t.total_requests || 1} color="#A78BFA" label="cache hit rate" />}
                </div>
              </FadeUp>
            </div>

            <FadeUp delay={0.15}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-[#121a27] backdrop-blur border border-white/[0.10] rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-[15px] font-semibold font-display">Request Volume</h2>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse" /><span className="text-[12px] text-[#94a2b9]">Last 7 days</span></div>
                  </div>
                  {statsLoading ? <Skeleton h={200} /> : !hasData ? <div className="py-12 text-center text-[#a9b5c8]"><p>No service activity recorded yet</p><p className="text-[12px] mt-2">Requests will appear here after they are recorded.</p></div> : <AreaChart data={reqData.length > 0 ? reqData : [0,0,0,0,0,0,0]} labels={dayLabels} color="#bba6ed" height={200} />}
                </div>
                <div className="lg:col-span-2 space-y-3">
                  <div className="bg-[#121a27] backdrop-blur border border-white/[0.10] rounded-2xl p-5">
                    <p className="text-[12px] text-[#a9b5c8] uppercase tracking-wider mb-3">Endpoint</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-[12px] text-[#bba6ed] bg-[#0A0D12] rounded-xl px-3 py-2.5 truncate font-mono">{proxy}</code>
                      <button onClick={() => { navigator.clipboard.writeText(proxy); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[12px] text-[#a9b5c8] transition-colors">{copied ? "✓" : "Copy"}</button>
                    </div>
                  </div>
                  <div className="routing-grid grid grid-cols-2 gap-3">
                    {[{ l: "Playground", h: "/playground", d: "Test · Chat · Compare", i: "⌁" }, { l: "API Docs", h: "/docs", d: "Integration examples", i: "↗" }].map(link => (
                      <a key={link.l} href={link.h} className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-4 hover:border-[#bba6ed]/20 transition-all group">
                        <p className="text-lg mb-1">{link.i}</p>
                        <p className="text-[13px] font-semibold group-hover:text-[#bba6ed] transition-colors">{link.l}</p>
                        <p className="text-[12px] text-[#94a2b9]">{link.d}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <h2 className="text-[15px] font-semibold font-display mb-4">Supported Providers</h2>
              <div className="provider-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PROVIDERS.map((p, i) => (
                  <FadeUp key={p.id} delay={0.25 + i * 0.05}>
                    <div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all group cursor-default">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: p.color + "10", boxShadow: `0 0 0 0 ${p.color}00`, transition: "box-shadow 0.3s, transform 0.3s" }} onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 20px ${p.color}20`)} onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 ${p.color}00`)}>
                        <ProviderLogo provider={p.id} size={24} />
                      </div>
                      <div><p className="text-[13px] font-semibold">{p.name}</p><p className="text-[12px] text-[#94a2b9]">{p.models}</p></div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </FadeUp>

            <div className="dash-notice" style={{borderColor:"#2b3548",background:"#121925",color:"#aebbd0"}}>Savings are estimates, not invoice reconciliations. Compare representative prompts and output quality before changing production routing. <a href="/docs" style={{color:"#ccbbff"}}>Read the integration guide ↗</a></div>

          </div>
        )}

        {tab === "keys" && (
          <div className="max-w-2xl space-y-6">
            <FadeUp><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">TokenSave API Key</h2>
              <p className="text-[12px] text-[#a9b5c8] mb-4">Your TokenSave credential for requests that accept a tsKey. Keep it private.</p>
              <KeyManager userId={user?.id || ""} email={user?.email || ""} />
            </div></FadeUp>
            <FadeUp delay={0.1}><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Provider Keys</h2>
              <p className="text-[12px] text-[#a9b5c8] mb-5">Provider keys stay in memory for this page only and are cleared on reload. Proxy requests pass through TokenSave to your provider. Previously saved provider keys are removed from browser storage.</p>
              <div className="space-y-3">
                {PROVIDERS.map(p => (
                  <div key={p.id}>
                    <label className="flex items-center gap-2 text-[12px] text-[#a9b5c8] mb-1.5"><ProviderLogo provider={p.id} size={16} />{p.name}</label>
                    <input aria-label={p.name + " API key"} autoComplete="off" type="password" placeholder={p.id === "anthropic" ? "sk-ant-..." : p.id === "openai" ? "sk-..." : p.id === "google" ? "AIza..." : "gsk_..."} value={savedKeys[p.id as Provider]} onChange={e => setSavedKeys({ ...savedKeys, [p.id]: e.target.value })} className="w-full px-4 py-3 bg-[#0A0D12] border border-white/[0.10] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#94a2b9] font-mono focus:outline-none focus:border-[#bba6ed]/30 transition-colors" />
                  </div>
                ))}
                <button onClick={() => { setSavedKeys({anthropic:"",openai:"",google:"",groq:""}); }} className="px-5 py-2.5 bg-gradient-to-r from-[#bba6ed] to-[#A78BFA] text-[#211a36] rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#bba6ed]/20">Clear provider keys</button>
              </div>
            </div></FadeUp>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <FadeUp><div className="flex flex-col sm:flex-row gap-3">
              <input aria-label="Search request logs" value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search logs..." className="flex-1 px-4 py-2.5 bg-[#0A0D12] border border-white/[0.10] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#94a2b9] focus:outline-none focus:border-[#bba6ed]/30" />
              <select aria-label="Filter request logs" value={logFilter} onChange={e => setLogFilter(e.target.value)} className="px-4 py-2.5 bg-[#0A0D12] border border-white/[0.10] rounded-xl text-[13px] text-[#E8ECF4]"><option value="all">All</option><option value="cached">Cached</option><option value="not_cached">Not cached</option>{PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button onClick={fetchStats} className="px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-[13px] text-[#a9b5c8] transition-colors">Refresh</button>
            </div></FadeUp>
            <FadeUp delay={0.1}><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl overflow-hidden">
              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto"><table className="w-full min-w-[650px]"><thead><tr className="text-[12px] text-[#a9b5c8] uppercase tracking-wider text-left border-b border-white/[0.04]"><th className="px-5 py-3">Time</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Model</th><th className="px-5 py-3">Cache</th><th className="px-5 py-3">Saved</th><th className="px-5 py-3">Complexity</th></tr></thead>
                <tbody>{filteredLogs.map((l, i: number) => (
                  <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors">
                    <td className="px-5 py-3 text-[12px] text-[#94a2b9]">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-[13px] text-[#7A8599] capitalize">{l.provider || "—"}</td>
                    <td className="px-5 py-3"><span className="text-[12px] text-[#a9b5c8] bg-white/[0.03] px-2 py-0.5 rounded font-mono">{l.model || "cached"}</span></td>
                    <td className="px-5 py-3">{l.cache_hit ? <span className="text-[#4ADE80] text-[12px] font-medium bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">Hit</span> : <span className="text-[#94a2b9] text-[12px]">Miss</span>}</td>
                    <td className="px-5 py-3 text-[#4ADE80] text-[13px] font-medium">+{l.tokens_saved || 0}</td>
                    <td className="px-5 py-3 text-[#a9b5c8] text-[12px] capitalize">{l.complexity || "—"}</td>
                  </tr>
                ))}</tbody></table></div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-2xl mb-2">≡</p>
                  <p className="text-[#a9b5c8] text-[14px] mb-2">{logSearch || logFilter !== "all" ? "No matching requests" : "No requests logged yet"}</p>
                  {logSearch || logFilter !== "all" ? <button onClick={() => { setLogSearch(""); setLogFilter("all"); }} className="text-[#bba6ed] text-[13px]">Clear filters</button> : <a href="/playground" className="text-[#bba6ed] text-[13px] hover:underline">Send your first request →</a>}
                </div>
              )}
            </div></FadeUp>
          </div>
        )}

        {tab === "routing" && (
          <div className="max-w-2xl space-y-6">
            <FadeUp><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Model Routing Rules</h2>
              <p className="text-[12px] text-[#a9b5c8] mb-5">These preferences are saved in this browser only. Saving here does not change server routing; pass supported routing options in your integration.</p>
              <div className="space-y-4">
                <div><label className="text-[12px] text-[#a9b5c8] block mb-1.5">Word count threshold</label><input aria-label="Word count threshold" min={1} type="number" value={routingRules.threshold} onChange={e => setRoutingRules({ ...routingRules, threshold: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.10] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none focus:border-[#bba6ed]/30" /><p className="text-[12px] text-[#94a2b9] mt-1">Below = simple · Above = complex</p></div>
                {[
                  { l: "Anthropic", s: "anthropic_simple", c: "anthropic_complex", m: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"], p: "anthropic" },
                  { l: "OpenAI", s: "openai_simple", c: "openai_complex", m: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"], p: "openai" },
                  { l: "Google", s: "google_simple", c: "google_complex", m: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"], p: "google" },
                  { l: "Groq", s: "groq_simple", c: "groq_complex", m: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"], p: "groq" },
                ].map(p => (
                  <div key={p.l} className="bg-[#0A0D12] border border-white/[0.04] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3"><ProviderLogo provider={p.p} size={18} /><p className="text-[13px] font-medium">{p.l}</p></div>
                    <div className="routing-grid grid grid-cols-2 gap-3">
                      <div><label className="text-[12px] text-[#94a2b9] block mb-1">Simple</label><select aria-label={p.l + " simple model"} value={routingRules[p.s as keyof typeof routingRules]} onChange={e => setRoutingRules({ ...routingRules, [p.s]: e.target.value })} className="w-full px-3 py-2 bg-[#12161E] border border-white/[0.10] rounded-lg text-[#4ADE80] text-[12px] font-mono focus:outline-none">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                      <div><label className="text-[12px] text-[#94a2b9] block mb-1">Complex</label><select aria-label={p.l + " complex model"} value={routingRules[p.c as keyof typeof routingRules]} onChange={e => setRoutingRules({ ...routingRules, [p.c]: e.target.value })} className="w-full px-3 py-2 bg-[#12161E] border border-white/[0.10] rounded-lg text-[#bba6ed] text-[12px] font-mono focus:outline-none">{p.m.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { if (user) { localStorage.setItem("ts_routing_" + user.id, JSON.stringify(routingRules)); setRoutingMsg("Saved!"); setTimeout(() => setRoutingMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#bba6ed] to-[#A78BFA] text-[#211a36] rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#bba6ed]/20">{routingMsg || "Save local preferences"}</button>
              </div>
            </div></FadeUp>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <FadeUp><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-4">Account</h2>
              {[{ l: "Email", v: user?.email }, { l: "User ID", v: user?.id?.slice(0, 18) + "...", m: true }, { l: "Plan", v: "Contact support for plan details", h: true }, { l: "Endpoint", v: proxy, m: true }].map((r, i) => (
                <div key={i} className="account-row flex justify-between py-3 border-b border-white/[0.03] last:border-0">
                  <span className="text-[#a9b5c8] text-[13px]">{r.l}</span>
                  <span className={`text-[13px] ${r.h ? "text-[#bba6ed] font-medium" : r.m ? "font-mono text-[#a9b5c8] text-[12px]" : "text-[#E8ECF4]"}`}>{r.v}</span>
                </div>
              ))}
            </div></FadeUp>
            <FadeUp delay={0.1}><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-1">Daily request reminder</h2>
              <p className="text-[12px] text-[#a9b5c8] mb-4">A local reminder based on today’s account request count. It does not enforce limits or send email alerts.</p>
              <div className="space-y-3">
                <div><label className="text-[12px] text-[#a9b5c8] block mb-1.5">Daily requests threshold</label><input aria-label="Daily request reminder threshold" min={1} type="number" value={budgetLimit} onChange={e => setBudgetLimit(Number(e.target.value))} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.10] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none focus:border-[#bba6ed]/30" /></div>
                <div><label className="text-[12px] text-[#a9b5c8] block mb-1.5">Alert at</label><select aria-label="Reminder percentage" value={budgetAlert} onChange={e => setBudgetAlert(Number(e.target.value))} className="w-full px-4 py-2.5 bg-[#0A0D12] border border-white/[0.10] rounded-xl text-[13px] text-[#E8ECF4]"><option value={50}>50%</option><option value={75}>75%</option><option value={80}>80%</option><option value={90}>90%</option></select></div>
                <button onClick={() => { if (user) { localStorage.setItem("ts_budget_" + user.id, JSON.stringify({ limit: budgetLimit, alertPercent: budgetAlert })); setBudgetMsg("Saved!"); setTimeout(() => setBudgetMsg(""), 1500); } }} className="px-5 py-2.5 bg-gradient-to-r from-[#bba6ed] to-[#A78BFA] text-[#211a36] rounded-xl text-[13px] font-semibold hover:opacity-90 shadow-lg shadow-[#bba6ed]/20">{budgetMsg || "Save reminder"}</button>
                {t.total_requests > 0 && budgetLimit > 0 && (
                  <div className="bg-[#0A0D12] rounded-xl p-4 mt-2">
                    <div className="flex justify-between text-[12px] mb-2"><span className="text-[#94a2b9]">Usage</span><span className={todayRequests >= budgetLimit * (budgetAlert / 100) ? "text-[#FF5F57]" : "text-[#a9b5c8]"}>{todayRequests}/{budgetLimit}</span></div>
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${todayRequests >= budgetLimit * (budgetAlert / 100) ? "bg-gradient-to-r from-[#FF5F57] to-[#FF8A65]" : "bg-gradient-to-r from-[#bba6ed] to-[#A78BFA]"}`} style={{ width: `${Math.min((todayRequests / budgetLimit) * 100, 100)}%` }} /></div>
                  </div>
                )}
              </div>
            </div></FadeUp>
            <FadeUp delay={0.2}><div className="bg-[#121a27] border border-white/[0.10] rounded-2xl p-6">
              <h2 className="text-[15px] font-semibold font-display mb-2">Support</h2>
              <p className="text-[12px] text-[#a9b5c8] mb-3">Need help with integration?</p>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support%40tokensave.in" className="text-[#bba6ed] text-[13px] hover:underline">support@tokensave.in</a>
            </div></FadeUp>
          </div>
        )}
      <footer className="dash-footer"><span>TokenSave · Your AI operations workspace</span><div className="flex gap-5"><a href="/docs">Documentation</a><a href="/security">Security &amp; data handling</a></div></footer>
      </main>
      </div>
    </div>
  );
}
