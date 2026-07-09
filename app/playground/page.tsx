"use client";
import { useState, useRef, useEffect } from "react";

function extractAIText(response: any, provider: string): string {
  try {
    if (response.error) {
      const msg = typeof response.error === "string" ? response.error : response.error.message || JSON.stringify(response.error);
      if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit")) return "QUOTA_ERROR";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("unauthorized")) return "AUTH_ERROR";
      return "Error: " + msg;
    }
    if (provider === "anthropic" && response.content && response.content[0]) return response.content[0].text;
    if (provider === "openai" && response.choices && response.choices[0]) return response.choices[0].message.content;
    if (provider === "google" && response.candidates && response.candidates[0]) return response.candidates[0].content.parts[0].text;
    if (provider === "groq" && response.choices && response.choices[0]) return response.choices[0].message.content;
  } catch (e) {}
  return "";
}

function estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number) {
  const pricing: any = {
    "claude-haiku-4-5-20251001": { input: 1, output: 5 },
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gemini-2.0-flash-lite": { input: 0.075, output: 0.3 },
    "gemini-2.0-flash": { input: 0.15, output: 0.6 },
    "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
    "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  };
  const p = pricing[model] || { input: 1, output: 5 };
  const cost = (inputTokens * p.input + outputTokens * p.output) / 1000000;
  return cost;
}

function estimateTokens(text: string) { return Math.ceil(text.length / 4); }

const providers = [
  { id: "anthropic", name: "Anthropic (Claude)" },
  { id: "openai", name: "OpenAI (GPT)" },
  { id: "google", name: "Google (Gemini)" },
  { id: "groq", name: "Groq — Llama (Free)" },
];

const promptTemplates = [
  { label: "Simple Q&A", prompt: "What is the capital of Japan?" },
  { label: "Summarize", prompt: "Summarize the following text in 3 bullet points:\n\n[Paste your text here]" },
  { label: "Code generation", prompt: "Write a Python function that takes a list of numbers and returns the top 3 largest values." },
  { label: "Email draft", prompt: "Write a professional email to a client explaining a project delay of 2 weeks." },
  { label: "Data analysis", prompt: "Analyze the following data and provide insights:\n\n[Paste your data here]" },
  { label: "Translation", prompt: "Translate the following text to Spanish:\n\nHello, how are you? I hope you are having a great day." },
];

export default function Playground() {
  const [mode, setMode] = useState("single");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [compareProvider2, setCompareProvider2] = useState("groq");
  const [compareKey2, setCompareKey2] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResults, setCompareResults] = useState<any>(null);

  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendSingle = async () => {
    setLoading(true);
    setResult(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const duration = Date.now() - start;
      const text = extractAIText(data, provider);
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(text);
      const model = data.tokensave_meta?.model_used || "unknown";
      const costWithout = estimateCost(provider, provider === "anthropic" ? "claude-sonnet-4-6" : provider === "openai" ? "gpt-4o" : provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash", inputTokens, outputTokens);
      const costWith = data.tokensave_meta?.cache_hit ? 0 : estimateCost(provider, model, inputTokens, outputTokens);
      setResult({ text, meta: data.tokensave_meta, duration, inputTokens, outputTokens, costWithout, costWith, raw: JSON.stringify(data, null, 2) });
    } catch (e: any) {
      setResult({ text: "Error: " + e.message, meta: null, duration: 0 });
    }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const text = extractAIText(data, provider);
      setChatMessages([...newMessages, { role: "assistant", content: text, meta: data.tokensave_meta }]);
    } catch (e: any) {
      setChatMessages([...newMessages, { role: "assistant", content: "Error: " + e.message }]);
    }
    setChatLoading(false);
  };

  const sendCompare = async () => {
    setCompareLoading(true);
    setCompareResults(null);
    const start1 = Date.now();
    const [res1, res2] = await Promise.all([
      fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: prompt }] }) }).then((r) => r.json()),
      fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: compareProvider2, apiKey: compareKey2, messages: [{ role: "user", content: prompt }] }) }).then((r) => r.json()),
    ]);
    const duration = Date.now() - start1;
    const text1 = extractAIText(res1, provider);
    const text2 = extractAIText(res2, compareProvider2);
    const tokens1 = estimateTokens(text1);
    const tokens2 = estimateTokens(text2);
    const model1 = res1.tokensave_meta?.model_used || "unknown";
    const model2 = res2.tokensave_meta?.model_used || "unknown";
    setCompareResults({
      provider1: { name: provider, text: text1, model: model1, meta: res1.tokensave_meta, cost: estimateCost(provider, model1, estimateTokens(prompt), tokens1), tokens: tokens1 },
      provider2: { name: compareProvider2, text: text2, model: model2, meta: res2.tokensave_meta, cost: estimateCost(compareProvider2, model2, estimateTokens(prompt), tokens2), tokens: tokens2 },
    });
    setCompareLoading(false);
  };

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name || id;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300">Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Playground</h1>
            <p className="text-gray-500 text-sm mt-1">Test, chat, and compare AI providers through TokenSave</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          {[{ id: "single", label: "Single Prompt" }, { id: "chat", label: "Chat Mode" }, { id: "compare", label: "Compare Providers" }].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === m.id ? "bg-cyan-400 text-gray-950" : "text-gray-400 hover:text-gray-200"}`}>{m.label}</button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400">{providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs text-gray-500 mb-1">API Key</label>
              <input type="password" placeholder="Paste your API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400" />
            </div>
            {mode === "compare" && (
              <>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">Compare with</label>
                  <select value={compareProvider2} onChange={(e) => setCompareProvider2(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-400">{providers.filter((p) => p.id !== provider).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
                </div>
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-xs text-gray-500 mb-1">Second API Key</label>
                  <input type="password" placeholder="Key for second provider" value={compareKey2} onChange={(e) => setCompareKey2(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400" />
                </div>
              </>
            )}
          </div>
        </div>

        {mode === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {promptTemplates.map((t) => (
                  <button key={t.label} onClick={() => setPrompt(t.prompt)} className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors">{t.label}</button>
                ))}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <textarea placeholder="Type your prompt or select a template above..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} className="w-full bg-transparent text-gray-200 placeholder-gray-600 text-sm resize-none focus:outline-none" />
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800">
                  <span className="text-xs text-gray-600">{estimateTokens(prompt)} est. tokens</span>
                  <button onClick={sendSingle} disabled={loading || !apiKey || !prompt} className="px-6 py-2 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 text-sm flex items-center gap-2">
                    {loading ? <><div className="w-3 h-3 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></div>Processing...</> : "Send"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {result?.meta && (
                <div className={`border rounded-xl p-4 ${result.meta.cache_hit ? "bg-green-400/5 border-green-400/30" : "bg-gray-900 border-gray-800"}`}>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-950/50 border border-gray-800/50 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs">Cache</p>
                      <p className={`text-sm font-semibold ${result.meta.cache_hit ? "text-green-400" : "text-gray-400"}`}>{result.meta.cache_hit ? "Hit — free!" : "Miss"}</p>
                    </div>
                    <div className="bg-gray-950/50 border border-gray-800/50 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs">Model</p>
                      <p className="text-sm font-semibold text-cyan-400 font-mono">{result.meta.model_used || "Cached"}</p>
                    </div>
                    <div className="bg-gray-950/50 border border-gray-800/50 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs">Complexity</p>
                      <p className="text-sm font-semibold text-gray-300 capitalize">{result.meta.complexity || "N/A"}</p>
                    </div>
                    <div className="bg-gray-950/50 border border-gray-800/50 rounded-lg p-2.5">
                      <p className="text-gray-500 text-xs">Response time</p>
                      <p className="text-sm font-semibold text-gray-300">{result.duration}ms</p>
                    </div>
                  </div>
                  {result.costWithout !== undefined && (
                    <div className="bg-gray-950/50 border border-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-2">Cost analysis</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Without TokenSave</p>
                          <p className="text-red-400 font-semibold">${result.costWithout.toFixed(6)}</p>
                        </div>
                        <div className="text-2xl text-gray-700">→</div>
                        <div>
                          <p className="text-xs text-gray-500">With TokenSave</p>
                          <p className="text-green-400 font-semibold">${result.costWith.toFixed(6)}</p>
                        </div>
                        <div className="bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-1.5">
                          <p className="text-green-400 font-bold text-lg">{result.costWithout > 0 ? Math.round(((result.costWithout - result.costWith) / result.costWithout) * 100) : 0}%</p>
                          <p className="text-green-400 text-xs">saved</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {result?.text && !result.text.startsWith("QUOTA_") && !result.text.startsWith("AUTH_") && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Response</p>
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{result.text}</div>
                </div>
              )}
              {result?.text === "QUOTA_ERROR" && (
                <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4">
                  <p className="text-amber-400 text-sm font-medium mb-2">Provider rate limit reached</p>
                  <p className="text-gray-400 text-sm">Your API key hit the provider's limit. Try Groq (free) or wait a minute.</p>
                </div>
              )}
              {result?.text === "AUTH_ERROR" && (
                <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
                  <p className="text-red-400 text-sm font-medium">Invalid API key. Check the key matches your selected provider.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "chat" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden" style={{ height: "500px", display: "flex", flexDirection: "column" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-gray-600 text-3xl mb-3">💬</p>
                    <p className="text-gray-500 text-sm">Start a conversation. TokenSave optimizes every message.</p>
                    <p className="text-gray-600 text-xs mt-1">Multi-turn context is automatically managed.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-cyan-400/10 border border-cyan-400/20" : "bg-gray-800 border border-gray-700"}`}>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.content}</p>
                      {msg.meta && (
                        <div className="mt-2 pt-2 border-t border-gray-700/50 flex gap-3 text-xs text-gray-500">
                          <span>{msg.meta.cache_hit ? "✓ Cached" : msg.meta.model_used}</span>
                          {msg.meta.complexity && <span>• {msg.meta.complexity}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                      <div className="flex gap-1"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-gray-800 p-3 flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-400" />
                <button onClick={sendChat} disabled={chatLoading || !apiKey || !chatInput.trim()} className="px-5 py-2.5 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 text-sm">Send</button>
              </div>
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-xs text-gray-600">{chatMessages.length} messages in context</span>
              <button onClick={() => setChatMessages([])} className="text-xs text-gray-500 hover:text-red-400">Clear chat</button>
            </div>
          </div>
        )}

        {mode === "compare" && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <textarea placeholder="Enter the same prompt to compare across providers..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full bg-transparent text-gray-200 placeholder-gray-600 text-sm resize-none focus:outline-none" />
              <div className="flex justify-end mt-3 pt-3 border-t border-gray-800">
                <button onClick={sendCompare} disabled={compareLoading || !apiKey || !compareKey2 || !prompt} className="px-6 py-2 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 text-sm flex items-center gap-2">
                  {compareLoading ? <><div className="w-3 h-3 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></div>Comparing...</> : "Compare Both"}
                </button>
              </div>
            </div>

            {compareResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[compareResults.provider1, compareResults.provider2].map((r, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">{providerName(r.name)}</h3>
                      <span className="text-xs text-gray-500 font-mono">{r.model}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-950 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Cost</p>
                        <p className="text-sm font-bold text-green-400">${r.cost.toFixed(6)}</p>
                      </div>
                      <div className="bg-gray-950 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Output</p>
                        <p className="text-sm font-bold text-cyan-400">{r.tokens} tok</p>
                      </div>
                      <div className="bg-gray-950 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Cached</p>
                        <p className={`text-sm font-bold ${r.meta?.cache_hit ? "text-green-400" : "text-gray-500"}`}>{r.meta?.cache_hit ? "Yes" : "No"}</p>
                      </div>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">{r.text || "No response"}</div>
                  </div>
                ))}
              </div>
            )}

            {compareResults && (
              <div className="bg-gray-900 border border-cyan-400/20 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-400 mb-1">Cost comparison</p>
                <p className="text-lg">
                  <span className="font-bold text-cyan-400">{providerName(compareResults.provider1.name)}</span>
                  <span className="text-gray-600 mx-2">${compareResults.provider1.cost.toFixed(6)}</span>
                  <span className="text-gray-600 mx-2">vs</span>
                  <span className="font-bold text-cyan-400">{providerName(compareResults.provider2.name)}</span>
                  <span className="text-gray-600 mx-2">${compareResults.provider2.cost.toFixed(6)}</span>
                </p>
                <p className="text-green-400 text-sm mt-1 font-medium">
                  {compareResults.provider1.cost < compareResults.provider2.cost
                    ? `${providerName(compareResults.provider1.name)} is ${Math.round(((compareResults.provider2.cost - compareResults.provider1.cost) / compareResults.provider2.cost) * 100)}% cheaper`
                    : compareResults.provider1.cost > compareResults.provider2.cost
                    ? `${providerName(compareResults.provider2.name)} is ${Math.round(((compareResults.provider1.cost - compareResults.provider2.cost) / compareResults.provider1.cost) * 100)}% cheaper`
                    : "Same cost"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}