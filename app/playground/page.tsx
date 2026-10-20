"use client";
import { useState, useRef, useEffect, useCallback, DragEvent } from "react";
import { ProviderLogo } from "../icons";

function extractText(r: any, p: string): string {
  try {
    if (r.error) { const m = typeof r.error === "string" ? r.error : r.error.message || JSON.stringify(r.error); if (m.toLowerCase().match(/quota|rate|limit|429/)) return "QUOTA"; if (m.toLowerCase().match(/invalid|unauthorized|401/)) return "AUTH"; return "ERR:" + m; }
    if (p === "anthropic" && r.content?.[0]) return r.content[0].text;
    if ((p === "openai" || p === "groq") && r.choices?.[0]) return r.choices[0].message.content;
    if (p === "google" && r.candidates?.[0]) return r.candidates[0].content.parts[0].text;
  } catch {} return "";
}

const PRICING: any = { "claude-haiku-4-5-20251001": [0.8, 4], "claude-sonnet-4-6": [3, 15], "gpt-4o-mini": [0.15, 0.6], "gpt-4o": [2.5, 10], "gemini-2.0-flash-lite": [0.075, 0.3], "gemini-2.0-flash": [0.15, 0.6], "llama-3.1-8b-instant": [0.05, 0.08], "llama-3.3-70b-versatile": [0.59, 0.79] };
const tokens = (s: string) => Math.ceil((s || "").length / 4);
const cost = (model: string, inT: number, outT: number) => { const p = PRICING[model] || [1, 5]; return (inT * p[0] + outT * p[1]) / 1000000; };
const expModel = (p: string) => p === "anthropic" ? "claude-sonnet-4-6" : p === "openai" ? "gpt-4o" : p === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash";

const PROVIDERS = [
  { id: "anthropic", name: "Claude", color: "#D4A574", models: "Haiku · Sonnet" },
  { id: "openai", name: "GPT", color: "#74AA9C", models: "4o Mini · 4o" },
  { id: "google", name: "Gemini", color: "#4285F4", models: "Flash family" },
  { id: "groq", name: "Groq", color: "#F55036", models: "Llama models", free: false },
];

const TEMPLATES = [
  { label: "Simple Q&A", icon: "💬", prompt: "What is the capital of Japan?" },
  { label: "Write code", icon: "🧑‍💻", prompt: "Write a Python function that finds the top 3 largest values in a list." },
  { label: "Summarize", icon: "📝", prompt: "Summarize the following text in 3 bullet points:\n\n[Paste text here]" },
  { label: "Draft email", icon: "✉️", prompt: "Write a professional email explaining a 2-week project delay to a client." },
  { label: "Translate", icon: "🌐", prompt: "Translate to Spanish:\n\nHello, I hope you are having a wonderful day." },
  { label: "Analyze", icon: "📊", prompt: "Analyze this data and provide 3 key insights:\n\n[Paste data here]" },
];

function StreamText({ text }: { text: string }) { return <span>{text}</span>; }

function DragDropZone({ onFile, fileName, onRemove }: { onFile: (name: string, content: string) => void; fileName: string; onRemove: () => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e: DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragOut = useCallback((e: DragEvent) => { e.preventDefault(); setDragging(false); }, []);
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { let t = ev.target?.result as string; if (t.length > 50000) t = t.slice(0, 50000); onFile(file.name, t); };
    reader.readAsText(file);
  }, [onFile]);
  const handleInput = (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { let t = ev.target?.result as string; if (t.length > 50000) t = t.slice(0, 50000); onFile(file.name, t); };
    reader.readAsText(file);
  };

  if (fileName) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#5B8DEF]/5 border border-[#5B8DEF]/15 rounded-xl">
        <div className="w-8 h-8 bg-[#5B8DEF]/10 rounded-lg flex items-center justify-center text-[#5B8DEF] text-sm">📎</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#5B8DEF] font-medium truncate">{fileName}</p>
          <p className="text-[10px] text-[#5A6577]">Attached to prompt</p>
        </div>
        <button onClick={onRemove} className="text-[#5A6577] hover:text-[#FF5F57] transition-colors text-xs px-2 py-1 rounded hover:bg-[#FF5F57]/10">Remove</button>
      </div>
    );
  }

  return (
    <div onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop} role="button" tabIndex={0} aria-label="Attach a text file" onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }} onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${dragging ? "border-[#5B8DEF] bg-[#5B8DEF]/5" : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"}`}>
      <input ref={inputRef} type="file" accept=".txt,.csv,.json,.md,.html,.xml,.log,.py,.js,.ts" onChange={handleInput} className="hidden" />
      <div className="text-xl mb-1">{dragging ? "📥" : "📎"}</div>
      <p className="text-[12px] text-[#5A6577]">{dragging ? "Drop file here" : "Drag & drop or click to attach"}</p>
      <p className="text-[10px] text-[#3D4654] mt-1">TXT, CSV, JSON, MD, code files · First 50,000 characters included</p>
    </div>
  );
}

