"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

function TokenSaveKeyManager({ userId, email }: { userId: string; email: string }) {
  const [tsKey, setTsKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [rotateMessage, setRotateMessage] = useState("");

  useEffect(() => {
    if (userId) {
      fetch("/api/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      })
        .then((r) => r.json())
        .then((data) => { if (data.key) setTsKey(data.key); })
        .catch(() => {});
    }
  }, [userId, email]);

  const copyKey = () => {
    navigator.clipboard.writeText(tsKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rotateKey = async () => {
    setRotateLoading(true);
    try {
      const res = await fetch("/api/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, action: "rotate" }),
      });
      const data = await res.json();
      if (data.key) {
        setTsKey(data.key);
        setRotateMessage("Key rotated. Update your integrations with the new key.");
        setTimeout(() => setRotateMessage(""), 5000);
      }
    } catch (e) {
      setRotateMessage("Failed to rotate. Try again.");
    }
    setRotateLoading(false);
    setRotateConfirm(false);
  };

  if (!tsKey) return <p className="text-gray-500 text-sm">Generating your key...</p>;

  const maskedKey = tsKey.slice(0, 12) + "•".repeat(20) + tsKey.slice(-4);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 font-mono text-cyan-400 text-sm truncate">
          {showKey ? tsKey : maskedKey}
        </div>
        <button onClick={() => setShowKey(!showKey)} className="px-3 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">{showKey ? "Hide" : "Show"}</button>
        <button onClick={copyKey} className="px-3 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">{copied ? "Copied!" : "Copy"}</button>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-gray-600 text-xs">Include as &quot;tsKey&quot; in API requests for usage tracking.</p>
        {!rotateConfirm ? (
          <button onClick={() => setRotateConfirm(true)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Rotate key</button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-xs">Are you sure?</span>
            <button onClick={rotateKey} disabled={rotateLoading} className="text-xs text-red-400 hover:underline">{rotateLoading ? "Rotating..." : "Yes, rotate"}</button>
            <button onClick={() => setRotateConfirm(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        )}
      </div>
      {rotateMessage && (
        <div className="mt-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
          <p className="text-amber-400 text-sm">{rotateMessage}</p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [savedKeys, setSavedKeys] = useState({ anthropic: "", openai: "", google: "", groq: "" });
  const [keyMessage, setKeyMessage] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  const [budgetLimit, setBudgetLimit] = useState(1000);
  const [budgetAlertPercent, setBudgetAlertPercent] = useState(80);
  const [budgetMessage, setBudgetMessage] = useState("");
  const [routingRules, setRoutingRules] = useState({
    anthropic_simple: "claude-haiku-4-5-20251001",
    anthropic_complex: "claude-sonnet-4-6",
    openai_simple: "gpt-4o-mini",
    openai_complex: "gpt-4o",
    google_simple: "gemini-2.0-flash-lite",
    google_complex: "gemini-2.0-flash",
    groq_simple: "llama-3.1-8b-instant",
    groq_complex: "llama-3.3-70b-versatile",
    complexity_threshold: 100,
  });
  const [routingMessage, setRoutingMessage] = useState("");
  const router = useRouter();
  const proxyUrl = "https://tokensave.vercel.app/api/proxy";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        const stored = localStorage.getItem("ts_keys_" + data.user.id);
        if (stored) setSavedKeys(JSON.parse(stored));
        const budgetStored = localStorage.getItem("ts_budget_" + data.user.id);
        if (budgetStored) {
          const b = JSON.parse(budgetStored);
          setBudgetLimit(b.limit || 1000);
          setBudgetAlertPercent(b.alertPercent || 80);
        }
        const routingStored = localStorage.getItem("ts_routing_" + data.user.id);
        if (routingStored) setRoutingRules(JSON.parse(routingStored));
      } else {
        router.push("/login");
      }
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

  const saveKeys = () => {
    if (user) {
      localStorage.setItem("ts_keys_" + user.id, JSON.stringify(savedKeys));
      setKeyMessage("Keys saved locally.");
      setTimeout(() => setKeyMessage(""), 3000);
    }
  };

  const saveBudgetSettings = () => {
    if (user) {
      localStorage.setItem("ts_budget_" + user.id, JSON.stringify({ limit: budgetLimit, alertPercent: budgetAlertPercent }));
      setBudgetMessage("Budget settings saved!");
      setTimeout(() => setBudgetMessage(""), 3000);
    }
  };

  const saveRoutingRules = () => {
    if (user) {
      localStorage.setItem("ts_routing_" + user.id, JSON.stringify(routingRules));
      setRoutingMessage("Routing rules saved!");
      setTimeout(() => setRoutingMessage(""), 3000);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center text-gray-950 font-bold">TS</div><div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;

  const totals = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0 };
  const days = stats?.days || [];
  const cacheRate = totals.total_requests > 0 ? Math.round((totals.cache_hits / totals.total_requests) * 100) : 0;
  const maxReqs = Math.max(...days.map((d: any) => d.total_requests), 1);

  const filteredLogs = (stats?.recent_logs || []).filter((log: any) => {
    const matchesSearch = !logSearch || JSON.stringify(log).toLowerCase().includes(logSearch.toLowerCase());
    const matchesFilter = logFilter === "all" || (logFilter === "cached" && log.cache_hit) || (logFilter === "not_cached" && !log.cache_hit) || (logFilter === log.provider);
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "keys", label: "API Keys" },
    { id: "logs", label: "Request Logs" },
    { id: "routing", label: "Routing Rules" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm hidden md:block">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-400 transition-colors">Log out</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Monitor your API usage and savings</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">System active</span>
          </div>
        </div>

        {budgetLimit > 0 && totals.total_requests >= budgetLimit * (budgetAlertPercent / 100) && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-red-400 text-xl">⚠</span>
            <div>
              <p className="text-red-400 text-sm font-medium">Budget alert: {Math.round((totals.total_requests / budgetLimit) * 100)}% of daily limit used</p>
              <p className="text-gray-400 text-xs">{totals.total_requests} of {budgetLimit} requests used today. Manage in Settings.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Requests (7d)</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-100">{totals.total_requests}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Tokens saved</p>
            <p className="text-2xl md:text-3xl font-bold text-green-400">{totals.tokens_saved.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Cache hit rate</p>
            <p className="text-2xl md:text-3xl font-bold text-cyan-400">{cacheRate}%</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Est. saved</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-400">${(totals.tokens_saved * 0.000003).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.id ? "text-cyan-400 border-cyan-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Requests — Last 7 days</h2>
                <span className="text-xs text-gray-500">Updates every 15s</span>
              </div>
              <div className="flex items-end gap-2 h-40">
                {days.map((day: any, i: number) => {
                  const height = maxReqs > 0 ? Math.max((day.total_requests / maxReqs) * 100, 4) : 4;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-400">{day.total_requests > 0 ? day.total_requests : ""}</span>
                      <div className="w-full flex items-end" style={{ height: "120px" }}>
                        <div className={`w-full rounded-t-md transition-all duration-500 ${day.total_requests > 0 ? "bg-cyan-400" : "bg-gray-800"}`} style={{ height: `${height}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4">Your proxy endpoint</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 font-mono text-cyan-400 text-sm truncate">{proxyUrl}</div>
                <button onClick={copyUrl} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap">{copied ? "Copied!" : "Copy URL"}</button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4">Quick start</h2>
              <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-400 overflow-x-auto">{`curl -X POST ${proxyUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "anthropic",
    "apiKey": "your-key",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}</pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/playground" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400/50 transition-colors group">
                <div className="w-9 h-9 bg-cyan-400/10 rounded-lg flex items-center justify-center text-cyan-400 font-bold text-sm mb-3">P</div>
                <h3 className="font-semibold mb-1 group-hover:text-cyan-400 transition-colors">Playground</h3>
                <p className="text-gray-500 text-sm">Test with chat, compare, and single prompt modes</p>
              </a>
              <a href="/docs" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-green-400/50 transition-colors group">
                <div className="w-9 h-9 bg-green-400/10 rounded-lg flex items-center justify-center text-green-400 font-bold text-sm mb-3">D</div>
                <h3 className="font-semibold mb-1 group-hover:text-green-400 transition-colors">Documentation</h3>
                <p className="text-gray-500 text-sm">API reference with 8 language examples</p>
              </a>
              <a href="/status" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-amber-400/50 transition-colors group">
                <div className="w-9 h-9 bg-amber-400/10 rounded-lg flex items-center justify-center text-amber-400 font-bold text-sm mb-3">S</div>
                <h3 className="font-semibold mb-1 group-hover:text-amber-400 transition-colors">System Status</h3>
                <p className="text-gray-500 text-sm">Live health checks on all services</p>
              </a>
            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-1">Your TokenSave API Key</h2>
              <p className="text-gray-500 text-sm mb-4">Use this key to track usage and get higher rate limits.</p>
              <TokenSaveKeyManager userId={user?.id} email={user?.email} />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-1">Provider API Keys</h2>
              <p className="text-gray-500 text-sm mb-6">Save your AI provider keys locally. They are stored on your browser only and never sent to our servers.</p>
              <div className="space-y-4">
                {[
                  { key: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
                  { key: "openai", label: "OpenAI (GPT)", placeholder: "sk-..." },
                  { key: "google", label: "Google (Gemini)", placeholder: "AIza..." },
                  { key: "groq", label: "Groq (Llama)", placeholder: "gsk_..." },
                ].map((p) => (
                  <div key={p.key}>
                    <label className="block text-sm text-gray-400 mb-1.5">{p.label}</label>
                    <input type="password" placeholder={p.placeholder} value={(savedKeys as any)[p.key]} onChange={(e) => setSavedKeys({ ...savedKeys, [p.key]: e.target.value })} className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm font-mono" />
                  </div>
                ))}
                <button onClick={saveKeys} className="px-6 py-2.5 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">Save Keys</button>
                {keyMessage && <p className="text-green-400 text-sm">{keyMessage}</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Search by provider, model..." className="flex-1 px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400" />
                <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400">
                  <option value="all">All requests</option>
                  <option value="cached">Cached only</option>
                  <option value="not_cached">Not cached</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                  <option value="groq">Groq</option>
                </select>
                <button onClick={fetchStats} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">Refresh</button>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Request history</h2>
                <span className="text-xs text-gray-500">{filteredLogs.length} results</span>
              </div>
              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                        <th className="pb-3 pr-4">Time</th>
                        <th className="pb-3 pr-4">Provider</th>
                        <th className="pb-3 pr-4">Model</th>
                        <th className="pb-3 pr-4">Cached</th>
                        <th className="pb-3 pr-4">Tokens saved</th>
                        <th className="pb-3 pr-4">Complexity</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log: any, i: number) => (
                        <tr key={i} className="border-b border-gray-800/50 text-sm">
                          <td className="py-3 pr-4 text-gray-500 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}</td>
                          <td className="py-3 pr-4 text-gray-300 capitalize">{log.provider || "—"}</td>
                          <td className="py-3 pr-4"><span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-300 font-mono">{log.model || "cached"}</span></td>
                          <td className="py-3 pr-4">{log.cache_hit ? <span className="text-green-400 text-xs font-medium bg-green-400/10 px-2 py-0.5 rounded">Hit</span> : <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded">Miss</span>}</td>
                          <td className="py-3 pr-4 text-green-400 text-sm font-medium">+{log.tokens_saved || 0}</td>
                          <td className="py-3 pr-4 text-gray-400 text-sm capitalize">{log.complexity || "—"}</td>
                          <td className="py-3"><a href="/playground" target="_blank" className="text-xs text-cyan-400 hover:underline">Replay</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-3xl mb-3">{"{ }"}</p>
                  <p className="text-gray-500 text-sm mb-4">{logSearch || logFilter !== "all" ? "No matching requests" : "No requests yet"}</p>
                  <a href="/playground" className="text-cyan-400 text-sm hover:underline">Send your first request</a>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "routing" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-1">Model Routing Rules</h2>
              <p className="text-gray-500 text-sm mb-6">Customize which models handle simple vs complex tasks.</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Complexity threshold (word count)</label>
                  <input type="number" value={routingRules.complexity_threshold} onChange={(e) => setRoutingRules({ ...routingRules, complexity_threshold: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400" />
                  <p className="text-gray-600 text-xs mt-1">Prompts below this word count are &quot;simple&quot;. Above are &quot;complex&quot;.</p>
                </div>
                {[
                  { provider: "Anthropic (Claude)", simple: "anthropic_simple", complex: "anthropic_complex", models: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"] },
                  { provider: "OpenAI (GPT)", simple: "openai_simple", complex: "openai_complex", models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
                  { provider: "Google (Gemini)", simple: "google_simple", complex: "google_complex", models: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"] },
                  { provider: "Groq (Llama)", simple: "groq_simple", complex: "groq_complex", models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
                ].map((p) => (
                  <div key={p.provider} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-300 mb-3">{p.provider}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Simple tasks</label>
                        <select value={(routingRules as any)[p.simple]} onChange={(e) => setRoutingRules({ ...routingRules, [p.simple]: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-green-400 text-sm font-mono focus:outline-none focus:border-cyan-400">
                          {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Complex tasks</label>
                        <select value={(routingRules as any)[p.complex]} onChange={(e) => setRoutingRules({ ...routingRules, [p.complex]: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-cyan-400 text-sm font-mono focus:outline-none focus:border-cyan-400">
                          {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={saveRoutingRules} className="px-6 py-2.5 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">Save Routing Rules</button>
                {routingMessage && <p className="text-green-400 text-sm">{routingMessage}</p>}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-3">How routing works</h2>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-3"><span className="text-cyan-400 font-mono shrink-0">1.</span><p>Every request is analyzed for complexity based on word count and keywords.</p></div>
                <div className="flex items-start gap-3"><span className="text-cyan-400 font-mono shrink-0">2.</span><p>Simple prompts (below {routingRules.complexity_threshold} words) route to cheaper models.</p></div>
                <div className="flex items-start gap-3"><span className="text-cyan-400 font-mono shrink-0">3.</span><p>Complex prompts route to more capable models for better results.</p></div>
                <div className="flex items-start gap-3"><span className="text-cyan-400 font-mono shrink-0">4.</span><p>You can override routing by specifying a model in your API request.</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4">Account</h2>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Email</span>
                  <span className="text-gray-200 text-sm">{user?.email}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">User ID</span>
                  <span className="text-gray-200 text-sm font-mono">{user?.id?.slice(0, 16)}...</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Plan</span>
                  <span className="text-cyan-400 text-sm font-semibold">Free Trial — 14 days</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3">
                  <span className="text-gray-400 text-sm">Proxy endpoint</span>
                  <span className="text-cyan-400 text-sm font-mono">{proxyUrl}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-1">Budget alerts</h2>
              <p className="text-gray-500 text-sm mb-4">Set daily request limits. Alerts show on the dashboard when you approach your limit.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Daily request limit</label>
                  <input type="number" value={budgetLimit} onChange={(e) => setBudgetLimit(Number(e.target.value))} placeholder="e.g. 1000" className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Alert at (% of limit)</label>
                  <select value={budgetAlertPercent} onChange={(e) => setBudgetAlertPercent(Number(e.target.value))} className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400">
                    <option value={50}>50%</option>
                    <option value={75}>75%</option>
                    <option value={80}>80%</option>
                    <option value={90}>90%</option>
                  </select>
                </div>
                <button onClick={saveBudgetSettings} className="px-6 py-2.5 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">Save Budget Settings</button>
                {budgetMessage && <p className="text-green-400 text-sm">{budgetMessage}</p>}
                {totals.total_requests > 0 && budgetLimit > 0 && (
                  <div className="mt-4 p-4 bg-gray-950 border border-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Today&apos;s usage</span>
                      <span className={`text-sm font-semibold ${(totals.total_requests / budgetLimit) * 100 >= budgetAlertPercent ? "text-red-400" : "text-green-400"}`}>{totals.total_requests} / {budgetLimit}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${(totals.total_requests / budgetLimit) * 100 >= budgetAlertPercent ? "bg-red-400" : (totals.total_requests / budgetLimit) * 100 >= 50 ? "bg-amber-400" : "bg-green-400"}`} style={{ width: `${Math.min((totals.total_requests / budgetLimit) * 100, 100)}%` }}></div>
                    </div>
                    {(totals.total_requests / budgetLimit) * 100 >= budgetAlertPercent && (
                      <p className="text-red-400 text-xs mt-2">⚠ {Math.round((totals.total_requests / budgetLimit) * 100)}% of daily limit reached!</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4">Support</h2>
              <p className="text-gray-500 text-sm mb-4">Need help integrating TokenSave?</p>
              <a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 text-sm hover:underline">prathamg200404@gmail.com</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}