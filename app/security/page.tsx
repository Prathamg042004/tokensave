"use client";

export default function Security() {
  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4]">
      <nav className="border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-10 py-4 max-w-[900px] mx-auto">
          <a href="/" className="flex items-center gap-2.5"><div className="w-7 h-7 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-md flex items-center justify-center text-white font-bold text-[10px]">TS</div><span className="text-[16px] font-semibold tracking-tight">TokenSave</span></a>
          <div className="flex gap-5"><a href="/docs" className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Docs</a><a href="/dashboard" className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Dashboard</a></div>
        </div>
      </nav>

      <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-12">
        <h1 className="text-[32px] font-bold tracking-tight font-display">Security & Trust</h1>
        <p className="text-[#5A6577] text-[15px] mt-2 mb-12">How TokenSave handles your data, keys, and requests.</p>

        <div className="space-y-10">
          <section className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 flex items-center justify-center text-[#4ADE80] text-lg">🔒</div>
              <h2 className="text-[18px] font-semibold font-display">Zero-knowledge SDK</h2>
            </div>
            <p className="text-[#5A6577] text-[14px] leading-relaxed mb-5">Our recommended integration. The SDK runs entirely inside your own infrastructure. API keys are used locally to make direct calls to AI providers — they are never transmitted to TokenSave servers.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Caching happens in-memory on your server", "Model routing decisions made locally", "Prompt compression runs on your machine", "API calls go directly to the AI provider", "Only anonymous usage counts sent to dashboard"].map(f => (
                <div key={f} className="flex items-start gap-2.5 text-[13px] text-[#7A8599]"><span className="text-[#4ADE80] mt-0.5 shrink-0">✓</span>{f}</div>
              ))}
            </div>
            <div className="mt-6 bg-[#0A0D12] rounded-xl p-4 font-mono text-[12px] text-[#5A6577] leading-relaxed">
              <p className="text-[#3D4654] mb-1">{"// Data flow with SDK"}</p>
              <p>Your App → <span className="text-[#4ADE80]">TokenSave SDK (your server)</span> → AI Provider</p>
              <p className="mt-1">                    ↓</p>
              <p>              <span className="text-[#E8B94B]">Anonymous stats only</span></p>
              <p>              (request count, tokens saved)</p>
            </div>
          </section>

          <section className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#5B8DEF]/10 flex items-center justify-center text-[#5B8DEF] text-lg">🖥️</div>
              <h2 className="text-[18px] font-semibold font-display">Self-hosting</h2>
            </div>
            <p className="text-[#5A6577] text-[14px] leading-relaxed mb-5">Deploy TokenSave on your own infrastructure. Our entire codebase is open source — audit every line before deploying.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Full data sovereignty — nothing leaves your network", "Audit the source code on GitHub", "Deploy on your own infrastructure using our open source code", "Compatible with your existing compliance setup"].map(f => (
                <div key={f} className="flex items-start gap-2.5 text-[13px] text-[#7A8599]"><span className="text-[#5B8DEF] mt-0.5 shrink-0">✓</span>{f}</div>
              ))}
            </div>
            <a href="https://github.com/Prathamg042004/tokensave" className="inline-flex items-center gap-2 mt-5 text-[#5B8DEF] text-[13px] font-medium hover:underline">View source on GitHub →</a>
          </section>

          <section className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center text-[#A78BFA] text-lg">☁️</div>
              <h2 className="text-[18px] font-semibold font-display">Cloud proxy — data handling</h2>
            </div>
            <p className="text-[#5A6577] text-[14px] leading-relaxed mb-5">If you use our hosted proxy, here is exactly what happens with your data:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-[10px] text-[#5A6577] uppercase tracking-wider text-left border-b border-white/[0.04]">
                  <th className="pb-3 pr-4">Data</th><th className="pb-3 pr-4">Stored?</th><th className="pb-3">Details</th>
                </tr></thead>
                <tbody className="text-[#7A8599]">
                  <tr className="border-b border-white/[0.03]"><td className="py-3 pr-4 font-medium text-[#E8ECF4]">API keys</td><td className="py-3 pr-4"><span className="text-[#4ADE80] font-medium">Never</span></td><td className="py-3">Forwarded to provider per-request. Immediately discarded from memory.</td></tr>
                  <tr className="border-b border-white/[0.03]"><td className="py-3 pr-4 font-medium text-[#E8ECF4]">Prompts</td><td className="py-3 pr-4"><span className="text-[#E8B94B] font-medium">Hashed only</span></td><td className="py-3">A one-way hash for cache matching. Original text is not stored.</td></tr>
                  <tr className="border-b border-white/[0.03]"><td className="py-3 pr-4 font-medium text-[#E8ECF4]">Responses</td><td className="py-3 pr-4"><span className="text-[#E8B94B] font-medium">Cached 30m</span></td><td className="py-3">Stored in Redis with TLS in transit. Auto-deleted after 30 minutes.</td></tr>
                  <tr className="border-b border-white/[0.03]"><td className="py-3 pr-4 font-medium text-[#E8ECF4]">Usage stats</td><td className="py-3 pr-4"><span className="text-[#5B8DEF] font-medium">Yes</span></td><td className="py-3">Request count, tokens saved, cache hits. Powers your dashboard.</td></tr>
                  <tr><td className="py-3 pr-4 font-medium text-[#E8ECF4]">IP addresses</td><td className="py-3 pr-4"><span className="text-[#4ADE80] font-medium">Never</span></td><td className="py-3">Hashed for rate limiting only. Raw IPs never stored.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#E8B94B]/10 flex items-center justify-center text-[#E8B94B] text-lg">🛡️</div>
              <h2 className="text-[18px] font-semibold font-display">Security measures</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "Rate limiting", d: "60 requests/minute per key with standard headers" },
                { t: "Input validation", d: "All inputs sanitized, control characters stripped" },
                { t: "Security headers", d: "HSTS, X-Frame-Options, CSP, XSS protection on every response" },
                { t: "Attack path blocking", d: "Common exploit paths (/wp-admin, /.env, /.git) return 404" },
                { t: "Request size limits", d: "Maximum 500KB per request, 100K chars per message" },
                { t: "Audit logging", d: "All security events logged with hashed IPs" },
                { t: "CORS headers", d: "Proper CORS on all API routes for cross-origin access" },
                { t: "TLS encryption", d: "All connections use HTTPS with TLS 1.2+" },
              ].map(f => (
                <div key={f.t} className="bg-[#0A0D12] rounded-xl p-4">
                  <p className="text-[13px] font-medium text-[#E8ECF4] mb-1">{f.t}</p>
                  <p className="text-[12px] text-[#5A6577]">{f.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FB923C]/10 flex items-center justify-center text-[#FB923C] text-lg">📋</div>
              <h2 className="text-[18px] font-semibold font-display">Choose your trust level</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: "SDK", badge: "Most secure", desc: "Keys never leave your server. All optimization runs locally.", color: "#4ADE80", link: "/docs/api-reference" },
                { title: "Self-hosted", badge: "Full control", desc: "Clone the repo. Deploy on your infrastructure. MIT licensed.", color: "#5B8DEF", link: "https://github.com/Prathamg042004/tokensave" },
                { title: "Cloud proxy", badge: "Fastest setup", desc: "One URL swap. Keys forwarded per-request, never stored.", color: "#A78BFA", link: "/docs" },
              ].map(o => (
                <a key={o.title} href={o.link} className="bg-[#0A0D12] border border-white/[0.04] rounded-xl p-5 hover:border-white/[0.1] transition-all group">
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: o.color }}>{o.badge}</span>
                  <h3 className="text-[17px] font-semibold mt-2 group-hover:text-[#5B8DEF] transition-colors">{o.title}</h3>
                  <p className="text-[12px] text-[#5A6577] mt-2">{o.desc}</p>
                </a>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#5A6577] text-[14px]">Questions? <a href="mailto:prathamg200404@gmail.com" className="text-[#5B8DEF] hover:underline">prathamg200404@gmail.com</a></p>
        </div>
      </div>

      <footer className="border-t border-white/[0.04] max-w-[900px] mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#3D4654] text-[12px]">
        <p>© 2026 TokenSave</p>
        <div className="flex gap-4">{["Docs", "Security", "Changelog", "Status"].map(l => <a key={l} href={`/${l.toLowerCase()}`} className="hover:text-[#5A6577] transition-colors">{l}</a>)}</div>
      </footer>
    </div>
  );
}