export default function Playground() {
  const [requestError, setRequestError] = useState("");
  const requestBusy = useRef(false);
  const [mode, setMode] = useState("single");
  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [file, setFile] = useState("");
  const [fileName, setFileName] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatIn, setChatIn] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [cmp2, setCmp2] = useState("anthropic");
  const [cmpKey2, setCmpKey2] = useState("");
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpResult, setCmpResult] = useState<any>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);
  useEffect(() => { try { const k = Object.keys(localStorage).filter(k => k.startsWith("ts_keys_")); if (k.length > 0) { const s = JSON.parse(localStorage.getItem(k[0]) || "{}"); if (s[provider] && !apiKey) setApiKey(s[provider]); } } catch {} }, [provider]);

  const fullPrompt = file ? prompt + "\n\n--- " + fileName + " ---\n" + file : prompt;

  const send = async () => {
    if (requestBusy.current || !apiKey.trim() || !prompt.trim()) return;
    requestBusy.current = true; setRequestError("");
    setLoading(true); setResult(null); setShowRaw(false);
    const start = Date.now();
    try {
      const res = await fetch("/api/proxy", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: fullPrompt }] }) });
      const data = await res.json();
      const dur = Date.now() - start;
      const text = extractText(data, provider);
      const inT = tokens(fullPrompt), outT = tokens(text);
      const model = data.tokensave_meta?.model_used || "unknown";
      const without = cost(expModel(provider), inT, outT);
      const withC = data.tokensave_meta?.cache_hit ? 0 : cost(model, inT, outT);
      setResult({ text, meta: data.tokensave_meta, dur, inT, outT, without, withC, raw: JSON.stringify(data, null, 2) });
      setHistory(h => [{ prompt: prompt.slice(0, 40), cached: data.tokensave_meta?.cache_hit, model, dur }, ...h].slice(0, 15));
    } catch (e: any) { setResult({ text: "ERR:" + e.message }); }
    setLoading(false); requestBusy.current = false;
  };

  const sendChat = async () => {
    if (requestBusy.current || !apiKey.trim() || !chatIn.trim()) return;
    requestBusy.current = true; setRequestError("");
    const content = file ? chatIn + "\n\n--- " + fileName + " ---\n" + file : chatIn;
    const msgs = [...chatMsgs, { role: "user", content }];
    setChatMsgs(msgs); setChatIn(""); setChatLoading(true);
    try {
      const res = await fetch("/api/proxy", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: msgs.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      setChatMsgs([...msgs, { role: "assistant", content: extractText(data, provider), meta: data.tokensave_meta }]);
    } catch (e: any) { setChatMsgs([...msgs, { role: "assistant", content: "Error: " + e.message }]); }
    setChatLoading(false); requestBusy.current = false;
  };

  const sendCompare = async () => {
    if (requestBusy.current || !apiKey.trim() || !cmpKey2.trim() || !prompt.trim()) return;
    requestBusy.current = true; setRequestError("");
    try {
    setCmpLoading(true); setCmpResult(null);
    const [r1, r2] = await Promise.all([
      fetch("/api/proxy", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: fullPrompt }] }) }).then(r => r.json()),
      fetch("/api/proxy", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: cmp2, apiKey: cmpKey2, messages: [{ role: "user", content: fullPrompt }] }) }).then(r => r.json()),
    ]);
    if (r1.error || r2.error) throw new Error("Provider request failed");
    const t1 = extractText(r1, provider), t2 = extractText(r2, cmp2);
    const m1 = r1.tokensave_meta?.model_used || "?", m2 = r2.tokensave_meta?.model_used || "?";
    setCmpResult({ a: { name: provider, text: t1, model: m1, cost: cost(m1, tokens(fullPrompt), tokens(t1)), meta: r1.tokensave_meta }, b: { name: cmp2, text: t2, model: m2, cost: cost(m2, tokens(fullPrompt), tokens(t2)), meta: r2.tokensave_meta } });
    } catch { setRequestError("Comparison could not complete. Check both provider keys, provider limits, and your connection."); }
    finally { setCmpLoading(false); requestBusy.current = false; }
  };

  const pName = (id: string) => PROVIDERS.find(p => p.id === id)?.name || id;
  const pColor = (id: string) => PROVIDERS.find(p => p.id === id)?.color || "#888";
  const isCache = result?.meta?.cache_hit;
  const savePct = result?.without > 0 ? Math.round(((result.without - result.withC) / result.without) * 100) : 0;

  return (
    <div className="playground-page min-h-screen bg-[#0A0D12] text-[#E8ECF4] overflow-hidden">
      <style jsx global>{`.playground-page{background:radial-gradient(ellipse at 75% 0,#9281d810,transparent 45%),#090d15!important;color:#edf1fa}.playground-page nav{background:#090d15ed!important;border-color:#293448!important}.playground-page nav>div{padding-top:23px;padding-bottom:23px}.playground-page nav a:first-child>div{background:linear-gradient(140deg,#a8d7d1,#b5a4ee)!important;color:#161a29;box-shadow:none}.playground-page nav a:first-child>span{font-size:21px}.playground-page>div{padding-top:42px}.pg-eyebrow{font-size:10px;letter-spacing:2px;color:#baa9ed;margin-bottom:13px}.pg-title{font-size:clamp(30px,4vw,46px);line-height:1.15;letter-spacing:-1.8px;font-weight:550}.pg-guide{display:flex;gap:32px;margin:28px 0 15px;padding:18px 0;border-top:1px solid #283347;border-bottom:1px solid #283347;color:#bbc6d9;font-size:12px}.pg-guide b{color:#bca9f2;font-size:10px;margin-right:9px;font-weight:500}.pg-notice{font-size:12px;color:#a7b7ce;margin:0 0 24px;line-height:1.8}.pg-notice a{color:#ccbaf9;margin-left:8px}.pg-connection{padding:23px!important;background:#121a27!important;border-color:#344056!important}.playground-page :is(input,textarea,select){color:#e8eef9!important}.playground-page :is(a,button,input,textarea,select,[role=button]):focus-visible{outline:2px solid #c8b9ff!important;outline-offset:4px}.playground-page textarea{min-height:195px;line-height:1.8}.playground-page [class*="text-[#3D4654]"]{color:#96a6bf}.playground-page [class*="text-[#5A6577]"]{color:#adbbd0}.playground-page [class*="text-[#7A8599]"]{color:#bbc6d8}.playground-page [class*="placeholder-"]::placeholder{color:#8e9db5}.playground-page [class*="border-white"]{border-color:#2b3547}.playground-page [class*="bg-[#12161E]"]{background-color:#111925}.playground-page button[aria-pressed=true]{border-color:#8b78ba!important;background:#c5b5f514!important;color:#e0d4ff!important}.playground-page button:disabled{cursor:not-allowed}.playground-page [class*="bg-gradient-to-r"][class*="text-white"]{background:linear-gradient(120deg,#b4a1ed,#a6c7db);color:#171b2b;box-shadow:none}.playground-page [class*="text-[9px]"],.playground-page [class*="text-[10px]"]{font-size:11px}.playground-page .pg-error{border:1px solid #825a4c;background:#30201d;padding:17px 20px;border-radius:12px;color:#f5c5b5;margin-bottom:20px}.playground-page .pulse-ring{animation:none}.playground-page [class*="p-12"]{min-height:340px;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(ellipse at center,#a991eb0a,transparent 75%),#111925}.playground-page [class*="p-12"]>p{max-width:370px;margin-left:auto;margin-right:auto}.playground-page .lg\:col-span-2,.playground-page .lg\:col-span-3{min-width:0}.playground-page [class*="space-y-4"]{animation:pg-reveal .35s ease both}@keyframes pg-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@media(max-width:640px){.pg-guide{gap:14px;flex-wrap:wrap}.pg-guide span{font-size:11px}.pg-connection{padding:16px!important}.playground-page [class*="min-w-[260px]"]{min-width:0;width:100%}.playground-page>div{padding-left:20px;padding-right:20px}.playground-page [class*="p-12"]{padding:28px}.playground-page [class*="max-w-[75%]"]{max-width:92%}}@media(prefers-reduced-motion:reduce){.playground-page *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(91,141,239,0.3); } 70% { box-shadow: 0 0 0 8px rgba(91,141,239,0); } 100% { box-shadow: 0 0 0 0 rgba(91,141,239,0); } }
        .pulse-ring { animation: pulse-ring 2s infinite; }
      `}</style>

      <nav className="sticky top-0 z-50 bg-[#0A0D12]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1300px] mx-auto">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20">TS</div>
            <span className="text-[17px] font-semibold tracking-tight">TokenSave</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/docs" className="text-[13px] text-[#5A6577] hover:text-white transition-colors hidden sm:block">Docs</a>
            <a href="/dashboard" className="text-[13px] text-[#5A6577] hover:text-white transition-colors">Dashboard</a>
          </div>
        </div>
      </nav>

      <div className="max-w-[1300px] mx-auto px-6 lg:px-12 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <p className="pg-eyebrow">BUILD WITH EVIDENCE</p><h1 className="pg-title">Your prompt. In perspective.</h1>
            <p className="text-[#5A6577] text-[14px] mt-1">One workspace to explore responses, routing, and caching.</p>
          </div>
          <div className="flex bg-[#12161E] border border-white/[0.06] rounded-xl p-1 gap-1">
            {[{ id: "single", l: "Prompt", icon: "⚡" }, { id: "chat", l: "Chat", icon: "💬" }, { id: "compare", l: "Compare", icon: "⚖️" }].map(m => (
              <button key={m.id} aria-pressed={mode === m.id} disabled={loading || chatLoading || cmpLoading} onClick={() => setMode(m.id)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 ${mode === m.id ? "bg-gradient-to-r from-[#5B8DEF]/20 to-[#A78BFA]/20 text-white shadow-inner" : "text-[#5A6577] hover:text-white"}`}>{m.icon} {m.l}</button>
            ))}
          </div>
        </div>

        <div className="pg-guide"><span><b>01</b> Connect a provider</span><span><b>02</b> Try a real prompt</span><span><b>03</b> Inspect the response</span></div><div className="pg-notice">Provider usage charges apply. Prompts and keys are processed by the hosted proxy. <a href="/security">Review data handling →</a></div>
        <div className="pg-connection bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-2 block">Provider</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PROVIDERS.map(p => (
                  <button key={p.id} aria-pressed={provider === p.id} disabled={loading || chatLoading || cmpLoading} onClick={() => { setProvider(p.id); setApiKey(""); if (cmp2 === p.id) { setCmp2(provider); setCmpKey2(""); } }} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${provider === p.id ? "border-white/[0.15] bg-white/[0.05] shadow-lg" : "border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.02]"}`} style={provider === p.id ? { boxShadow: `0 0 15px ${p.color}15` } : {}}>
                    <ProviderLogo provider={p.id} size={22} />
                    <div className="text-left">
                      <p className="text-[12px] font-medium" style={{ color: provider === p.id ? p.color : "#7A8599" }}>{p.name}</p>
                      <p className="text-[9px] text-[#3D4654]">{p.models}</p>
                    </div>
                    {p.free && <span className="ml-auto text-[8px] text-[#4ADE80] bg-[#4ADE80]/10 px-1.5 py-0.5 rounded-full font-semibold">FREE</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[260px]">
              <label className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-2 block">API Key</label>
              <input aria-label="Provider API key" autoComplete="off" type="password" placeholder="Paste your provider key" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full px-4 py-3 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#3D4654] focus:outline-none focus:border-[#5B8DEF]/40 transition-colors" />
            </div>
            {mode === "compare" && (
              <>
                <div className="min-w-[160px]">
                  <label className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-2 block">Compare with</label>
                  <select value={cmp2} aria-label="Second provider" onChange={e => { setCmp2(e.target.value); setCmpKey2(""); }} className="w-full px-3 py-3 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] focus:outline-none">
                    {PROVIDERS.filter(p => p.id !== provider).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-2 block">Second key</label>
                  <input aria-label="Second provider API key" autoComplete="off" type="password" placeholder="Second provider key" value={cmpKey2} onChange={e => setCmpKey2(e.target.value)} className="w-full px-4 py-3 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[13px] text-[#E8ECF4] placeholder-[#3D4654] focus:outline-none focus:border-[#5B8DEF]/40 transition-colors" />
                </div>
              </>
            )}
          </div>
        </div>

        {requestError && <div className="pg-error" role="alert">{requestError}</div>}
        {result?.text?.startsWith("ERR:") && <div className="pg-error" role="alert">Request failed. {result.text.slice(4)}</div>}
        {mode === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => { setPrompt(t.prompt); textRef.current?.focus(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12161E] border border-white/[0.05] rounded-lg text-[11px] text-[#5A6577] hover:border-[#5B8DEF]/30 hover:text-[#5B8DEF] transition-all">
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>

              <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden">
                <textarea aria-label="Prompt" ref={textRef} placeholder="Type your prompt or pick a template..." value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} rows={7} className="w-full bg-transparent px-5 pt-5 pb-2 text-[14px] text-[#E8ECF4] placeholder-[#3D4654] resize-none focus:outline-none leading-relaxed" />
                <div className="px-5 pb-3">
                  <DragDropZone onFile={(name, content) => { setFileName(name); setFile(content); }} fileName={fileName} onRemove={() => { setFile(""); setFileName(""); }} />
                </div>
                <div className="flex justify-between items-center px-5 py-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#3D4654]">~{tokens(fullPrompt)} tokens</span>
                    <span className="text-[10px] text-[#3D4654]">Ctrl+Enter to send</span>
                  </div>
                  <button onClick={send} disabled={loading || !apiKey || !prompt} className="relative px-6 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold disabled:opacity-30 overflow-hidden group shadow-lg shadow-[#5B8DEF]/20 transition-all hover:shadow-[#5B8DEF]/40">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">{loading ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</> : "Run prompt →"}</span>
                  </button>
                </div>
              </div>

              {history.length > 0 && (
                <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-4">
                  <p className="text-[10px] text-[#5A6577] uppercase tracking-wider mb-3">Recent requests</p>
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                      <span className="text-[12px] text-[#5A6577] truncate flex-1 mr-3">{h.prompt}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {h.cached ? <span className="text-[9px] text-[#4ADE80] bg-[#4ADE80]/10 px-2 py-0.5 rounded-full font-medium">Cached</span> : <span className="text-[9px] text-[#5A6577] bg-white/[0.03] px-2 py-0.5 rounded-full">{h.model}</span>}
                        <span className="text-[10px] text-[#3D4654] w-12 text-right">{h.dur}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-4">
              {result?.meta && (
                <div className={`border rounded-2xl p-5 transition-all ${isCache ? "bg-[#4ADE80]/[0.03] border-[#4ADE80]/20" : "bg-[#12161E]/60 border-white/[0.06]"}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {[
                      { l: "Cache", v: isCache ? "HIT ✓" : "MISS", c: isCache ? "#4ADE80" : "#5A6577" },
                      { l: "Model", v: result.meta.model_used || "Cached", c: "#5B8DEF" },
                      { l: "Complexity", v: result.meta.complexity || "—", c: "#A78BFA" },
                      { l: "Latency", v: result.dur + "ms", c: "#E8B94B" },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0A0D12]/60 rounded-xl p-3 text-center">
                        <p className="text-[9px] text-[#3D4654] uppercase tracking-wider">{s.l}</p>
                        <p className="text-[14px] font-semibold font-mono mt-1" style={{ color: s.c }}>{s.v}</p>
                      </div>
                    ))}
                  </div>

                  {result.without !== undefined && (
                    <div className="bg-[#0A0D12]/60 rounded-xl p-4"><p className="text-[11px] text-[#7A8599] mb-3">Illustrative cost estimate using approximate token counts and configured rates. Baseline assumes a higher-tier model, not your actual bill.</p>
                      <div className="flex items-center justify-between mb-3">
                        <div><p className="text-[9px] text-[#3D4654] uppercase">Estimated baseline</p><p className="text-[18px] font-bold text-[#FF6B6B]/60 line-through">${result.without.toFixed(6)}</p></div>
                        <div className="text-[#3D4654] text-2xl">→</div>
                        <div><p className="text-[9px] text-[#3D4654] uppercase">Estimated request</p><p className="text-[18px] font-bold text-[#4ADE80]">${result.withC.toFixed(6)}</p></div>
                        <div className="bg-gradient-to-r from-[#4ADE80]/10 to-[#5B8DEF]/10 border border-[#4ADE80]/20 rounded-xl px-4 py-2 text-center">
                          <p className="text-[24px] font-bold text-[#4ADE80]">{savePct}%</p>
                          <p className="text-[9px] text-[#4ADE80]/60 uppercase">estimated reduction</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[#12161E] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4ADE80] to-[#5B8DEF] rounded-full transition-all duration-1000" style={{ width: `${savePct}%` }} />
                      </div>
                    </div>
                  )}

                  {!isCache && result.text && !result.text.startsWith("QUOTA") && !result.text.startsWith("AUTH") && !result.text.startsWith("ERR:") && (
                    <button onClick={send} disabled={loading} className="mt-3 w-full py-2.5 bg-[#5B8DEF]/5 border border-[#5B8DEF]/15 text-[#5B8DEF] rounded-xl text-[12px] font-medium hover:bg-[#5B8DEF]/10 transition-colors pulse-ring">Send again to test caching →</button>
                  )}
                  {isCache && <p className="mt-3 text-[#4ADE80] text-[12px] text-center font-medium bg-[#4ADE80]/5 border border-[#4ADE80]/10 rounded-xl py-2.5">✓ Served from cache — no new provider generation</p>}
                </div>
              )}

              {result?.text && !result.text.startsWith("QUOTA") && !result.text.startsWith("AUTH") && !result.text.startsWith("ERR:") && (
                <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] text-[#5A6577] uppercase tracking-wider">Response</p>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(result.text)} className="text-[11px] text-[#3D4654] hover:text-[#5B8DEF] transition-colors px-2 py-1 rounded hover:bg-[#5B8DEF]/5">Copy</button>
                      <button onClick={() => { const b = new Blob([result.text], { type: "text/plain" }); const a = document.createElement("a"); const url = URL.createObjectURL(b); a.href = url; a.download = "response.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="text-[11px] text-[#3D4654] hover:text-[#5B8DEF] transition-colors px-2 py-1 rounded hover:bg-[#5B8DEF]/5">Export</button>
                      <button onClick={() => setShowRaw(!showRaw)} className="text-[11px] text-[#3D4654] hover:text-[#5B8DEF] transition-colors px-2 py-1 rounded hover:bg-[#5B8DEF]/5">{showRaw ? "Formatted" : "Raw JSON"}</button>
                    </div>
                  </div>
                  {showRaw ? <pre className="text-[12px] text-[#5A6577] bg-[#0A0D12] rounded-xl p-4 max-h-80 overflow-y-auto font-mono whitespace-pre-wrap">{result.raw}</pre>
                    : <div className="text-[14px] text-[#C8CED8] leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto"><StreamText text={result.text} /></div>}
                </div>
              )}

              {result?.text === "QUOTA" && (
                <div className="bg-[#E8B94B]/[0.03] border border-[#E8B94B]/15 rounded-2xl p-5">
                  <p className="text-[#E8B94B] text-[15px] font-semibold mb-2">Rate limit reached</p>
                  <p className="text-[#5A6577] text-[13px] mb-3">The service or provider returned a limit error. Wait before retrying.</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setProvider("groq"); setApiKey(""); }} className="text-[12px] text-[#5B8DEF] bg-[#5B8DEF]/5 px-3 py-1.5 rounded-lg hover:bg-[#5B8DEF]/10 transition-colors">Switch to Groq</button>
                    <button onClick={send} className="text-[12px] text-[#5A6577] bg-white/[0.03] px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">Retry</button>
                  </div>
                </div>
              )}

              {result?.text === "AUTH" && (
                <div className="bg-[#FF5F57]/[0.03] border border-[#FF5F57]/15 rounded-2xl p-5">
                  <p className="text-[#FF5F57] text-[15px] font-semibold">Invalid API key</p>
                  <p className="text-[#5A6577] text-[13px] mt-1">Check that your key matches the selected provider.</p>
                </div>
              )}

              {!result && !loading && (
                <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5B8DEF]/10 to-[#A78BFA]/10 border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">⚡</div>
                  <p className="text-[#7A8599] text-[15px] font-medium">Your response, with context.</p>
                  <p className="text-[#3D4654] text-[12px] mt-2">Connect a provider key and send a prompt. Inspect the answer, model, cache result, and round-trip time here.</p>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    {PROVIDERS.map(p => <div key={p.id} className="opacity-20"><ProviderLogo provider={p.id} size={20} /></div>)}
                  </div>
                </div>
              )}

              {loading && (
                <div className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5B8DEF]/10 to-[#A78BFA]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <div className="w-7 h-7 border-2 border-[#5B8DEF] border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-[#7A8599] text-[14px]">Optimizing and forwarding your request...</p>
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    {["Cache check", "Routing", "Compression", "Forwarding"].map((s, i) => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded-full animate-pulse" style={{ color: ["#4ADE80", "#5B8DEF", "#E8B94B", "#A78BFA"][i], backgroundColor: ["#4ADE80", "#5B8DEF", "#E8B94B", "#A78BFA"][i] + "08", animationDelay: `${i * 0.3}s` }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "chat" && (
          <div className="max-w-[800px] mx-auto">
            <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden" style={{ height: "540px", display: "flex", flexDirection: "column" }}>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMsgs.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5B8DEF]/10 to-[#A78BFA]/10 border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
                    <p className="text-[#7A8599] text-[15px] font-medium">Start a conversation</p>
                    <p className="text-[#3D4654] text-[12px] mt-2">Send a conversation through the proxy and inspect its responses.</p>
                  </div>
                )}
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-gradient-to-r from-[#5B8DEF]/10 to-[#A78BFA]/10 border border-[#5B8DEF]/15" : "bg-white/[0.03] border border-white/[0.06]"}`}>
                      <p className="text-[14px] text-[#C8CED8] whitespace-pre-wrap leading-relaxed">
                        {m.role === "assistant" && i === chatMsgs.length - 1 ? <StreamText text={m.content} /> : m.content}
                      </p>
                      {m.meta && (
                        <div className="mt-2 pt-2 border-t border-white/[0.04] flex gap-3">
                          <span className="text-[10px]" style={{ color: m.meta.cache_hit ? "#4ADE80" : "#5A6577" }}>{m.meta.cache_hit ? "✓ Cached" : m.meta.model_used}</span>
                          {m.meta.complexity && <span className="text-[10px] text-[#3D4654]">• {m.meta.complexity}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                      <div className="flex gap-1.5">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-[#5B8DEF] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="border-t border-white/[0.04] p-3 flex gap-2">
                <input aria-label="Chat message" value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Type a message..." className="flex-1 px-4 py-3 bg-[#0A0D12] border border-white/[0.06] rounded-xl text-[14px] text-[#E8ECF4] placeholder-[#3D4654] focus:outline-none focus:border-[#5B8DEF]/30" />
                <button onClick={sendChat} disabled={chatLoading || !apiKey || !chatIn.trim()} className="px-6 py-3 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold disabled:opacity-30 shadow-lg shadow-[#5B8DEF]/20 hover:shadow-[#5B8DEF]/40 transition-shadow">Send</button>
              </div>
            </div>
            <div className="flex justify-between mt-3 px-1"><span className="text-[11px] text-[#3D4654]">{chatMsgs.length} messages</span><button disabled={chatLoading} onClick={() => setChatMsgs([])} className="text-[11px] text-[#3D4654] hover:text-[#FF5F57] transition-colors">Clear chat</button></div>
          </div>
        )}

        {mode === "compare" && (
          <div className="space-y-6">
            <div className="bg-[#12161E]/60 backdrop-blur border border-white/[0.06] rounded-2xl overflow-hidden">
              <textarea aria-label="Comparison prompt" placeholder="Enter prompt to compare across providers..." value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="w-full bg-transparent px-5 pt-5 pb-2 text-[14px] text-[#E8ECF4] placeholder-[#3D4654] resize-none focus:outline-none" />
              <div className="flex justify-end px-5 py-3 border-t border-white/[0.04]">
                <button onClick={sendCompare} disabled={cmpLoading || !apiKey || !cmpKey2 || !prompt} className="px-6 py-2.5 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-xl text-[13px] font-semibold disabled:opacity-30 shadow-lg shadow-[#5B8DEF]/20 flex items-center gap-2">
                  {cmpLoading ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Comparing...</> : "Compare providers →"}
                </button>
              </div>
            </div>
            {cmpResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[cmpResult.a, cmpResult.b].map((r, i) => (
                    <div key={i} className="bg-[#12161E]/60 border border-white/[0.06] rounded-2xl p-5">
                      <div className="flex items-center gap-2.5 mb-4"><ProviderLogo provider={r.name} size={22} /><span className="text-[15px] font-semibold">{pName(r.name)}</span><span className="ml-auto text-[11px] text-[#3D4654] font-mono">{r.model}</span></div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-[#0A0D12] rounded-lg p-2.5 text-center"><p className="text-[9px] text-[#3D4654]">Estimated cost</p><p className="text-[14px] font-bold text-[#4ADE80]">${r.cost.toFixed(6)}</p></div>
                        <div className="bg-[#0A0D12] rounded-lg p-2.5 text-center"><p className="text-[9px] text-[#3D4654]">Approx. tokens</p><p className="text-[14px] font-bold text-[#5B8DEF]">{tokens(r.text)}</p></div>
                        <div className="bg-[#0A0D12] rounded-lg p-2.5 text-center"><p className="text-[9px] text-[#3D4654]">Cache</p><p className={`text-[14px] font-bold ${r.meta?.cache_hit ? "text-[#4ADE80]" : "text-[#3D4654]"}`}>{r.meta?.cache_hit ? "Hit" : "Miss"}</p></div>
                      </div>
                      <div className="bg-[#0A0D12] rounded-xl p-4 text-[13px] text-[#C8CED8] whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed"><StreamText text={r.text || "No response"} /></div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-[#5B8DEF]/5 to-[#A78BFA]/5 border border-white/[0.06] rounded-2xl p-5 text-center">
                  <p className="text-[12px] text-[#5A6577] mb-1">Estimated cost comparison · review output quality separately</p>
                  <p className="text-[18px] font-bold">
                    {cmpResult.a.cost < cmpResult.b.cost ? <><span style={{ color: pColor(cmpResult.a.name) }}>{pName(cmpResult.a.name)}</span> <span className="text-[#4ADE80]">{Math.round(((cmpResult.b.cost - cmpResult.a.cost) / cmpResult.b.cost) * 100)}% cheaper</span></>
                      : cmpResult.a.cost > cmpResult.b.cost ? <><span style={{ color: pColor(cmpResult.b.name) }}>{pName(cmpResult.b.name)}</span> <span className="text-[#4ADE80]">{Math.round(((cmpResult.a.cost - cmpResult.b.cost) / cmpResult.a.cost) * 100)}% cheaper</span></>
                      : <span className="text-[#5A6577]">Same cost</span>}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
