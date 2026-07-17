"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = target;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function Home() {
  const router = useRouter();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/[0.03] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-blue-500/[0.02] rounded-full blur-[100px]"></div>
      </div>

      <nav className="relative z-10 border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-10 py-4 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">TS</div>
            <span className="text-lg font-semibold tracking-tight">TokenSave</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="/docs" className="text-[13px] text-gray-500 hover:text-gray-200 transition-colors">Docs</a>
            <a href="/security" className="text-[13px] text-gray-500 hover:text-gray-200 transition-colors">Security</a>
            <a href="/changelog" className="text-[13px] text-gray-500 hover:text-gray-200 transition-colors">Changelog</a>
            <a href="/status" className="text-[13px] text-gray-500 hover:text-gray-200 transition-colors">Status</a>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => router.push("/login")} className="px-4 py-2 text-gray-400 hover:text-white text-[13px] transition-colors">Sign in</button>
            <button onClick={() => router.push("/login")} className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity">Start free</button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-10">
        <section className="pt-20 md:pt-32 pb-20">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[12px] text-gray-400">Now with 4 providers and 16 models</span>
            </div>
            <h1 className="text-[44px] md:text-[64px] font-bold leading-[1.05] tracking-tight mb-6">
              <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">AI costs cut.</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Quality kept.</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-[540px] mb-10">Middleware that sits between your app and AI providers. Every request automatically cached, routed, and compressed.</p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button onClick={() => router.push("/login")} className="px-8 py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity text-[15px]">Start 14-day free trial</button>
              <button onClick={() => router.push("/playground")} className="px-8 py-3.5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-xl hover:bg-white/[0.06] transition-colors text-[15px]">Live playground</button>
            </div>
            <p className="text-gray-600 text-[13px]">No credit card · Setup in 2 minutes · Free forever under 1K requests</p>
          </div>

          <div className="hidden lg:block absolute right-10 top-32 w-[380px]">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div><span className="text-[11px] text-gray-500">Live optimization</span></div>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-[12px] text-gray-400">Original cost</span><span className="text-[14px] text-red-400/70 line-through">$0.0034</span></div>
                <div className="flex justify-between items-center"><span className="text-[12px] text-gray-400">After TokenSave</span><span className="text-[14px] text-emerald-400 font-semibold">$0.0012</span></div>
                <div className="h-px bg-white/[0.06]"></div>
                <div className="flex justify-between items-center"><span className="text-[12px] text-gray-400">You saved</span><span className="text-[16px] font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">65%</span></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-white/[0.03] rounded-lg p-2 text-center"><p className="text-[9px] text-gray-500">Cache</p><p className="text-emerald-400 text-[11px] font-medium">HIT</p></div>
                <div className="bg-white/[0.03] rounded-lg p-2 text-center"><p className="text-[9px] text-gray-500">Model</p><p className="text-cyan-400 text-[11px] font-medium">Haiku</p></div>
                <div className="bg-white/[0.03] rounded-lg p-2 text-center"><p className="text-[9px] text-gray-500">Latency</p><p className="text-amber-400 text-[11px] font-medium">12ms</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {[
              { value: 4, suffix: "", label: "AI providers", sub: "Claude · GPT · Gemini · Llama" },
              { value: 16, suffix: "+", label: "Models supported", sub: "Auto-routed by complexity" },
              { value: 40, suffix: "%", label: "Avg cost reduction", sub: "Without quality loss" },
              { value: 100, suffix: "%", label: "Cache savings", sub: "On repeated queries" },
            ].map((s, i) => (
              <div key={i} className="text-center md:text-left">
                <p className="text-[36px] md:text-[48px] font-bold tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"><AnimatedCounter target={s.value} suffix={s.suffix} /></p>
                <p className="text-[13px] text-gray-300 font-medium mt-1">{s.label}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <div className="text-center mb-14">
            <p className="text-[11px] text-cyan-400/60 uppercase tracking-widest font-medium mb-3">How it works</p>
            <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight">Three steps. Two minutes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Connect", desc: "Add your AI provider API keys in the dashboard. Supports Anthropic, OpenAI, Google, and Groq.", accent: "from-cyan-400/20" },
              { step: "02", title: "Replace", desc: "Swap your AI provider URL with your TokenSave proxy URL. One line change in your code.", accent: "from-blue-400/20" },
              { step: "03", title: "Save", desc: "Every request is automatically cached, routed to the optimal model, and compressed. Watch costs drop.", accent: "from-violet-400/20" },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-b ${s.accent} to-transparent border border-white/[0.04] rounded-2xl p-6 md:p-8 relative overflow-hidden`}>
                <span className="text-[80px] font-bold text-white/[0.03] absolute -top-4 -right-2 leading-none">{s.step}</span>
                <div className="relative">
                  <p className="text-cyan-400 text-[12px] font-semibold tracking-wider uppercase mb-3">Step {s.step}</p>
                  <h3 className="text-[22px] font-bold mb-3">{s.title}</h3>
                  <p className="text-gray-400 text-[14px] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            <div className="lg:w-[45%]">
              <p className="text-[11px] text-cyan-400/60 uppercase tracking-widest font-medium mb-3">Optimization engine</p>
              <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight leading-tight mb-6">Six layers of<br />intelligence</h2>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-8">Every request passes through our optimization pipeline. Each layer is independent — disable any you don&apos;t need.</p>
              <button onClick={() => router.push("/docs")} className="text-cyan-400 text-[14px] font-medium hover:underline">Read technical docs →</button>
            </div>
            <div className="lg:w-[55%] grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "Semantic Cache", desc: "Returns cached responses for identical queries instantly.", metric: "100% savings", color: "#22d3ee" },
                { title: "Smart Routing", desc: "Auto-routes simple tasks to cheaper, faster models.", metric: "Up to 66% savings", color: "#a78bfa" },
                { title: "Prompt Compression", desc: "Strips meaningless filler while preserving intent.", metric: "5-15% reduction", color: "#34d399" },
                { title: "Quality Modes", desc: "Auto, max_savings, or max_quality — your call.", metric: "Full control", color: "#fbbf24" },
                { title: "Provider Fallback", desc: "Rate limited? Auto-switches to backup provider.", metric: "Zero downtime", color: "#f472b6" },
                { title: "Context Summary", desc: "Compresses 50-message conversations to 3K tokens.", metric: "88% compression", color: "#fb923c" },
              ].map((f, i) => (
                <div key={i} onMouseEnter={() => setHoveredFeature(i)} onMouseLeave={() => setHoveredFeature(null)} className={`border rounded-xl p-4 transition-all duration-300 cursor-default ${hoveredFeature === i ? "bg-white/[0.04] border-white/[0.1] scale-[1.02]" : "bg-white/[0.015] border-white/[0.04]"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full transition-transform duration-300" style={{ backgroundColor: f.color, transform: hoveredFeature === i ? "scale(1.5)" : "scale(1)" }}></div>
                    <h3 className="text-[13px] font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{f.desc}</p>
                  <p className="text-[11px] font-medium" style={{ color: f.color }}>{f.metric}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-10 max-w-[800px] mx-auto">
            <p className="text-[11px] text-cyan-400/60 uppercase tracking-widest font-medium mb-4 text-center">Integration</p>
            <h2 className="text-[24px] md:text-[28px] font-bold text-center mb-8">One line change</h2>
            <div className="bg-[#08090C] rounded-xl p-5 md:p-6 font-mono text-[13px] leading-relaxed overflow-x-auto">
              <p className="text-gray-600 mb-1">{"// Before"}</p>
              <p className="mb-4"><span className="text-gray-500">fetch(</span><span className="text-red-400/60 line-through">&quot;https://api.anthropic.com/v1/messages&quot;</span><span className="text-gray-500">, ...)</span></p>
              <p className="text-gray-600 mb-1">{"// After — that's it"}</p>
              <p><span className="text-gray-500">fetch(</span><span className="text-emerald-400">&quot;https://tokensave.vercel.app/api/proxy&quot;</span><span className="text-gray-500">, ...)</span></p>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <p className="text-[11px] text-cyan-400/60 uppercase tracking-widest font-medium mb-3 text-center">Trust</p>
          <h2 className="text-[32px] md:text-[36px] font-bold text-center mb-12">Your keys. Your control.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[900px] mx-auto">
            {[
              { label: "Most secure", title: "SDK", desc: "Runs in your code. Keys never leave your server.", link: "/docs", linkText: "SDK docs", gradient: "from-emerald-500/10" },
              { label: "Full control", title: "Self-hosted", desc: "Run on your infrastructure. Audit every line on GitHub.", link: "https://github.com/Prathamg042004/tokensave", linkText: "GitHub", gradient: "from-cyan-500/10" },
              { label: "Fastest setup", title: "Cloud proxy", desc: "One URL swap. Keys forwarded, never stored by us.", link: "/security", linkText: "Security policy", gradient: "from-amber-500/10" },
            ].map((o, i) => (
              <div key={i} className={`bg-gradient-to-b ${o.gradient} to-transparent border border-white/[0.04] rounded-2xl p-6 text-center`}>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-3">{o.label}</p>
                <h3 className="text-[20px] font-bold mb-2">{o.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed mb-4">{o.desc}</p>
                <a href={o.link} className="text-cyan-400 text-[12px] font-medium hover:underline">{o.linkText} →</a>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <p className="text-[11px] text-cyan-400/60 uppercase tracking-widest font-medium mb-3 text-center">Pricing</p>
          <h2 className="text-[32px] md:text-[36px] font-bold text-center mb-4">Start free. Scale when ready.</h2>
          <p className="text-gray-500 text-center text-[15px] mb-12">No credit card required for the free trial.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[960px] mx-auto">
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6 md:p-8">
              <p className="text-[13px] text-gray-500 font-medium mb-4">Starter</p>
              <p className="text-[36px] font-bold tracking-tight">$99<span className="text-[16px] text-gray-500 font-normal">/mo</span></p>
              <p className="text-[13px] text-gray-500 mt-1 mb-6">For small startups</p>
              <div className="space-y-2.5 mb-8">
                {["50,000 requests/mo", "Smart caching", "Model routing", "Basic dashboard"].map(f => <p key={f} className="text-[13px] text-gray-400 flex items-center gap-2"><span className="text-emerald-400/60 text-[10px]">●</span>{f}</p>)}
              </div>
              <button onClick={() => router.push("/login")} className="w-full py-2.5 border border-white/[0.08] text-gray-300 rounded-xl text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Get started</button>
            </div>
            <div className="bg-gradient-to-b from-cyan-500/5 to-transparent border border-cyan-400/20 rounded-2xl p-6 md:p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Popular</div>
              <p className="text-[13px] text-gray-500 font-medium mb-4">Growth</p>
              <p className="text-[36px] font-bold tracking-tight">$499<span className="text-[16px] text-gray-500 font-normal">/mo</span></p>
              <p className="text-[13px] text-gray-500 mt-1 mb-6">For growing teams</p>
              <div className="space-y-2.5 mb-8">
                {["500,000 requests/mo", "Everything in Starter", "Prompt compression", "Team management", "Priority support"].map(f => <p key={f} className="text-[13px] text-gray-400 flex items-center gap-2"><span className="text-cyan-400/60 text-[10px]">●</span>{f}</p>)}
              </div>
              <button onClick={() => router.push("/login")} className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity">Get started</button>
            </div>
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-6 md:p-8">
              <p className="text-[13px] text-gray-500 font-medium mb-4">Enterprise</p>
              <p className="text-[36px] font-bold tracking-tight">Custom</p>
              <p className="text-[13px] text-gray-500 mt-1 mb-6">For large organizations</p>
              <div className="space-y-2.5 mb-8">
                {["Unlimited requests", "Everything in Growth", "Custom routing rules", "Dedicated manager", "SLA guarantee"].map(f => <p key={f} className="text-[13px] text-gray-400 flex items-center gap-2"><span className="text-violet-400/60 text-[10px]">●</span>{f}</p>)}
              </div>
              <button onClick={() => window.location.href = "mailto:prathamg200404@gmail.com?subject=TokenSave Enterprise"} className="w-full py-2.5 border border-white/[0.08] text-gray-300 rounded-xl text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Contact sales</button>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <div className="bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-violet-500/5 border border-white/[0.06] rounded-3xl p-10 md:p-16 text-center">
            <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight mb-4">Ready to optimize?</h2>
            <p className="text-gray-400 text-[15px] mb-8 max-w-[400px] mx-auto">14-day free trial. No credit card. Setup in under two minutes.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => router.push("/login")} className="px-8 py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">Start free trial</button>
              <button onClick={() => router.push("/docs")} className="px-8 py-3.5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-xl hover:bg-white/[0.06] transition-colors">Read the docs</button>
            </div>
          </div>
        </section>
      </div>

      <footer className="relative z-10 border-t border-white/[0.04] mt-10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-md flex items-center justify-center text-white font-bold text-xs">TS</div>
            <span className="text-[14px] text-gray-500">© 2026 TokenSave</span>
          </div>
          <div className="flex flex-wrap gap-6 justify-center">
            {[
              { href: "/docs", label: "Docs" },
              { href: "/docs/api-reference", label: "API Reference" },
              { href: "/security", label: "Security" },
              { href: "/changelog", label: "Changelog" },
              { href: "/status", label: "Status" },
              { href: "https://github.com/Prathamg042004/tokensave", label: "GitHub" },
              { href: "mailto:prathamg200404@gmail.com", label: "Contact" },
            ].map(l => <a key={l.href} href={l.href} className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">{l.label}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}