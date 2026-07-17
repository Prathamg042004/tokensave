"use client";
import { useState, useRef, useEffect } from "react";

function extractAIText(r: any, p: string): string {
  try {
    if (r.error) {
      const m = typeof r.error === "string" ? r.error : r.error.message || JSON.stringify(r.error);
      if (m.toLowerCase().match(/quota|rate|limit|429|exhausted/)) return "QUOTA";
      if (m.toLowerCase().match(/invalid|unauthorized|auth|401/)) return "AUTH";
      return "ERR:" + m;
    }
    if (p === "anthropic" && r.content?.[0]) return r.content[0].text;
    if ((p === "openai" || p === "groq") && r.choices?.[0]) return r.choices[0].message.content;
    if (p === "google" && r.candidates?.[0]) return r.candidates[0].content.parts[0].text;
  } catch {}
  return "";
}

function costCalc(model: string, inT: number, outT: number) {
  const p: any = {
    "claude-haiku-4-5-20251001": [0.8, 4], "claude-sonnet-4-6": [3, 15],
    "gpt-4o-mini": [0.15, 0.6], "gpt-4o": [2.5, 10],
    "gemini-2.0-flash-lite": [0.075, 0.3], "gemini-2.0-flash": [0.15, 0.6],
    "llama-3.1-8b-instant": [0.05, 0.08], "llama-3.3-70b-versatile": [0.59, 0.79],
  };
  const pr = p[model] || [1, 5];
  return (inT * pr[0] + outT * pr[1]) / 1000000;
}

const tokens = (s: string) => Math.ceil((s || "").length / 4);

const PROVIDERS = [
  { id: "anthropic", name: "Claude", color: "#D4A574" },
  { id: "openai", name: "GPT", color: "#74AA9C" },
  { id: "google", name: "Gemini", color: "#4285F4" },
  { id: "groq", name: "Groq", color: "#F55036", free: true },
];

const TEMPLATES = [
  { label: "Simple Q&A", prompt: "What is the capital of Japan?", complexity: "simple" },
  { label: "Summarize", prompt: "Summarize the following text in 3 bullet points:\n\n[Paste text here]", complexity: "simple" },
  { label: "Write code", prompt: "Write a Python function that finds the top 3 largest values in a list.", complexity: "complex" },
  { label: "Draft email", prompt: "Write a professional email explaining a 2-week project delay to a client.", complexity: "simple" },
  { label: "Analyze data", prompt: "Analyze this data and provide 3 key insights:\n\n[Paste data here]", complexity: "complex" },
  { label: "Translate", prompt: "Translate to Spanish: Hello, I hope you are having a wonderful day.", complexity: "simple" },
];

