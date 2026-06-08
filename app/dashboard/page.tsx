"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [savedKeys, setSavedKeys] = useState({ anthropic: "", openai: "", google: "" });
  const [keyMessage, setKeyMessage] = useState("");
  const router = useRouter();
  const proxyUrl = "https://tokensave.vercel.app/api/proxy";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        const stored = localStorage.getItem("ts_keys_" + data.user.id);
        if (stored) setSavedKeys(JSON.parse(stored));
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
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(proxyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveKeys = () => {
    if (user) {
      localStorage.setItem("ts_keys_" + user.id, JSON.stringify(savedKeys));
      setKeyMessage("Keys saved locally on this device.");
      setTimeout(() => setKeyMessage(""), 3000);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">Loading...</div>;

  const totals = stats?.totals || { total_requests: 0, tokens_saved: 0, cache_hits: 0 };
  const days = stats?.days || [];
  const cacheRate = totals.total_requests > 0 ? Math.round((totals.cache_hits / totals.total_requests) * 100) : 0;
  const maxReqs = Math.max(...days.map((d) => d.total_requests), 1);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "keys", label: "API Keys" },
    { id: "logs", label: "Request Logs" },
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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-cyan-400 border-cyan-400"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
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
                {days.map((day, i) => {
                  const height = maxReqs > 0 ? Math.max((day.total_requests / maxReqs) * 100, 4) : 4;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-400">{day.total_requests > 0 ? day.total_requests : ""}</span>
                      <div className="w-full flex items-end" style={{ height: "120px" }}>
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            day.total_requests > 0 ? "bg-cyan-400" : "bg-gray-800"
                          }`}
                          style={{ height: `${height}%` }}
                        ></div>
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
                <button onClick={copyUrl} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap">
                  {copied ? "Copied!" : "Copy URL"}
                </button>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="/playground" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400/50 transition-colors group">
                <div className="w-9 h-9 bg-cyan-400/10 rounded-lg flex items-center justify-center text-cyan-400 font-bold text-sm mb-3">P</div>
                <h3 className="font-semibold mb-1 group-hover:text-cyan-400 transition-colors">Playground</h3>
                <p className="text-gray-500 text-sm">Test the proxy with your API key interactively</p>
              </a>
              <a href="/docs" className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400/50 transition-colors group">
                <div className="w-9 h-9 bg-green-400/10 rounded-lg flex items-center justify-center text-green-400 font-bold text-sm mb-3">D</div>
                <h3 className="font-semibold mb-1 group-hover:text-green-400 transition-colors">Documentation</h3>
                <p className="text-gray-500 text-sm">API reference and integration guide</p>
              </a>
            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-1">API Key Management</h2>
              <p className="text-gray-500 text-sm mb-6">Save your AI provider keys here. They are stored locally on your browser and never sent to our servers.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Anthropic (Claude) API Key</label>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={savedKeys.anthropic}
                    onChange={(e) => setSavedKeys({ ...savedKeys, anthropic: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">OpenAI (GPT) API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={savedKeys.openai}
                    onChange={(e) => setSavedKeys({ ...savedKeys, openai: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Google (Gemini) API Key</label>
                  <input
                    type="password"
                    placeholder="AIza..."
                    value={savedKeys.google}
                    onChange={(e) => setSavedKeys({ ...savedKeys, google: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm font-mono"
                  />
                </div>
                <button
                  onClick={saveKeys}
                  className="px-6 py-2.5 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors"
                >
                  Save Keys
                </button>
                {keyMessage && <p className="text-green-400 text-sm">{keyMessage}</p>}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-base font-semibold mb-1">How keys are used</h2>
              <p className="text-gray-500 text-sm mb-4">Your API keys are passed directly to the AI provider with each request. TokenSave never stores or logs your keys on our servers.</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs font-bold mt-0.5 shrink-0">1</div>
                  <p className="text-gray-400 text-sm">You send a request with your API key to our proxy</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs font-bold mt-0.5 shrink-0">2</div>
                  <p className="text-gray-400 text-sm">We optimize the request (cache, route, compress)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs font-bold mt-0.5 shrink-0">3</div>
                  <p className="text-gray-400 text-sm">Your key is forwarded to the provider and immediately discarded</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent requests</h2>
              <button onClick={fetchStats} className="text-xs text-cyan-400 hover:underline">Refresh</button>
            </div>
            {stats?.recent_logs?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                      <th className="pb-3 pr-4">Provider</th>
                      <th className="pb-3 pr-4">Model</th>
                      <th className="pb-3 pr-4">Cached</th>
                      <th className="pb-3 pr-4">Tokens saved</th>
                      <th className="pb-3">Complexity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_logs.map((log, i) => (
                      <tr key={i} className="border-b border-gray-800/50 text-sm">
                        <td className="py-3 pr-4 text-gray-300 capitalize">{log.provider || "—"}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-300 font-mono">{log.model || "cached"}</span>
                        </td>
                        <td className="py-3 pr-4">
                          {log.cache_hit ? (
                            <span className="text-green-400 text-xs font-medium bg-green-400/10 px-2 py-0.5 rounded">Hit</span>
                          ) : (
                            <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded">Miss</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-green-400 text-sm font-medium">+{log.tokens_saved || 0}</td>
                        <td className="py-3 text-gray-400 text-sm capitalize">{log.complexity || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-3xl mb-3">{"{ }"}</p>
                <p className="text-gray-500 text-sm mb-4">No requests logged yet</p>
                <a href="/playground" className="text-cyan-400 text-sm hover:underline">Send your first request in the Playground</a>
              </div>
            )}
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
              <h2 className="text-base font-semibold mb-4">Support</h2>
              <p className="text-gray-500 text-sm mb-4">Need help integrating TokenSave? Reach out to us.</p>
              <a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 text-sm hover:underline">prathamg200404@gmail.com</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}