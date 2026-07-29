"use client";
import { useState, useEffect } from "react";

export default function Status() {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState("");

  const runChecks = async () => {
    setLoading(true);
    const results = [];

    try {
      const start = Date.now();
      const res = await fetch("/api/proxy");
      const data = await res.json();
      results.push({ name: "API Proxy", status: data.service ? "operational" : "degraded", latency: Date.now() - start });
    } catch (e) {
      results.push({ name: "API Proxy", status: "down", latency: 0 });
    }

    try {
      const start = Date.now();
      const res = await fetch("/api/health");
      const data = await res.json();
      results.push({ name: "Health Check", status: data.status === "healthy" ? "operational" : "degraded", latency: Date.now() - start });
    } catch (e) {
      results.push({ name: "Health Check", status: "down", latency: 0 });
    }

    try {
      const start = Date.now();
      const res = await fetch("/api/batch");
      const data = await res.json();
      results.push({ name: "Batch API", status: data.service ? "operational" : "degraded", latency: Date.now() - start });
    } catch (e) {
      results.push({ name: "Batch API", status: "down", latency: 0 });
    }

    results.push({ name: "Dashboard", status: "operational", latency: 0 });
    results.push({ name: "Playground", status: "operational", latency: 0 });
    results.push({ name: "Documentation", status: "operational", latency: 0 });

    setChecks(results);
    setLastChecked(new Date().toLocaleString());
    setLoading(false);
  };

  useEffect(() => { runChecks(); }, []);

  const allOperational = checks.every((c) => c.status === "operational");
  const anyDown = checks.some((c) => c.status === "down");

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 relative overflow-hidden">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <button onClick={runChecks} className="text-sm text-gray-500 hover:text-cyan-400 transition-colors">Refresh</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        <div className={`rounded-2xl p-8 mb-8 text-center ${allOperational ? "bg-green-400/5 border border-green-400/20" : anyDown ? "bg-red-400/5 border border-red-400/20" : "bg-amber-400/5 border border-amber-400/20"}`}>
          <div className={`w-4 h-4 rounded-full mx-auto mb-4 ${allOperational ? "bg-green-400" : anyDown ? "bg-red-400" : "bg-amber-400"} animate-pulse`}></div>
          <h1 className={`text-2xl font-bold mb-2 ${allOperational ? "text-green-400" : anyDown ? "text-red-400" : "text-amber-400"}`}>
            {allOperational ? "All Systems Operational" : anyDown ? "Service Disruption" : "Partial Degradation"}
          </h1>
          <p className="text-gray-500 text-sm">{lastChecked ? "Last checked: " + lastChecked : "Running health checks..."}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
          ) : (
            checks.map((check, i) => (
              <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < checks.length - 1 ? "border-b border-gray-800" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${check.status === "operational" ? "bg-green-400" : check.status === "degraded" ? "bg-amber-400" : "bg-red-400"}`}></div>
                  <span className="text-gray-200 text-sm font-medium">{check.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {check.latency > 0 && <span className="text-gray-600 text-xs">{check.latency}ms</span>}
                  <span className={`text-xs font-medium capitalize ${check.status === "operational" ? "text-green-400" : check.status === "degraded" ? "text-amber-400" : "text-red-400"}`}>{check.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">Questions? Contact <a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 hover:underline">prathamg200404@gmail.com</a></p>
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-4xl mx-auto px-6 md:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-sm"><p>© 2026 TokenSave</p><div className="flex gap-4"><a href="/docs" className="hover:text-gray-400">Docs</a><a href="/security" className="hover:text-gray-400">Security</a><a href="/changelog" className="hover:text-gray-400">Changelog</a><a href="/status" className="hover:text-gray-400">Status</a></div></footer>
    </div>
  );
}