export default function Playground() {
  const [mode, setMode] = useState("single");
  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatIn, setChatIn] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [cmp2, setCmp2] = useState("anthropic");
  const [cmpKey2, setCmpKey2] = useState("");
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpResult, setCmpResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [file, setFile] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("ts_keys_"));
      if (keys.length > 0) {
        const saved = JSON.parse(localStorage.getItem(keys[0]) || "{}");
        if (saved[provider] && !apiKey) setApiKey(saved[provider]);
      }
    } catch {}
  }, [provider]);

  const handleFile = (e: any) => {
    const f = e.target.files[0]; if (!f) return;
    setFileName(f.name);
    const r = new FileReader();
    r.onload = (ev) => { let t = ev.target?.result as string; if (t.length > 50000) t = t.slice(0, 50000); setFile(t); };
    r.readAsText(f);
  };

  const fullPrompt = file ? prompt + "\n\n--- " + fileName + " ---\n" + file : prompt;

  const sendSingle = async () => {
    setLoading(true); setResult(null); setShowRaw(false);
    const start = Date.now();
    try {
      const res = await fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: fullPrompt }] }) });
      const data = await res.json();
      const dur = Date.now() - start;
      const text = extractAIText(data, provider);
      const inT = tokens(fullPrompt), outT = tokens(text);
      const model = data.tokensave_meta?.model_used || "unknown";
      const withoutCost = costCalc(provider === "anthropic" ? "claude-sonnet-4-6" : provider === "openai" ? "gpt-4o" : provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash", inT, outT);
      const withCost = data.tokensave_meta?.cache_hit ? 0 : costCalc(model, inT, outT);
      setResult({ text, meta: data.tokensave_meta, dur, inT, outT, withoutCost, withCost, raw: JSON.stringify(data, null, 2) });
      setHistory(h => [{ prompt: prompt.slice(0, 50), cached: data.tokensave_meta?.cache_hit, model, dur }, ...h].slice(0, 10));
    } catch (e: any) { setResult({ text: "ERR:" + e.message }); }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatIn.trim()) return;
    const content = file ? chatIn + "\n\n--- " + fileName + " ---\n" + file : chatIn;
    const msgs = [...chatMsgs, { role: "user", content }];
    setChatMsgs(msgs); setChatIn(""); setChatLoading(true);
    try {
      const res = await fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: msgs.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      setChatMsgs([...msgs, { role: "assistant", content: extractAIText(data, provider), meta: data.tokensave_meta }]);
    } catch (e: any) { setChatMsgs([...msgs, { role: "assistant", content: "Error: " + e.message }]); }
    setChatLoading(false);
  };

  const sendCompare = async () => {
    setCmpLoading(true); setCmpResult(null);
    const [r1, r2] = await Promise.all([
      fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: fullPrompt }] }) }).then(r => r.json()),
      fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: cmp2, apiKey: cmpKey2, messages: [{ role: "user", content: fullPrompt }] }) }).then(r => r.json()),
    ]);
    const t1 = extractAIText(r1, provider), t2 = extractAIText(r2, cmp2);
    const m1 = r1.tokensave_meta?.model_used || "?", m2 = r2.tokensave_meta?.model_used || "?";
    const c1 = costCalc(m1, tokens(fullPrompt), tokens(t1)), c2 = costCalc(m2, tokens(fullPrompt), tokens(t2));
    setCmpResult({ p1: { name: provider, text: t1, model: m1, cost: c1, meta: r1.tokensave_meta }, p2: { name: cmp2, text: t2, model: m2, cost: c2, meta: r2.tokensave_meta } });
    setCmpLoading(false);
  };

  const pName = (id: string) => PROVIDERS.find(p => p.id === id)?.name || id;
  const pColor = (id: string) => PROVIDERS.find(p => p.id === id)?.color || "#888";
  const isCache = result?.meta?.cache_hit;

  return (
    <div className="min-h-screen bg-[#08090C] text-gray-100 relative overflow-hidden">
      <div className="absolute top-[-300px] right-[-200px] w-[700px] h-[700px] bg-cyan-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-200px] left-[-100px] w-[500px] h-[500px] bg-violet-500/[0.015] rounded-full blur-[100px] pointer-events-none"></div>

      <nav className="relative z-10 border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-6 lg:px-10 py-3.5 max-w-[1300px] mx-auto">
          <a href="/" className="flex items-center gap-2.5"><div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">TS</div><span className="text-lg font-semibold tracking-tight">TokenSave</span></a>
          <a href="/dashboard" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Dashboard</a>
        </div>
      </nav>

      <div className="relative z-10 max-w-[1300px] mx-auto px-6 lg:px-10 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Playground</h1>
            <p className="text-gray-500 text-[14px] mt-1">Test, chat, and compare — see optimizations in real-time</p>
          </div>
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 gap-0.5">
            {[{ id: "single", l: "Prompt" }, { id: "chat", l: "Chat" }, { id: "compare", l: "Compare" }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${mode === m.id ? "bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-400 border border-cyan-400/20" : "text-gray-500 hover:text-gray-300"}`}>{m.l}</button>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[180px] flex-1">
              <label className="text-[11px] text-gray-500 mb-1.5 block uppercase tracking-wider">Provider</label>
              <div className="flex gap-2">
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => setProvider(p.id)} className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all border ${provider === p.id ? "border-white/[0.15] bg-white/[0.05]" : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"}`} style={provider === p.id ? { color: p.color } : { color: "#6b7280" }}>
                    {p.name}{p.free && <span className="ml-1 text-[9px] text-emerald-400">FREE</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-[240px] flex-1">
              <label className="text-[11px] text-gray-500 mb-1.5 block uppercase tracking-wider">API Key</label>
              <input type="password" placeholder="Paste your key" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/[0.06] rounded-xl text-gray-200 placeholder-gray-700 text-[13px] focus:outline-none focus:border-cyan-400/30 transition-colors" />
            </div>
            {mode === "compare" && (
              <>
                <div className="min-w-[140px]">
                  <label className="text-[11px] text-gray-500 mb-1.5 block uppercase tracking-wider">Compare with</label>
                  <select value={cmp2} onChange={e => setCmp2(e.target.value)} className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.06] rounded-xl text-gray-200 text-[13px] focus:outline-none">
                    {PROVIDERS.filter(p => p.id !== provider).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="text-[11px] text-gray-500 mb-1.5 block uppercase tracking-wider">Second key</label>
                  <input type="password" placeholder="Key for second provider" value={cmpKey2} onChange={e => setCmpKey2(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/[0.06] rounded-xl text-gray-200 placeholder-gray-700 text-[13px] focus:outline-none focus:border-cyan-400/30" />
                </div>
              </>
            )}
          </div>
        </div>

        {mode === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => setPrompt(t.prompt)} className="px-3 py-1.5 bg-white/[0.02] border border-white/[0.05] rounded-lg text-[11px] text-gray-400 hover:border-cyan-400/30 hover:text-cyan-400 transition-all">{t.label}</button>
                ))}
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
                <textarea placeholder="Type your prompt or pick a template..." value={prompt} onChange={e => setPrompt(e.target.value)} rows={8} className="w-full bg-transparent px-5 pt-5 pb-2 text-gray-200 placeholder-gray-600 text-[14px] resize-none focus:outline-none leading-relaxed" />
                {fileName && (
                  <div className="mx-5 mb-2 flex items-center gap-2 px-3 py-2 bg-cyan-400/5 border border-cyan-400/10 rounded-lg">
                    <span className="text-cyan-400 text-[11px]">📎 {fileName}</span>
                    <button onClick={() => { setFile(""); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }} className="text-gray-500 hover:text-red-400 text-[10px] ml-auto">Remove</button>
                  </div>
                )}
                <div className="flex justify-between items-center px-5 py-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-600">{tokens(fullPrompt)} tokens</span>
                    <input ref={fileRef} type="file" accept=".txt,.csv,.json,.md,.html,.xml,.log" onChange={handleFile} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="text-[11px] text-gray-500 hover:text-cyan-400 transition-colors">📎 Attach</button>
                  </div>
                  <button onClick={sendSingle} disabled={loading || !apiKey || !prompt} className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 disabled:opacity-30 transition-all flex items-center gap-2">
                    {loading ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Running...</> : "Send"}
                  </button>
                </div>
              </div>
              {history.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">History</p>
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0 text-[12px]">
                      <span className="text-gray-400 truncate flex-1 mr-3">{h.prompt}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {h.cached ? <span className="text-emerald-400 text-[10px] bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">Cached</span> : <span className="text-gray-600 text-[10px] bg-white/[0.03] px-2 py-0.5 rounded-full">{h.model}</span>}
                        <span className="text-gray-600 text-[10px] w-12 text-right">{h.dur}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-4">
              {result?.meta && (
                <div className={`border rounded-2xl p-5 transition-all ${isCache ? "bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/15" : "bg-white/[0.02] border-white/[0.05]"}`}>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">Optimization</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {[
                      { l: "Cache", v: isCache ? "HIT" : "MISS", c: isCache ? "text-emerald-400" : "text-gray-500" },
                      { l: "Model", v: result.meta.model_used || "Cached", c: "text-cyan-400" },
                      { l: "Complexity", v: result.meta.complexity || "—", c: "text-gray-300" },
                      { l: "Latency", v: result.dur + "ms", c: "text-gray-300" },
                    ].map((s, i) => (
                      <div key={i} className="bg-black/30 rounded-xl p-3"><p className="text-[9px] text-gray-600 uppercase">{s.l}</p><p className={`text-[13px] font-semibold mt-0.5 font-mono ${s.c}`}>{s.v}</p></div>
                    ))}
                  </div>
                  {result.withoutCost !== undefined && (
                    <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="text-center"><p className="text-[9px] text-gray-600 uppercase">Without TokenSave</p><p className="text-red-400/70 text-[16px] font-bold line-through">${result.withoutCost.toFixed(6)}</p></div>
                      <div className="text-gray-700 text-2xl">→</div>
                      <div className="text-center"><p className="text-[9px] text-gray-600 uppercase">With TokenSave</p><p className="text-emerald-400 text-[16px] font-bold">${result.withCost.toFixed(6)}</p></div>
                      <div className="bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 border border-emerald-400/20 rounded-xl px-4 py-2 text-center">
                        <p className="text-emerald-400 font-bold text-[20px]">{result.withoutCost > 0 ? Math.round(((result.withoutCost - result.withCost) / result.withoutCost) * 100) : 0}%</p>
                        <p className="text-emerald-400/60 text-[9px] uppercase">saved</p>
                      </div>
                    </div>
                  )}
                  {!isCache && result.text && !result.text.startsWith("QUOTA") && !result.text.startsWith("AUTH") && (
                    <button onClick={sendSingle} disabled={loading} className="mt-3 w-full py-2 bg-cyan-400/5 border border-cyan-400/15 text-cyan-400 rounded-xl text-[12px] font-medium hover:bg-cyan-400/10 transition-colors disabled:opacity-40">
                      Resend for cache hit →
                    </button>
                  )}
                  {isCache && <p className="mt-3 text-emerald-400 text-[12px] text-center font-medium bg-emerald-400/5 border border-emerald-400/10 rounded-xl py-2">✓ Cache hit — zero cost, instant response</p>}
                </div>
              )}
              {result?.text && !result.text.startsWith("QUOTA") && !result.text.startsWith("AUTH") && !result.text.startsWith("ERR:") && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">Response</p>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(result.text)} className="text-[11px] text-gray-600 hover:text-cyan-400 transition-colors">Copy</button>
                      <button onClick={() => { const b = new Blob([result.text], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "response.txt"; a.click(); }} className="text-[11px] text-gray-600 hover:text-cyan-400 transition-colors">Download</button>
                      <button onClick={() => setShowRaw(!showRaw)} className="text-[11px] text-gray-600 hover:text-cyan-400 transition-colors">{showRaw ? "Formatted" : "Raw JSON"}</button>
                    </div>
                  </div>
                  {showRaw ? <pre className="text-[12px] text-gray-400 bg-black/40 rounded-xl p-4 max-h-80 overflow-y-auto font-mono whitespace-pre-wrap">{result.raw}</pre>
                    : <div className="text-[14px] text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">{result.text}</div>}
                </div>
              )}
              {result?.text === "QUOTA" && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5">
                  <p className="text-amber-400 text-[14px] font-medium mb-2">Provider rate limit reached</p>
                  <p className="text-gray-400 text-[13px] mb-3">This is from your AI provider, not TokenSave.</p>
                  <div className="space-y-1 text-[12px] text-gray-500">
                    <p>• Wait 1-2 minutes and retry</p>
                    <p>• Create a new API key from your provider</p>
                    <p>• Try <button onClick={() => setProvider("groq")} className="text-cyan-400 hover:underline">Groq (free)</button></p>
                  </div>
                </div>
              )}
              {result?.text === "AUTH" && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5">
                  <p className="text-red-400 text-[14px] font-medium">Invalid API key</p>
                  <p className="text-gray-400 text-[13px] mt-1">Check that your key matches the selected provider.</p>
                </div>
              )}
              {!result && !loading && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400/5 to-blue-500/5 border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-gray-600 text-2xl">⚡</span></div>
                  <p className="text-gray-400 text-[14px] mb-1">Send a request to see results</p>
                  <p className="text-gray-600 text-[12px]">Cache status, model routing, cost savings — all visible here</p>
                </div>
              )}
              {loading && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>
                  <p className="text-gray-400 text-[14px]">Optimizing and forwarding...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "chat" && (
          <div className="max-w-[800px] mx-auto">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden" style={{ height: "520px", display: "flex", flexDirection: "column" }}>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMsgs.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-400/5 to-blue-500/5 border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl">💬</span></div>
                    <p className="text-gray-400 text-[14px]">Start a conversation</p>
                    <p className="text-gray-600 text-[12px] mt-1">Every message is optimized through TokenSave</p>
                  </div>
                )}
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/15" : "bg-white/[0.03] border border-white/[0.06]"}`}>
                      <p className="text-[14px] text-gray-200 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      {m.meta && (
                        <div className="mt-2 pt-2 border-t border-white/[0.06] flex gap-3 text-[10px] text-gray-500">
                          <span>{m.meta.cache_hit ? "✓ Cached" : m.meta.model_used}</span>
                          {m.meta.complexity && <span>• {m.meta.complexity}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start"><div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3"><div className="flex gap-1.5"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div></div></div></div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="border-t border-white/[0.04] p-3 flex gap-2">
                <input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Type a message..." className="flex-1 px-4 py-3 bg-black/40 border border-white/[0.06] rounded-xl text-gray-200 placeholder-gray-600 text-[14px] focus:outline-none focus:border-cyan-400/30" />
                <button onClick={sendChat} disabled={chatLoading || !apiKey || !chatIn.trim()} className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 disabled:opacity-30 transition-all">Send</button>
              </div>
            </div>
            <div className="flex justify-between mt-3 px-1">
              <span className="text-[11px] text-gray-600">{chatMsgs.length} messages</span>
              <button onClick={() => setChatMsgs([])} className="text-[11px] text-gray-600 hover:text-red-400 transition-colors">Clear</button>
            </div>
          </div>
        )}

        {mode === "compare" && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
              <textarea placeholder="Enter prompt to compare across providers..." value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="w-full bg-transparent px-5 pt-5 pb-2 text-gray-200 placeholder-gray-600 text-[14px] resize-none focus:outline-none" />
              <div className="flex justify-end px-5 py-3 border-t border-white/[0.04]">
                <button onClick={sendCompare} disabled={cmpLoading || !apiKey || !cmpKey2 || !prompt} className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 disabled:opacity-30 transition-all flex items-center gap-2">
                  {cmpLoading ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Comparing...</> : "Compare both"}
                </button>
              </div>
            </div>
            {cmpResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[cmpResult.p1, cmpResult.p2].map((r, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: pColor(r.name) }}></div><span className="text-[14px] font-semibold">{pName(r.name)}</span></div>
                        <span className="text-[11px] text-gray-500 font-mono">{r.model}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-black/30 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-600">Cost</p><p className="text-emerald-400 text-[13px] font-bold">${r.cost.toFixed(6)}</p></div>
                        <div className="bg-black/30 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-600">Tokens</p><p className="text-cyan-400 text-[13px] font-bold">{tokens(r.text)}</p></div>
                        <div className="bg-black/30 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-600">Cache</p><p className={`text-[13px] font-bold ${r.meta?.cache_hit ? "text-emerald-400" : "text-gray-600"}`}>{r.meta?.cache_hit ? "Hit" : "Miss"}</p></div>
                      </div>
                      <div className="bg-black/30 rounded-xl p-4 text-[13px] text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">{r.text || "No response"}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-cyan-400/5 to-blue-500/5 border border-white/[0.06] rounded-2xl p-5 text-center">
                  <p className="text-gray-500 text-[12px] mb-1">Winner</p>
                  <p className="text-[18px] font-bold">
                    {cmpResult.p1.cost < cmpResult.p2.cost ? (
                      <><span style={{ color: pColor(cmpResult.p1.name) }}>{pName(cmpResult.p1.name)}</span><span className="text-gray-500"> is </span><span className="text-emerald-400">{Math.round(((cmpResult.p2.cost - cmpResult.p1.cost) / cmpResult.p2.cost) * 100)}% cheaper</span></>
                    ) : cmpResult.p1.cost > cmpResult.p2.cost ? (
                      <><span style={{ color: pColor(cmpResult.p2.name) }}>{pName(cmpResult.p2.name)}</span><span className="text-gray-500"> is </span><span className="text-emerald-400">{Math.round(((cmpResult.p1.cost - cmpResult.p2.cost) / cmpResult.p1.cost) * 100)}% cheaper</span></>
                    ) : <span className="text-gray-400">Same cost</span>}
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