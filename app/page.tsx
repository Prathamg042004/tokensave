"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
function ProviderIcon({ provider, size = 20 }: { provider: string; size?: number }) {
  const colors: any = { anthropic: "#D4A574", openai: "#74AA9C", google: "#4285F4", groq: "#F55036" };
  const letters: any = { anthropic: "A", openai: "O", google: "G", groq: "Q" };
  return <div style={{ width: size, height: size, backgroundColor: (colors[provider] || "#888") + "20", color: colors[provider] || "#888", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, fontWeight: 700 }}>{letters[provider] || "?"}</div>;
}

function LiveTerminal() {
  const [lines, setLines] = useState<{ text: string; color: string; delay: number }[]>([]);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allLines = [
    { text: "$ curl -X POST tokensave.vercel.app/api/proxy", color: "#E8ECF4", delay: 0 },
    { text: '  -d \'{"provider":"anthropic","messages":[{"role":"user","content":"What is the capital of Japan?"}]}\'', color: "#6B7A94", delay: 300 },
    { text: "", color: "", delay: 600 },
    { text: "⟩ Analyzing complexity... simple (7 words)", color: "#6B7A94", delay: 900 },
    { text: "⟩ Routing to claude-haiku (66% cheaper than sonnet)", color: "#5B8DEF", delay: 1400 },
    { text: "⟩ Compressed: removed 0 filler tokens", color: "#6B7A94", delay: 1800 },
    { text: "⟩ Cache: MISS — forwarding to Anthropic", color: "#E8B94B", delay: 2200 },
    { text: "", color: "", delay: 2500 },
    { text: '{"content":"The capital of Japan is Tokyo.","tokensave_meta":{', color: "#4ADE80", delay: 2800 },
    { text: '  "cache_hit": false, "model_used": "claude-haiku-4-5",', color: "#4ADE80", delay: 3000 },
    { text: '  "cost": "$0.0004", "cost_without": "$0.0012", "saved": "66%"', color: "#4ADE80", delay: 3200 },
    { text: "  }}", color: "#4ADE80", delay: 3400 },
    { text: "", color: "", delay: 3700 },
    { text: "$ # Same request again...", color: "#6B7A94", delay: 4200 },
    { text: "", color: "", delay: 4400 },
    { text: "⟩ Cache: HIT ✓", color: "#4ADE80", delay: 4800 },
    { text: '⟩ Cost: $0.0000 | Latency: 14ms | Saved: 100%', color: "#4ADE80", delay: 5200 },
  ];

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers = allLines.map((line, i) => setTimeout(() => setLines(prev => [...prev, line]), line.delay));
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <div ref={ref} className="font-mono text-[11px] md:text-[12px] leading-[1.7] min-h-[280px]">
      {lines.map((l, i) => (
        <div key={i} className="animate-fade-in" style={{ color: l.color }}>{l.text || "\u00A0"}</div>
      ))}
      {visible && lines.length < allLines.length && <span className="inline-block w-2 h-4 bg-[#5B8DEF] animate-pulse ml-0.5"></span>}
    </div>
  );
}

function BentoCard({ children, className = "", span = "" }: { children: React.ReactNode; className?: string; span?: string }) {
  return (
    <div className={`bg-[#12161E]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 ${span} ${className}`}>
      {children}
    </div>
  );
}

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = 0;
        const step = end / 40;
        const t = setInterval(() => { s += step; if (s >= end) { setVal(end); clearInterval(t); } else setVal(Math.floor(s)); }, 30);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{val}{suffix}</span>;
}

