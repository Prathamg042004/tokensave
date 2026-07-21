"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, ReactNode } from "react";

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView(0.15);
  return <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(30px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>{children}</div>;
}

function DotGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.3 }}>
      <svg width="100%" height="100%"><defs><pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="#5B8DEF" opacity="0.3" /></pattern></defs><rect width="100%" height="100%" fill="url(#dots)" /></svg>
    </div>
  );
}

function GlowOrb({ color, size, top, left, delay = 0 }: { color: string; size: number; top: string; left: string; delay?: number }) {
  return <div className="absolute rounded-full pointer-events-none" style={{ width: size, height: size, top, left, background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`, animation: `float ${6 + delay}s ease-in-out infinite alternate`, animationDelay: `${delay}s` }} />;
}

function Typewriter({ text, speed = 40 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(0);
  const { ref, inView } = useInView();
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setShown(p => { if (p >= text.length) { clearInterval(t); return p; } return p + 1; }), speed);
    return () => clearInterval(t);
  }, [inView, text, speed]);
  return <span ref={ref}>{text.slice(0, shown)}<span className="animate-pulse text-[#5B8DEF]">|</span></span>;
}

function AnimatedTerminal() {
  const [lines, setLines] = useState<string[]>([]);
  const { ref, inView } = useInView(0.3);
  const allLines = [
    { t: '$ POST /api/proxy  {"provider":"anthropic"}', d: 0 },
    { t: '⟩ Complexity: simple (6 words)', d: 600 },
    { t: '⟩ Routed → claude-haiku  (66% cheaper)', d: 1200 },
    { t: '⟩ Compressed: 3 filler tokens removed', d: 1800 },
    { t: '⟩ Cache: MISS → forwarding to Anthropic', d: 2400 },
    { t: '✓ Response: "Tokyo is the capital of Japan"', d: 3200 },
    { t: '  cost: $0.0004 | saved: 66% | 340ms', d: 3600 },
    { t: '', d: 4200 },
    { t: '$ Same request again...', d: 4800 },
    { t: '⟩ Cache: HIT ✓', d: 5400 },
    { t: '  cost: $0.0000 | saved: 100% | 12ms', d: 5800 },
  ];
  useEffect(() => {
    if (!inView) return;
    const timers = allLines.map((l, i) => setTimeout(() => setLines(p => [...p, l.t]), l.d));
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#5B8DEF] via-[#A78BFA] to-[#E8B94B] rounded-2xl opacity-20 blur-sm" />
      <div className="relative bg-[#0D1117] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" /><div className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><div className="w-3 h-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-[10px] text-[#3D4654] font-mono">terminal — tokensave</span>
        </div>
        <div className="p-5 font-mono text-[12px] leading-[1.8] min-h-[280px]">
          {lines.map((l, i) => (
            <div key={i} style={{ animation: "fadeSlide 0.3s ease forwards", color: l.startsWith("✓") || l.includes("HIT") ? "#4ADE80" : l.startsWith("⟩") ? "#5B8DEF" : l.startsWith("$") ? "#E8ECF4" : l.includes("cost") ? "#E8B94B" : "#6B7A94" }}>{l || "\u00A0"}</div>
          ))}
          {lines.length < allLines.length && inView && <span className="inline-block w-2 h-4 bg-[#5B8DEF] animate-pulse" />}
        </div>
      </div>
    </div>
  );
}

function FlowDiagram() {
  const { ref, inView } = useInView(0.2);
  const providers = [
    { name: "Claude", color: "#D4A574", y: 20 },
    { name: "GPT", color: "#74AA9C", y: 65 },
    { name: "Gemini", color: "#4285F4", y: 110 },
    { name: "Groq", color: "#F55036", y: 155 },
  ];
  return (
    <div ref={ref} className="w-full">
      <svg viewBox="0 0 600 190" className="w-full" style={{ opacity: inView ? 1 : 0, transition: "opacity 1s ease" }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5B8DEF" /><stop offset="100%" stopColor="#4ADE80" /></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect x="10" y="60" width="120" height="70" rx="12" fill="#12161E" stroke="#5B8DEF33" strokeWidth="1" />
        <text x="70" y="92" textAnchor="middle" fill="#E8ECF4" fontSize="13" fontWeight="600" fontFamily="system-ui">Your App</text>
        <text x="70" y="112" textAnchor="middle" fill="#5A6577" fontSize="10" fontFamily="system-ui">API request</text>

        <rect x="190" y="30" width="160" height="130" rx="14" fill="#12161E" stroke="url(#lineGrad)" strokeWidth="1.5" />
        <text x="270" y="58" textAnchor="middle" fill="#5B8DEF" fontSize="12" fontWeight="700" fontFamily="system-ui">TokenSave</text>
        <text x="270" y="80" textAnchor="middle" fill="#4ADE80" fontSize="10" fontFamily="system-ui">✓ Cache check</text>
        <text x="270" y="100" textAnchor="middle" fill="#A78BFA" fontSize="10" fontFamily="system-ui">✓ Smart routing</text>
        <text x="270" y="120" textAnchor="middle" fill="#E8B94B" fontSize="10" fontFamily="system-ui">✓ Compression</text>
        <text x="270" y="140" textAnchor="middle" fill="#F472B6" fontSize="10" fontFamily="system-ui">✓ Fallback</text>

        {providers.map((p, i) => (
          <g key={p.name}>
            <rect x="420" y={p.y} width="110" height="32" rx="8" fill="#12161E" stroke={p.color + "44"} strokeWidth="1">
              {inView && <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin={`${0.5 + i * 0.15}s`} fill="freeze" />}
            </rect>
            <circle cx="438" cy={p.y + 16} r="5" fill={p.color} opacity="0.6" />
            <text x="475" y={p.y + 20} textAnchor="middle" fill={p.color} fontSize="11" fontWeight="500" fontFamily="system-ui">{p.name}</text>
          </g>
        ))}

        <line x1="130" y1="95" x2="190" y2="95" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4,3" filter="url(#glow)">
          {inView && <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" fill="freeze" />}
        </line>
        <line x1="350" y1="70" x2="420" y2="36" stroke="#D4A57444" strokeWidth="1" strokeDasharray="3,3">{inView && <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1.5s" begin="0.3s" fill="freeze" />}</line>
        <line x1="350" y1="85" x2="420" y2="81" stroke="#74AA9C44" strokeWidth="1" strokeDasharray="3,3">{inView && <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1.5s" begin="0.45s" fill="freeze" />}</line>
        <line x1="350" y1="100" x2="420" y2="126" stroke="#4285F444" strokeWidth="1" strokeDasharray="3,3">{inView && <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1.5s" begin="0.6s" fill="freeze" />}</line>
        <line x1="350" y1="115" x2="420" y2="171" stroke="#F5503644" strokeWidth="1" strokeDasharray="3,3">{inView && <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1.5s" begin="0.75s" fill="freeze" />}</line>
      </svg>
    </div>
  );
}

function StatsCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let s = 0;
    const step = value / 30;
    const t = setInterval(() => { s += step; if (s >= value) { setCount(value); clearInterval(t); } else setCount(Math.floor(s)); }, 40);
    return () => clearInterval(t);
  }, [inView, value]);
  return <div ref={ref} className="text-center"><p className="font-display text-[40px] md:text-[52px] font-bold tracking-tight text-white">{count}{suffix}</p><p className="text-[13px] text-[#5A6577] mt-1">{label}</p></div>;
}

function ShimmerButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative px-7 py-3 bg-[#5B8DEF] text-white rounded-xl text-[15px] font-semibold overflow-hidden group hover:bg-[#4A7CE0] transition-colors">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <span className="relative">{children}</span>
    </button>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4] overflow-hidden">
      <style jsx global>{`
        @keyframes float { 0% { transform: translateY(0px); } 100% { transform: translateY(-20px); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes orbit { 0% { transform: rotate(0deg) translateX(8px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(8px) rotate(-360deg); } }
        @keyframes pulse-border { 0%,100% { border-color: rgba(91,141,239,0.15); } 50% { border-color: rgba(91,141,239,0.35); } }
        .gradient-border { animation: pulse-border 3s ease-in-out infinite; }
        .shimmer-text { background: linear-gradient(90deg, #E8ECF4 0%, #5B8DEF 50%, #E8ECF4 100%); background-size: 200% auto; animation: shimmer 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      `}</style>

      <DotGrid />
      <GlowOrb color="#5B8DEF" size={600} top="-200px" left="60%" delay={0} />
      <GlowOrb color="#A78BFA" size={400} top="40%" left="-10%" delay={2} />
      <GlowOrb color="#4ADE80" size={300} top="70%" left="70%" delay={4} />

      <nav className="sticky top-0 z-50 bg-[#0A0D12]/70 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1200px] mx-auto">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20">TS</div>
            <span className="text-[17px] font-semibold tracking-tight">TokenSave</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            {["Playground", "Docs", "Security", "Changelog", "GitHub"].map(n => (
              <a key={n} href={n === "GitHub" ? "https://github.com/Prathamg042004/tokensave" : `/${n.toLowerCase()}`} className="text-[13px] text-[#5A6577] hover:text-white transition-colors">{n}</a>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => router.push("/login")} className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Sign in</button>
            <button onClick={() => router.push("/login")} className="px-4 py-2 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[#5B8DEF]/20">Start free</button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12">

        <section className="pt-20 md:pt-28 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 bg-[#5B8DEF]/5 border border-[#5B8DEF]/15 rounded-full px-4 py-1.5 mb-6">
                <div className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse" />
                <span className="text-[12px] text-[#7A8599]">Open source · 4 providers · 13 models</span>
              </div>
              <h1 className="text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-tight">
                <Typewriter text="Stop overpaying for AI API calls" speed={35} />
              </h1>
              <p className="text-[#7A8599] text-[17px] leading-[1.7] mt-6 max-w-[460px]">
                TokenSave is middleware that automatically caches, routes, and compresses every request. Works with Claude, GPT, Gemini, and Groq.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <ShimmerButton onClick={() => router.push("/playground")}>Open playground</ShimmerButton>
                <button onClick={() => router.push("/docs")} className="px-7 py-3 text-[#7A8599] rounded-xl text-[15px] border border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all">Read docs</button>
              </div>
              <div className="flex items-center gap-6 mt-10">
                {[
                  { name: "Anthropic", color: "#D4A574", letter: "A" },
                  { name: "OpenAI", color: "#74AA9C", letter: "O" },
                  { name: "Google", color: "#4285F4", letter: "G" },
                  { name: "Groq", color: "#F55036", letter: "Q" },
                ].map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2 group cursor-default" style={{ animation: `orbit 20s linear infinite`, animationDelay: `${i * -5}s`, animationPlayState: "paused" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold border group-hover:scale-110 transition-transform" style={{ backgroundColor: p.color + "12", color: p.color, borderColor: p.color + "30" }}>{p.letter}</div>
                    <span className="text-[12px] text-[#5A6577] group-hover:text-white transition-colors">{p.name}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.3}>
              <AnimatedTerminal />
            </FadeIn>
          </div>
        </section>

        <section className="py-12 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter value={13} suffix="+" label="AI models" />
            <StatsCounter value={40} suffix="%" label="avg savings" />
            <StatsCounter value={100} suffix="%" label="cache savings" />
            <StatsCounter value={12} suffix="ms" label="cache latency" />
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeIn>
            <h2 className="text-[30px] md:text-[36px] font-bold tracking-tight text-center mb-4">How your requests are optimized</h2>
            <p className="text-[#5A6577] text-[15px] text-center max-w-[500px] mx-auto mb-12">Every API call flows through the TokenSave pipeline before reaching the provider.</p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="max-w-[700px] mx-auto bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-6 md:p-8">
              <FlowDiagram />
            </div>
          </FadeIn>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeIn><h2 className="text-[30px] md:text-[36px] font-bold tracking-tight mb-10">Six optimization layers</h2></FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {[
              { title: "Semantic cache", desc: "Same query = cached response instantly. $0 cost, 12ms.", metric: "100% savings", color: "#4ADE80", span: "md:col-span-4" },
              { title: "Smart routing", desc: "Simple → Haiku. Complex → Sonnet. When unsure → always Sonnet.", metric: "66% cheaper", color: "#5B8DEF", span: "md:col-span-2" },
              { title: "Compression", desc: "Strips filler phrases. Meaning preserved. Tokens reduced.", metric: "5-15% saved", color: "#E8B94B", span: "md:col-span-2" },
              { title: "Provider fallback", desc: "Rate limited? Auto-switches to your backup provider.", metric: "Zero downtime", color: "#F472B6", span: "md:col-span-2" },
              { title: "Quality modes", desc: "auto · max_savings · max_quality — you choose the tradeoff.", metric: "Full control", color: "#A78BFA", span: "md:col-span-2" },
              { title: "Context summary", desc: "Compresses 50-message conversations to 3K tokens. 88% reduction.", metric: "Heavy users", color: "#FB923C", span: "md:col-span-3" },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 0.08} className={f.span}>
                <div className="h-full bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.15] transition-all duration-300 group gradient-border">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full group-hover:scale-150 transition-transform" style={{ backgroundColor: f.color, boxShadow: `0 0 12px ${f.color}40` }} />
                    <h3 className="text-[14px] font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-[12px] text-[#5A6577] leading-relaxed">{f.desc}</p>
                  <p className="text-[12px] font-medium mt-3" style={{ color: f.color }}>{f.metric}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeIn>
            <h2 className="text-[30px] md:text-[36px] font-bold tracking-tight text-center mb-8">One URL change. That&apos;s it.</h2>
            <div className="max-w-[650px] mx-auto relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#5B8DEF]/20 via-[#A78BFA]/20 to-[#4ADE80]/20 rounded-2xl blur-lg" />
              <div className="relative bg-[#0D1117] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04]">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" /><div className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><div className="w-3 h-3 rounded-full bg-[#28C840]" />
                  <span className="ml-3 text-[10px] text-[#3D4654] font-mono">your-app.js</span>
                </div>
                <div className="p-6 font-mono text-[14px] leading-[2]">
                  <span className="text-[#3D4654]">{"// Before"}</span><br />
                  <span className="text-[#5A6577]">fetch(</span><span className="text-[#FF6B6B]/50 line-through">&quot;https://api.anthropic.com/v1/messages&quot;</span><span className="text-[#5A6577]">)</span><br /><br />
                  <span className="text-[#3D4654]">{"// After — that's it"}</span><br />
                  <span className="text-[#5A6577]">fetch(</span><span className="text-[#4ADE80]">&quot;https://tokensave.vercel.app/api/proxy&quot;</span><span className="text-[#5A6577]">)</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeIn><h2 className="text-[30px] md:text-[36px] font-bold tracking-tight text-center mb-10">Your keys, your rules</h2></FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Cloud proxy", badge: "2 min setup", desc: "Swap one URL. Keys forwarded per-request, never stored by us.", color: "#5B8DEF", link: "/docs" },
              { title: "SDK", badge: "Most private", desc: "Runs in your code. Keys never leave your server. Full local optimization.", color: "#4ADE80", link: "/docs/api-reference" },
              { title: "Self-hosted", badge: "Full control", desc: "Clone the repo. Deploy anywhere. MIT licensed. Audit every line.", color: "#A78BFA", link: "https://github.com/Prathamg042004/tokensave" },
            ].map((o, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <a href={o.link} className="block bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.15] transition-all group h-full">
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ color: o.color, backgroundColor: o.color + "12" }}>{o.badge}</span>
                  <h3 className="text-[20px] font-semibold mt-4 group-hover:text-[#5B8DEF] transition-colors">{o.title}</h3>
                  <p className="text-[13px] text-[#5A6577] mt-2 leading-relaxed">{o.desc}</p>
                </a>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeIn><h2 className="text-[30px] md:text-[36px] font-bold tracking-tight text-center">Pricing</h2><p className="text-[#5A6577] text-[15px] text-center mt-2 mb-10">Free to start. No credit card.</p></FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-[900px] mx-auto">
            {[
              { name: "Starter", price: "$99", reqs: "50K requests", features: ["Cache + routing + compression", "4 providers, 13 models", "Dashboard analytics", "Email support"], primary: false },
              { name: "Growth", price: "$499", reqs: "500K requests", features: ["Everything in Starter", "Quality modes", "Team management", "Auto-fallback", "Priority support"], primary: true },
              { name: "Enterprise", price: "Custom", reqs: "Unlimited", features: ["Everything in Growth", "Custom routing", "Dedicated manager", "SLA guarantee", "Invoice billing"], primary: false },
            ].map((p, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className={`relative bg-[#12161E]/60 backdrop-blur border rounded-2xl p-6 h-full ${p.primary ? "border-[#5B8DEF]/30 shadow-lg shadow-[#5B8DEF]/5" : "border-white/[0.06]"}`}>
                  {p.primary && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white text-[10px] font-semibold px-3 py-1 rounded-full">Recommended</div>}
                  <p className="text-[13px] text-[#5A6577]">{p.name}</p>
                  <p className="text-[36px] font-bold mt-1">{p.price}<span className="text-[14px] text-[#3D4654] font-normal">{p.price !== "Custom" ? "/mo" : ""}</span></p>
                  <p className="text-[11px] text-[#3D4654]">{p.reqs}</p>
                  <div className="mt-5 space-y-2.5">{p.features.map(f => <p key={f} className="text-[12px] text-[#5A6577]">— {f}</p>)}</div>
                  <button onClick={() => p.name === "Enterprise" ? window.location.href = "mailto:prathamg200404@gmail.com" : router.push("/login")} className={`mt-6 w-full py-2.5 rounded-xl text-[13px] font-medium transition-all ${p.primary ? "bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20" : "border border-white/[0.08] text-[#7A8599] hover:bg-white/[0.04]"}`}>{p.name === "Enterprise" ? "Contact sales" : "Start free"}</button>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="py-20">
          <FadeIn>
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#5B8DEF]/10 via-[#A78BFA]/10 to-[#4ADE80]/10 rounded-3xl blur-xl" />
              <div className="relative bg-[#12161E]/80 backdrop-blur border border-white/[0.06] rounded-3xl p-10 md:p-14 text-center max-w-[700px] mx-auto">
                <h2 className="text-[26px] md:text-[32px] font-bold shimmer-text">See it work on your queries</h2>
                <p className="text-[#5A6577] text-[14px] mt-4 max-w-[400px] mx-auto">The playground uses your real API key. Send a prompt, see the savings, send again for cache hit.</p>
                <div className="flex gap-3 justify-center mt-8">
                  <ShimmerButton onClick={() => router.push("/playground")}>Open playground</ShimmerButton>
                  <button onClick={() => router.push("/docs")} className="px-7 py-3 text-[#7A8599] border border-white/[0.08] rounded-xl text-[14px] hover:bg-white/[0.04] transition-all">Documentation</button>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>
      </div>

      <footer className="relative z-10 border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-md flex items-center justify-center text-white font-bold text-[9px]">TS</div>
                <span className="text-[14px] font-semibold">TokenSave</span>
              </div>
              <p className="text-[12px] text-[#3D4654] leading-relaxed">AI API cost optimization middleware. Open source.</p>
            </div>
            <div>
              <p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">Product</p>
              <div className="space-y-2">{[{ l: "Playground", h: "/playground" }, { l: "Dashboard", h: "/dashboard" }, { l: "Status", h: "/status" }, { l: "Changelog", h: "/changelog" }].map(a => <a key={a.l} href={a.h} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors">{a.l}</a>)}</div>
            </div>
            <div>
              <p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">Developers</p>
              <div className="space-y-2">{[{ l: "Docs", h: "/docs" }, { l: "API Reference", h: "/docs/api-reference" }, { l: "Security", h: "/security" }, { l: "GitHub", h: "https://github.com/Prathamg042004/tokensave" }].map(a => <a key={a.l} href={a.h} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors">{a.l}</a>)}</div>
            </div>
            <div>
              <p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">Connect</p>
              <div className="space-y-2">{[{ l: "Email", h: "mailto:prathamg200404@gmail.com" }, { l: "LinkedIn", h: "https://linkedin.com" }, { l: "Twitter", h: "https://twitter.com" }].map(a => <a key={a.l} href={a.h} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors">{a.l}</a>)}</div>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-6 text-center"><p className="text-[11px] text-[#3D4654]">© 2026 TokenSave. All rights reserved. Built with 💙 in India.</p></div>
        </div>
      </footer>
    </div>
  );
}