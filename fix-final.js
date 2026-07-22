const fs = require('fs');

// Fix changelog
const changelog = `"use client";

const updates = [
  { date: "July 2026", version: "3.1.0", title: "Security & Production Hardening", changes: ["Rate limiting with standard headers (60 req/min)", "Input validation and sanitization on all endpoints", "Security headers middleware (HSTS, CSP, XSS)", "Health check endpoint (/api/health)", "Audit logging with hashed IPs", "Error boundary for graceful crash handling", "Sentry error monitoring integration", "BetterUptime monitoring (3 monitors)"] },
  { date: "July 2026", version: "3.0.0", title: "Production-Grade Analytics", changes: ["Real per-token cost tracking on every request", "Latency monitoring with avg and P95 metrics", "Error rate tracking and reporting", "Per-user analytics and usage tracking", "Custom tags on requests for filtering", "Webhook notifications for events", "Team management with roles", "API key rotation with confirmation", "Quality modes: auto, max_savings, max_quality", "Multi-provider automatic fallback on rate limits"] },
  { date: "July 2026", version: "2.0.0", title: "Smart Optimization Engine", changes: ["Smart context summarization with 88% compression", "Improved complexity detection with code awareness", "Safe prompt compression preserving meaning", "Custom model routing rules in dashboard", "Request history with search and filters", "Budget alerts with progress bar", "API reference in 8 programming languages"] },
  { date: "July 2026", version: "1.3.0", title: "Batch Processing & Context Manager", changes: ["Batch API for up to 50 prompts per request", "Context window manager auto-trimming", "Budget alerts with progress bar", "Request history with search and filtering", "TokenSave API key generation per user"] },
  { date: "July 2026", version: "1.2.0", title: "Advanced Playground", changes: ["Chat Mode with multi-turn optimization", "Compare Providers side-by-side", "Cost calculator showing exact savings", "Prompt templates for common tasks", "File upload for TXT, CSV, JSON", "Response export (copy/download)", "Groq (Llama) free provider added"] },
  { date: "June 2026", version: "1.1.0", title: "Security & Trust", changes: ["Zero-knowledge SDK for local optimization", "Security and trust page", "Rate limiting at 60 req/min", "API docs with cURL, JS, Python examples", "Demo Mode in playground"] },
  { date: "June 2026", version: "1.0.0", title: "Initial Launch", changes: ["Semantic caching for 100% savings on repeats", "Intelligent model routing", "Prompt compression", "Support for Anthropic, OpenAI, Google, Groq", "Real-time dashboard with 7-day chart", "GitHub OAuth and email authentication"] },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4]">
      <nav className="border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-10 py-4 max-w-[800px] mx-auto">
          <a href="/" className="flex items-center gap-2.5"><div className="w-7 h-7 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-md flex items-center justify-center text-white font-bold text-[10px]">TS</div><span className="text-[16px] font-semibold tracking-tight">TokenSave</span></a>
          <div className="flex gap-5"><a href="/docs" className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Docs</a><a href="/dashboard" className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Dashboard</a></div>
        </div>
      </nav>
      <div className="max-w-[800px] mx-auto px-6 lg:px-10 py-12">
        <h1 className="text-[32px] font-bold tracking-tight font-display">Changelog</h1>
        <p className="text-[#5A6577] text-[15px] mt-2 mb-12">What&apos;s new in TokenSave. We ship updates frequently.</p>
        <div className="space-y-10">
          {updates.map((u, i) => (
            <div key={i} className="relative pl-8 border-l-2 border-white/[0.06]">
              <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-[#0A0D12]" style={{ backgroundColor: i === 0 ? "#5B8DEF" : i === 1 ? "#A78BFA" : i === 2 ? "#4ADE80" : "#3D4654" }} />
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[#5A6577] text-[13px]">{u.date}</span>
                <span className="px-2 py-0.5 bg-[#5B8DEF]/10 border border-[#5B8DEF]/15 rounded text-[#5B8DEF] text-[11px] font-mono">{u.version}</span>
                {i === 0 && <span className="px-2 py-0.5 bg-[#4ADE80]/10 text-[#4ADE80] text-[10px] rounded-full font-medium">Latest</span>}
              </div>
              <h2 className="text-[20px] font-semibold font-display mb-4">{u.title}</h2>
              <div className="space-y-2">
                {u.changes.map((c, j) => (
                  <div key={j} className="flex items-start gap-2.5 text-[13px]"><span className="text-[#4ADE80] mt-0.5 shrink-0">+</span><span className="text-[#7A8599]">{c}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <footer className="border-t border-white/[0.04] max-w-[800px] mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#3D4654] text-[12px]"><p>\\u00a9 2026 TokenSave</p><div className="flex gap-4"><a href="/docs" className="hover:text-[#5A6577]">Docs</a><a href="/security" className="hover:text-[#5A6577]">Security</a><a href="/changelog" className="hover:text-[#5A6577]">Changelog</a><a href="/status" className="hover:text-[#5A6577]">Status</a></div></footer>
    </div>
  );
}`;

fs.writeFileSync('app/changelog/page.tsx', changelog);
console.log('Changelog fixed with v3.1.0, v3.0.0, v2.0.0!');