export default function Home() {
  const router = useRouter();
  const [hoveredBento, setHoveredBento] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4]">
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>

      <nav className="sticky top-0 z-50 bg-[#0A0D12]/80 backdrop-blur-md border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1200px] mx-auto">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#5B8DEF] rounded-md flex items-center justify-center text-white font-bold text-[11px] font-display">TS</div>
            <span className="text-[16px] font-display font-semibold tracking-tight">TokenSave</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            {[{ href: "/playground", l: "Playground" }, { href: "/docs", l: "Docs" }, { href: "/security", l: "Security" }, { href: "https://github.com/Prathamg042004/tokensave", l: "GitHub" }].map(n => (
              <a key={n.l} href={n.href} className="text-[13px] text-[#5A6577] hover:text-[#E8ECF4] transition-colors">{n.l}</a>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => router.push("/login")} className="text-[13px] text-[#5A6577] hover:text-white transition-colors px-3 py-1.5">Sign in</button>
            <button onClick={() => router.push("/login")} className="px-4 py-1.5 bg-[#5B8DEF] text-white rounded-md text-[13px] font-medium hover:bg-[#4A7CE0] transition-colors">Start free</button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">

        <section className="pt-16 md:pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[12px] text-[#5B8DEF] bg-[#5B8DEF]/8 border border-[#5B8DEF]/15 px-3 py-1 rounded-full font-medium">Open source</span>
                <span className="text-[12px] text-[#5A6577]">v3.1 · 4 providers · 13 models</span>
              </div>
              <h1 className="font-display text-[38px] md:text-[50px] font-bold leading-[1.06] tracking-[-0.02em] text-white">
                Stop overpaying<br />for AI API calls
              </h1>
              <p className="text-[#7A8599] text-[16px] leading-[1.7] mt-5 max-w-[420px]">
                TokenSave is a proxy that automatically caches, routes, and compresses every request between your app and AI providers. Average savings: 25–40%.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button onClick={() => router.push("/playground")} className="px-5 py-2.5 bg-[#5B8DEF] text-white rounded-lg text-[14px] font-semibold hover:bg-[#4A7CE0] transition-colors">Try the playground</button>
                <button onClick={() => router.push("/docs")} className="px-5 py-2.5 text-[#7A8599] rounded-lg text-[14px] border border-white/[0.06] hover:bg-white/[0.03] transition-colors">Integration guide</button>
              </div>
              <div className="flex items-center gap-5 mt-8">
                {[
                  { id: "anthropic", name: "Claude" },
                  { id: "openai", name: "GPT" },
                  { id: "google", name: "Gemini" },
                  { id: "groq", name: "Groq" },
                ].map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                    <ProviderIcon provider={p.id} size={16} />
                    <span className="text-[11px] text-[#5A6577]">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#12161E] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
                <span className="ml-3 text-[10px] text-[#3D4654]">terminal — tokensave</span>
              </div>
              <div className="p-5 overflow-x-auto">
                <LiveTerminal />
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 border-t border-white/[0.04]">
          <div className="grid grid-cols-4 gap-6">
            {[
              { n: 13, s: "+", l: "models", d: "across 4 providers" },
              { n: 40, s: "%", l: "avg savings", d: "on repetitive workloads" },
              { n: 100, s: "%", l: "cache savings", d: "on duplicate queries" },
              { n: 12, s: "ms", l: "cache latency", d: "vs 800ms+ direct" },
            ].map((s, i) => (
              <div key={i} className="text-center py-4">
                <p className="font-display text-[28px] md:text-[36px] font-bold tracking-tight text-white"><CountUp end={s.n} suffix={s.s} /></p>
                <p className="text-[12px] text-[#7A8599] mt-1">{s.l}</p>
                <p className="text-[10px] text-[#3D4654]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-[28px] font-bold tracking-tight text-white">How requests are optimized</h2>
              <p className="text-[#5A6577] text-[14px] mt-2 max-w-[400px]">Every call passes through three layers. Each works independently.</p>
            </div>
            <a href="/docs" className="text-[#5B8DEF] text-[13px] font-medium hover:underline shrink-0">Full technical docs →</a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <BentoCard span="md:col-span-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-[#4ADE80]/10 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#4ADE80]"></div></div>
                <h3 className="font-display text-[15px] font-semibold">Semantic cache</h3>
              </div>
              <p className="text-[13px] text-[#5A6577] leading-relaxed max-w-[480px]">Identical queries return the cached response instantly. Zero API cost, 12ms latency instead of 800ms. Cache auto-expires after 30 minutes.</p>
              <div className="mt-4 flex gap-8">
                <div><p className="text-[24px] font-display font-bold text-[#4ADE80]">$0</p><p className="text-[10px] text-[#3D4654]">per cached hit</p></div>
                <div><p className="text-[24px] font-display font-bold text-white">12ms</p><p className="text-[10px] text-[#3D4654]">avg response</p></div>
                <div><p className="text-[24px] font-display font-bold text-[#E8B94B]">30m</p><p className="text-[10px] text-[#3D4654]">TTL</p></div>
              </div>
            </BentoCard>

            <BentoCard span="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-[#5B8DEF]/10 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#5B8DEF]"></div></div>
                <h3 className="font-display text-[15px] font-semibold">Smart routing</h3>
              </div>
              <p className="text-[13px] text-[#5A6577] leading-relaxed">Simple → Haiku ($0.80/MTok). Complex → Sonnet ($3/MTok). When unsure → always Sonnet.</p>
              <p className="text-[#5B8DEF] text-[13px] font-medium mt-3">Up to 66% cheaper</p>
            </BentoCard>

            <BentoCard span="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-[#E8B94B]/10 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#E8B94B]"></div></div>
                <h3 className="font-display text-[15px] font-semibold">Compression</h3>
              </div>
              <p className="text-[13px] text-[#5A6577] leading-relaxed">Strips meaningless filler phrases. Never removes words that change meaning.</p>
              <p className="text-[#E8B94B] text-[13px] font-medium mt-3">5–15% fewer tokens</p>
            </BentoCard>

            <BentoCard span="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-[#F472B6]/10 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#F472B6]"></div></div>
                <h3 className="font-display text-[15px] font-semibold">Auto-fallback</h3>
              </div>
              <p className="text-[13px] text-[#5A6577] leading-relaxed">Rate limited? Automatically switches to your backup provider. Zero downtime.</p>
              <p className="text-[#F472B6] text-[13px] font-medium mt-3">Seamless switchover</p>
            </BentoCard>

            <BentoCard span="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-[#A78BFA]/10 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#A78BFA]"></div></div>
                <h3 className="font-display text-[15px] font-semibold">Quality modes</h3>
              </div>
              <div className="flex gap-2 mt-3">
                {["auto", "max_savings", "max_quality"].map(m => (
                  <span key={m} className="text-[10px] font-mono text-[#5A6577] bg-white/[0.03] border border-white/[0.04] px-2 py-1 rounded">{m}</span>
                ))}
              </div>
              <p className="text-[13px] text-[#5A6577] leading-relaxed mt-3">You choose the cost vs quality tradeoff.</p>
            </BentoCard>
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <h2 className="font-display text-[28px] font-bold tracking-tight text-white text-center">One URL change. That&apos;s it.</h2>
          <div className="mt-8 max-w-[650px] mx-auto bg-[#12161E] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
              <span className="ml-3 text-[10px] text-[#3D4654]">app.js</span>
            </div>
            <div className="p-5 font-mono text-[13px] leading-[1.9]">
              <span className="text-[#3D4654]">{"// Replace your provider URL"}</span><br />
              <span className="text-[#5A6577]">fetch(</span><span className="text-[#FF6B6B]/50 line-through">&quot;https://api.anthropic.com/v1/messages&quot;</span><span className="text-[#5A6577]">)</span><br /><br />
              <span className="text-[#3D4654]">{"// With your TokenSave endpoint"}</span><br />
              <span className="text-[#5A6577]">fetch(</span><span className="text-[#4ADE80]">&quot;https://tokensave.vercel.app/api/proxy&quot;</span><span className="text-[#5A6577]">)</span>
            </div>
          </div>
          <p className="text-center text-[12px] text-[#3D4654] mt-4">Same request format. Same response format. Add <code className="text-[#5A6577]">provider</code> and <code className="text-[#5A6577]">apiKey</code> to the body.</p>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Cloud proxy", badge: "Fastest setup", desc: "One URL swap. Keys forwarded per-request, never stored. Start in 2 minutes.", link: "/docs", cta: "Setup guide" },
              { title: "JavaScript SDK", badge: "Most private", desc: "Runs in your code. Keys never leave your server. npm install tokensave.", link: "/docs/api-reference", cta: "SDK docs" },
              { title: "Self-hosted", badge: "Full control", desc: "Clone, deploy, audit. MIT licensed. Your infrastructure, your rules.", link: "https://github.com/Prathamg042004/tokensave", cta: "View source" },
            ].map(o => (
              <div key={o.title} className="bg-[#12161E] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.1] transition-colors">
                <span className="text-[10px] text-[#5A6577] uppercase tracking-wider">{o.badge}</span>
                <h3 className="font-display text-[20px] font-semibold text-white mt-2">{o.title}</h3>
                <p className="text-[13px] text-[#5A6577] mt-2 leading-relaxed">{o.desc}</p>
                <a href={o.link} className="text-[#5B8DEF] text-[13px] font-medium mt-4 inline-block hover:underline">{o.cta} →</a>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <h2 className="font-display text-[28px] font-bold tracking-tight text-white text-center">Pricing</h2>
          <p className="text-[#5A6577] text-[14px] text-center mt-2">Free to start. No credit card.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10 max-w-[880px] mx-auto">
            {[
              { name: "Starter", price: "$99", period: "/mo", requests: "50K requests", features: ["Cache + routing + compression", "4 providers, 13 models", "Dashboard analytics", "Email support"], primary: false },
              { name: "Growth", price: "$499", period: "/mo", requests: "500K requests", features: ["Everything in Starter", "Quality modes", "Team management", "Auto-fallback chains", "Priority support"], primary: true },
              { name: "Enterprise", price: "Custom", period: "", requests: "Unlimited", features: ["Everything in Growth", "Custom routing rules", "Dedicated account manager", "SLA guarantee", "Invoice billing"], primary: false },
            ].map(p => (
              <div key={p.name} className={`bg-[#12161E] border rounded-2xl p-6 relative ${p.primary ? "border-[#5B8DEF]/30" : "border-white/[0.06]"}`}>
                {p.primary && <div className="absolute -top-2.5 left-5 bg-[#5B8DEF] text-white text-[9px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Recommended</div>}
                <p className="text-[12px] text-[#5A6577]">{p.name}</p>
                <p className="font-display text-[32px] font-bold text-white mt-1">{p.price}<span className="text-[13px] text-[#3D4654] font-normal">{p.period}</span></p>
                <p className="text-[11px] text-[#3D4654] mt-0.5">{p.requests}</p>
                <div className="mt-5 space-y-2.5">
                  {p.features.map(f => <p key={f} className="text-[12px] text-[#5A6577] flex items-start gap-2"><span className="text-[#5B8DEF] mt-0.5 text-[8px]">●</span>{f}</p>)}
                </div>
                <button onClick={() => p.name === "Enterprise" ? window.location.href = "mailto:prathamg200404@gmail.com?subject=TokenSave Enterprise" : router.push("/login")} className={`mt-6 w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors ${p.primary ? "bg-[#5B8DEF] text-white hover:bg-[#4A7CE0]" : "border border-white/[0.08] text-[#7A8599] hover:bg-white/[0.03]"}`}>{p.name === "Enterprise" ? "Contact sales" : "Start free trial"}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <div className="bg-[#12161E] border border-white/[0.06] rounded-2xl p-8 md:p-12 text-center max-w-[640px] mx-auto">
            <h2 className="font-display text-[24px] font-bold text-white">See the savings on your own queries</h2>
            <p className="text-[#5A6577] text-[14px] mt-3">The playground uses your actual API key. Send a prompt, see the optimization, send it again to see the cache hit.</p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => router.push("/playground")} className="px-6 py-2.5 bg-[#5B8DEF] text-white rounded-lg text-[14px] font-semibold hover:bg-[#4A7CE0] transition-colors">Open playground</button>
              <button onClick={() => router.push("/docs")} className="px-6 py-2.5 text-[#7A8599] border border-white/[0.06] rounded-lg text-[14px] hover:bg-white/[0.03] transition-colors">Read docs</button>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#5B8DEF] rounded flex items-center justify-center text-white font-bold text-[8px]">TS</div>
            <span className="text-[12px] text-[#3D4654]">© 2026 TokenSave</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {[
              { href: "/docs", l: "Docs" }, { href: "/docs/api-reference", l: "API" },
              { href: "/security", l: "Security" }, { href: "/changelog", l: "Changelog" },
              { href: "/status", l: "Status" },
              { href: "https://github.com/Prathamg042004/tokensave", l: "GitHub" },
            ].map(l => <a key={l.l} href={l.href} className="text-[11px] text-[#3D4654] hover:text-[#5A6577] transition-colors">{l.l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}