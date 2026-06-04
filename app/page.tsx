"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); } else { router.push("/login"); }
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;

  const stats = [
    { label: "Total Requests", value: "0", change: "New", color: "text-cyan-400" },
    { label: "Tokens Saved", value: "0", change: "New", color: "text-green-400" },
    { label: "Money Saved", value: "$0", change: "New", color: "text-emerald-400" },
    { label: "Cache Hit Rate", value: "0%", change: "New", color: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="fixed left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-cyan-400">TokenSave</span>
        </div>
        <nav className="flex flex-col gap-1">
          {["overview", "api-keys", "router", "analytics", "settings"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={"text-left px-3 py-2 rounded-lg text-sm capitalize transition-colors " + (activeTab === tab ? "bg-cyan-400/10 text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800")}>
              {tab === "overview" ? "📊 " : tab === "api-keys" ? "🔑 " : tab === "router" ? "🔀 " : tab === "analytics" ? "📈 " : "⚙️ "}{tab}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-auto px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg text-left">🚪 Log Out</button>
      </div>
      <div className="ml-56 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
          <span className="text-xs bg-green-400/10 text-green-400 px-3 py-1 rounded-full">● System Active</span>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
              <p className={"text-2xl font-bold " + stat.color}>{stat.value}</p>
              <p className="text-green-400 text-xs mt-1">{stat.change}</p>
            </div>
          ))}
        </div>
        {activeTab === "api-keys" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Your API Endpoint</h2>
            <p className="text-gray-400 text-sm mb-4">Replace your AI provider URL with this TokenSave URL:</p>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-cyan-400 text-sm">https://your-app.vercel.app/api/proxy</div>
          </div>
        )}
        {activeTab === "overview" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p>1. Go to <button onClick={() => setActiveTab("api-keys")} className="text-cyan-400 underline">API Keys</button> to get your proxy endpoint</p>
              <p>2. Replace your AI API URL with the TokenSave proxy URL</p>
              <p>3. All requests will be automatically optimized</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
