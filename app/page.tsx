"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { ProviderLogo } from "./icons";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold }); o.observe(el); return () => o.disconnect(); }, [threshold]);
  return { ref, v };
}

function FadeUp({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, v } = useInView();
  return <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(40px)", transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>{children}</div>;
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = 800;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.4 + 0.1 });
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx!.fillStyle = `rgba(91,141,239,${p.o})`; ctx!.fill(); });
      for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) { const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.sqrt(dx * dx + dy * dy); if (d < 120) { ctx!.beginPath(); ctx!.moveTo(particles[i].x, particles[i].y); ctx!.lineTo(particles[j].x, particles[j].y); ctx!.strokeStyle = `rgba(91,141,239,${0.06 * (1 - d / 120)})`; ctx!.stroke(); } }
      animId = requestAnimationFrame(draw);
    }
    draw();
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = 800; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full pointer-events-none" style={{ height: 800 }} />;
}

function OrbitingLogos() {
  return (
    <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
      <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
      <div className="absolute inset-[15%] rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[35%] rounded-full border border-[#5B8DEF]/10" />
      <div className="absolute inset-[40%] rounded-full bg-gradient-to-br from-[#5B8DEF]/20 to-[#A78BFA]/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto shadow-xl shadow-[#5B8DEF]/30">TS</div>
          <p className="text-[10px] text-[#5A6577] mt-2">TokenSave</p>
        </div>
      </div>
      {[
        { provider: "anthropic", name: "Claude", angle: 0, speed: 20, radius: "2%", color: "#D4A574" },
        { provider: "openai", name: "GPT", angle: 90, speed: 25, radius: "2%", color: "#74AA9C" },
        { provider: "google", name: "Gemini", angle: 180, speed: 30, radius: "2%", color: "#4285F4" },
        { provider: "groq", name: "Groq", angle: 270, speed: 22, radius: "2%", color: "#F55036" },
      ].map((p, i) => (
        <div key={p.provider} className="absolute inset-0" style={{ animation: `spin ${p.speed}s linear infinite`, animationDelay: `${-p.speed * (p.angle / 360)}s` }}>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: p.radius }}>
            <div className="flex flex-col items-center" style={{ animation: `counter-spin ${p.speed}s linear infinite`, animationDelay: `${-p.speed * (p.angle / 360)}s` }}>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border backdrop-blur-sm hover:scale-110 transition-transform cursor-default" style={{ backgroundColor: p.color + "10", borderColor: p.color + "30", boxShadow: `0 0 20px ${p.color}15` }}>
                <ProviderLogo provider={p.provider} size={24} />
              </div>
              <span className="text-[10px] mt-1 font-medium" style={{ color: p.color }}>{p.name}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnimatedTerminal() {
  const lines = [
    { t: '$ curl -X POST tokensave.vercel.app/api/proxy \\', c: "#E8ECF4", d: 0 },
    { t: '  -d \'{"provider":"anthropic","messages":[...]}\'', c: "#5A6577", d: 400 },
    { t: '', c: "", d: 700 },
    { t: '⟩ Analyzing complexity... simple (6 words)', c: "#5A6577", d: 1000 },
    { t: '⟩ Routing → claude-haiku (66% cheaper than sonnet)', c: "#5B8DEF", d: 1500 },
    { t: '⟩ Compressed: removed 3 filler tokens', c: "#E8B94B", d: 2000 },
    { t: '⟩ Cache: MISS — forwarding to Anthropic...', c: "#F472B6", d: 2500 },
    { t: '', c: "", d: 3000 },
    { t: '✓ "The capital of Japan is Tokyo."', c: "#4ADE80", d: 3500 },
    { t: '  model: claude-haiku | cost: $0.0004 | saved: 66%', c: "#4ADE80", d: 3800 },
    { t: '', c: "", d: 4300 },
    { t: '$ # Sending exact same request again...', c: "#5A6577", d: 4800 },
    { t: '', c: "", d: 5100 },
    { t: '⚡ CACHE HIT — instant response', c: "#4ADE80", d: 5500 },
    { t: '  cost: $0.0000 | latency: 12ms | saved: 100%', c: "#E8B94B", d: 5800 },
  ];
  const [shown, setShown] = useState<typeof lines>([]);
  const { ref, v } = useInView(0.3);
  useEffect(() => { if (!v) return; const ts = lines.map((l, i) => setTimeout(() => setShown(p => [...p, l]), l.d)); return () => ts.forEach(clearTimeout); }, [v]);

  return (
    <div ref={ref} className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#5B8DEF] via-[#A78BFA] to-[#E8B94B] rounded-2xl opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-500" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#5B8DEF] via-[#A78BFA] to-[#4ADE80] rounded-2xl opacity-15 animate-gradient-rotate" />
      <div className="relative bg-[#0D1117] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-125 transition-all cursor-default" /><div className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-125 transition-all cursor-default" /><div className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-125 transition-all cursor-default" />
          <span className="ml-3 text-[11px] text-[#3D4654] font-mono">terminal — tokensave live demo</span>
          <div className="ml-auto flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse" /><span className="text-[9px] text-[#4ADE80]">LIVE</span></div>
        </div>
        <div className="p-5 font-mono text-[11px] md:text-[12px] leading-[1.9] min-h-[320px] overflow-hidden">
          {shown.map((l, i) => <div key={i} className="animate-line" style={{ color: l.c, animationDelay: `${i * 0.05}s` }}>{l.t || "\u00A0"}</div>)}
          {v && shown.length < lines.length && <span className="inline-block w-2 h-[18px] bg-[#5B8DEF] animate-blink ml-0.5" />}
        </div>
      </div>
    </div>
  );
}

function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouse = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.02)`;
  }, []);
  const handleLeave = useCallback(() => { if (ref.current) ref.current.style.transform = "perspective(800px) rotateY(0) rotateX(0) scale(1)"; }, []);
  return <div ref={ref} onMouseMove={handleMouse} onMouseLeave={handleLeave} className={`transition-transform duration-200 ${className}`}>{children}</div>;
}

function Counter({ end, suffix, label, color }: { end: number; suffix: string; label: string; color: string }) {
  const [val, setVal] = useState(0);
  const { ref, v } = useInView(0.5);
  useEffect(() => { if (!v) return; let t = 0; const dur = 1500; const start = performance.now(); const anim = (now: number) => { t = Math.min((now - start) / dur, 1); const ease = 1 - Math.pow(1 - t, 4); setVal(Math.floor(ease * end)); if (t < 1) requestAnimationFrame(anim); }; requestAnimationFrame(anim); }, [v, end]);
  return <div ref={ref} className="text-center"><p className="text-[44px] md:text-[56px] font-bold tracking-tight" style={{ color }}>{val}{suffix}</p><p className="text-[13px] text-[#5A6577] mt-1">{label}</p></div>;
}

function FlowLine() {
  const { ref, v } = useInView();
  return (
    <svg ref={ref as any} viewBox="0 0 800 200" className="w-full h-auto" style={{ opacity: v ? 1 : 0, transition: "opacity 0.8s" }}>
      <defs>
        <linearGradient id="flow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5B8DEF" /><stop offset="50%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#4ADE80" /></linearGradient>
        <filter id="glow2"><feGaussianBlur stdDeviation="4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="20" y="70" width="140" height="60" rx="12" fill="#12161E" stroke="#5B8DEF33" />
      <text x="90" y="98" textAnchor="middle" fill="#E8ECF4" fontSize="14" fontWeight="600" fontFamily="system-ui">Your App</text>
      <text x="90" y="118" textAnchor="middle" fill="#5A6577" fontSize="10" fontFamily="system-ui">sends request</text>
      <rect x="280" y="40" width="200" height="120" rx="14" fill="#12161E" stroke="url(#flow)" strokeWidth="1.5" />
      <text x="380" y="68" textAnchor="middle" fill="#5B8DEF" fontSize="13" fontWeight="700" fontFamily="system-ui">TokenSave</text>
      <text x="380" y="90" textAnchor="middle" fill="#4ADE80" fontSize="11" fontFamily="system-ui">Cache · Route · Compress</text>
      <text x="380" y="110" textAnchor="middle" fill="#E8B94B" fontSize="11" fontFamily="system-ui">Fallback · Quality modes</text>
      <text x="380" y="135" textAnchor="middle" fill="#A78BFA" fontSize="9" fontFamily="system-ui">avg 40% savings</text>
      {[{ name: "Claude", y: 35, color: "#D4A574" }, { name: "GPT", y: 75, color: "#74AA9C" }, { name: "Gemini", y: 115, color: "#4285F4" }, { name: "Groq", y: 155, color: "#F55036" }].map(p => (
        <g key={p.name}><rect x="600" y={p.y} width="120" height="30" rx="8" fill="#12161E" stroke={p.color + "44"} /><circle cx="618" cy={p.y + 15} r="5" fill={p.color} /><text x="670" y={p.y + 19} textAnchor="middle" fill={p.color} fontSize="12" fontWeight="500" fontFamily="system-ui">{p.name}</text></g>
      ))}
      <path d="M160 100 L280 100" stroke="url(#flow)" strokeWidth="2" strokeDasharray="6,4" filter="url(#glow2)">{v && <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" fill="freeze" />}</path>
      {[35, 75, 115, 155].map((y, i) => <path key={i} d={`M480 100 L600 ${y + 15}`} stroke={["#D4A574", "#74AA9C", "#4285F4", "#F55036"][i] + "44"} strokeWidth="1.5" strokeDasharray="4,4">{v && <animate attributeName="stroke-dashoffset" from="60" to="0" dur="1.5s" begin={`${0.3 + i * 0.15}s`} fill="freeze" />}</path>)}
      {v && <circle r="4" fill="#5B8DEF" filter="url(#glow2)"><animateMotion dur="2s" repeatCount="indefinite" path="M160 100 L280 100" /><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" /></circle>}
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#E8ECF4] overflow-hidden">
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes gradient-rotate { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        .animate-blink { animation: blink 0.8s step-end infinite; }
        .animate-gradient-rotate { animation: gradient-rotate 8s linear infinite; }
        .animate-line { animation: slideIn 0.3s ease forwards; opacity: 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .cursor-glow { position: fixed; width: 300px; height: 300px; border-radius: 50%; pointer-events: none; z-index: 0; background: radial-gradient(circle, rgba(91,141,239,0.06) 0%, transparent 70%); transition: left 0.3s ease, top 0.3s ease; }
      `}</style>

      <div className="cursor-glow" style={{ left: mousePos.x - 150, top: mousePos.y - 150 }} />
      <ParticleField />

      <nav className="sticky top-0 z-50 bg-[#0A0D12]/60 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1200px] mx-auto">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20 group-hover:shadow-[#5B8DEF]/40 transition-shadow">TS</div>
            <span className="text-[17px] font-semibold tracking-tight">TokenSave</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            {["Playground", "Docs", "Security", "Changelog", "GitHub"].map(n => (
              <a key={n} href={n === "GitHub" ? "https://github.com/Prathamg042004/tokensave" : `/${n.toLowerCase()}`} className="text-[13px] text-[#5A6577] hover:text-white transition-colors relative group">
                {n}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#5B8DEF] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => router.push("/login")} className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Sign in</button>
            <button onClick={() => router.push("/login")} className="relative px-5 py-2 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-lg text-[13px] font-medium overflow-hidden group shadow-lg shadow-[#5B8DEF]/20 hover:shadow-[#5B8DEF]/40 transition-shadow">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative">Start free</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12">

        <section className="pt-16 md:pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <div className="inline-flex items-center gap-2 bg-[#5B8DEF]/5 border border-[#5B8DEF]/15 rounded-full px-4 py-1.5 mb-6">
                <div className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse" /><span className="text-[12px] text-[#7A8599]">Open source · v3.1 · 4 providers</span>
              </div>
              <h1 className="text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-tight">
                Stop overpaying<br />for <span className="bg-gradient-to-r from-[#5B8DEF] via-[#A78BFA] to-[#4ADE80] bg-clip-text text-transparent">AI API calls</span>
              </h1>
              <p className="text-[#7A8599] text-[17px] leading-[1.7] mt-6 max-w-[440px]">Middleware that automatically caches, routes, and compresses every request between your app and AI providers.</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button onClick={() => router.push("/playground")} className="relative px-7 py-3.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[15px] font-semibold overflow-hidden group shadow-xl shadow-[#5B8DEF]/25 hover:shadow-[#5B8DEF]/40 transition-shadow">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">Open playground</span>
                </button>
                <button onClick={() => router.push("/docs")} className="px-7 py-3.5 text-[#7A8599] rounded-xl text-[15px] border border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all">Read docs</button>
              </div>
            </FadeUp>
            <FadeUp delay={0.3} className="flex justify-center">
              <OrbitingLogos />
            </FadeUp>
          </div>
        </section>

        <section className="py-16 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Counter end={13} suffix="+" label="AI models supported" color="#5B8DEF" />
            <Counter end={40} suffix="%" label="Average savings" color="#4ADE80" />
            <Counter end={100} suffix="%" label="Cache hit savings" color="#E8B94B" />
            <Counter end={12} suffix="ms" label="Cache response time" color="#A78BFA" />
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeUp><h2 className="text-[30px] md:text-[38px] font-bold tracking-tight text-center">Watch a request get optimized</h2><p className="text-[#5A6577] text-[15px] text-center mt-3 mb-12">Real-time view of what happens inside the TokenSave pipeline.</p></FadeUp>
          <FadeUp delay={0.2}><div className="max-w-[700px] mx-auto"><AnimatedTerminal /></div></FadeUp>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeUp><h2 className="text-[30px] md:text-[38px] font-bold tracking-tight text-center mb-12">The optimization pipeline</h2></FadeUp>
          <FadeUp delay={0.2}><div className="max-w-[850px] mx-auto bg-[#12161E]/50 backdrop-blur border border-white/[0.06] rounded-2xl p-6"><FlowLine /></div></FadeUp>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeUp><h2 className="text-[30px] md:text-[38px] font-bold tracking-tight mb-10">Six layers of optimization</h2></FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {[
              { t: "Semantic cache", d: "Identical queries return cached responses. Zero API cost, 12ms latency.", m: "100% savings", c: "#4ADE80", s: "md:col-span-4" },
              { t: "Smart routing", d: "Simple → cheap model. Complex → smart model. When unsure → always smart.", m: "Up to 66% cheaper", c: "#5B8DEF", s: "md:col-span-2" },
              { t: "Compression", d: "Strips filler phrases while preserving meaning and intent.", m: "5-15% fewer tokens", c: "#E8B94B", s: "md:col-span-2" },
              { t: "Auto-fallback", d: "Rate limited? Automatically switches to your backup provider.", m: "Zero downtime", c: "#F472B6", s: "md:col-span-2" },
              { t: "Quality modes", d: "auto · max_savings · max_quality — you choose the tradeoff.", m: "Full control", c: "#A78BFA", s: "md:col-span-2" },
              { t: "Context summary", d: "Compresses long conversations by 88%. Built for heavy users.", m: "50→6 messages", c: "#FB923C", s: "md:col-span-3" },
            ].map((f, i) => (
              <FadeUp key={i} delay={i * 0.08} className={f.s}>
                <TiltCard className="h-full">
                  <div className="h-full bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.15] transition-all group">
                    <div className="flex items-center gap-2.5 mb-3"><div className="w-3 h-3 rounded-full group-hover:scale-150 transition-transform duration-300" style={{ backgroundColor: f.c, boxShadow: `0 0 15px ${f.c}40` }} /><h3 className="text-[15px] font-semibold">{f.t}</h3></div>
                    <p className="text-[12px] text-[#5A6577] leading-relaxed">{f.d}</p>
                    <p className="text-[12px] font-semibold mt-3" style={{ color: f.c }}>{f.m}</p>
                  </div>
                </TiltCard>
              </FadeUp>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeUp>
            <h2 className="text-[30px] md:text-[38px] font-bold tracking-tight text-center mb-8">One line change</h2>
            <div className="max-w-[650px] mx-auto relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#5B8DEF]/15 via-[#A78BFA]/15 to-[#4ADE80]/15 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative bg-[#0D1117] border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5"><div className="w-3 h-3 rounded-full bg-[#FF5F57]" /><div className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><div className="w-3 h-3 rounded-full bg-[#28C840]" /><span className="ml-3 text-[10px] text-[#3D4654] font-mono">your-app.js</span></div>
                <div className="p-6 font-mono text-[14px] leading-[2.2]">
                  <span className="text-[#3D4654]">// Before</span><br />
                  <span className="text-[#5A6577]">fetch(</span><span className="text-[#FF6B6B]/50 line-through">&quot;https://api.anthropic.com/v1/messages&quot;</span><span className="text-[#5A6577]">)</span><br /><br />
                  <span className="text-[#3D4654]">// After</span><br />
                  <span className="text-[#5A6577]">fetch(</span><span className="text-[#4ADE80]">&quot;https://tokensave.vercel.app/api/proxy&quot;</span><span className="text-[#5A6577]">)</span>
                </div>
              </div>
            </div>
          </FadeUp>
        </section>

        <section className="py-20 border-t border-white/[0.04]">
          <FadeUp><h2 className="text-[30px] md:text-[38px] font-bold tracking-tight text-center mb-10">Pricing</h2></FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-[900px] mx-auto">
            {[
              { n: "Starter", p: "$99", r: "50K requests", f: ["Cache + routing + compression", "4 providers, 13 models", "Dashboard analytics", "Email support"], primary: false },
              { n: "Growth", p: "$499", r: "500K requests", f: ["Everything in Starter", "Quality modes", "Team management", "Auto-fallback chains", "Priority support"], primary: true },
              { n: "Enterprise", p: "Custom", r: "Unlimited", f: ["Everything in Growth", "Custom routing rules", "Dedicated manager", "SLA guarantee", "Invoice billing"], primary: false },
            ].map((p, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <TiltCard className="h-full">
                  <div className={`relative h-full bg-[#12161E]/60 backdrop-blur border rounded-2xl p-6 ${p.primary ? "border-[#5B8DEF]/30 shadow-xl shadow-[#5B8DEF]/10" : "border-white/[0.06]"}`}>
                    {p.primary && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white text-[10px] font-semibold px-3 py-1 rounded-full shadow-lg">Recommended</div>}
                    <p className="text-[13px] text-[#5A6577]">{p.n}</p>
                    <p className="text-[36px] font-bold mt-1">{p.p}<span className="text-[14px] text-[#3D4654] font-normal">{p.p !== "Custom" ? "/mo" : ""}</span></p>
                    <p className="text-[11px] text-[#3D4654]">{p.r}</p>
                    <div className="mt-5 space-y-2.5">{p.f.map(f => <p key={f} className="text-[12px] text-[#5A6577]">— {f}</p>)}</div>
                    <button onClick={() => p.n === "Enterprise" ? window.location.href = "mailto:prathamg200404@gmail.com" : router.push("/login")} className={`mt-6 w-full py-3 rounded-xl text-[13px] font-medium transition-all ${p.primary ? "bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white hover:opacity-90 shadow-lg shadow-[#5B8DEF]/20" : "border border-white/[0.08] text-[#7A8599] hover:bg-white/[0.04]"}`}>{p.n === "Enterprise" ? "Contact sales" : "Start free"}</button>
                  </div>
                </TiltCard>
              </FadeUp>
            ))}
          </div>
        </section>

        <section className="py-20">
          <FadeUp>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#5B8DEF]/10 via-[#A78BFA]/10 to-[#4ADE80]/10 rounded-[2rem] blur-2xl animate-pulse" />
              <div className="relative bg-[#12161E]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-10 md:p-16 text-center max-w-[700px] mx-auto">
                <h2 className="text-[28px] md:text-[34px] font-bold bg-gradient-to-r from-[#5B8DEF] via-[#A78BFA] to-[#4ADE80] bg-clip-text text-transparent">See it work on your queries</h2>
                <p className="text-[#5A6577] text-[15px] mt-4">Send a prompt, see the optimization, send again for cache hit.</p>
                <div className="flex gap-3 justify-center mt-8">
                  <button onClick={() => router.push("/playground")} className="relative px-8 py-3.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[15px] font-semibold overflow-hidden group shadow-xl shadow-[#5B8DEF]/25">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative">Open playground</span>
                  </button>
                </div>
              </div>
            </div>
          </FadeUp>
        </section>
      </div>

      <footer className="relative z-10 border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div><div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-[10px]">TS</div><span className="text-[14px] font-semibold">TokenSave</span></div><p className="text-[12px] text-[#3D4654]">AI API cost optimization. Open source.</p></div>
            <div><p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">Product</p>{["Playground", "Dashboard", "Status", "Changelog"].map(l => <a key={l} href={`/${l.toLowerCase()}`} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors py-1">{l}</a>)}</div>
            <div><p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">Developers</p>{[{ l: "Docs", h: "/docs" }, { l: "API Reference", h: "/docs/api-reference" }, { l: "Security", h: "/security" }, { l: "GitHub", h: "https://github.com/Prathamg042004/tokensave" }].map(a => <a key={a.l} href={a.h} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors py-1">{a.l}</a>)}</div>
            <div><p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">Connect</p>{[{ l: "Email", h: "mailto:prathamg200404@gmail.com" }, { l: "LinkedIn", h: "https://linkedin.com" }, { l: "Twitter", h: "https://twitter.com" }].map(a => <a key={a.l} href={a.h} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors py-1">{a.l}</a>)}</div>
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[11px] text-[#3D4654]">© 2026 TokenSave. All rights reserved.</p>
            <div className="flex gap-4">{["anthropic", "openai", "google", "groq"].map(p => <div key={p} className="opacity-30 hover:opacity-80 transition-opacity"><ProviderLogo provider={p} size={20} /></div>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}