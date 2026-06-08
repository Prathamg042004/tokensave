"use client";
import { useState } from "react";

function extractAIText(response: any, provider: string): string {
  try {
    if (provider === "anthropic") {
      if (response.content && response.content[0]) return response.content[0].text;
    }
    if (provider === "openai") {
      if (response.choices && response.choices[0]) return response.choices[0].message.content;
    }
    if (provider === "google") {
      if (response.candidates && response.candidates[0]) return response.candidates[0].content.parts[0].text;
    }
    if (response.error) return "Error: " + (response.error.message || response.error);
  } catch (e) {}
  return "";
}

export default function Playground() {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState(null);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showRaw, setShowRaw] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    setAiText("");
    setShowRaw(false);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const duration = Date.now() - startTime;
      setResponse(data);
      const text = extractAIText(data, provider);
      setAiText(text);
      setHistory((prev) => [
        {
          prompt: prompt.slice(0, 60) + (prompt.length > 60 ? "..." : ""),
          cached: data.tokensave_meta?.cache_hit || false,
          model: data.tokensave_meta?.model_used || "cached",
          duration: duration,
        },
        ...prev,
      ].slice(0, 10));
    } catch (err) {
      setResponse({ error: err.message });
      setAiText("Request failed: " + err.message);
    }
    setLoading(false);
  };

  const resendForCache = () => {
    sendRequest();
  };

  const meta = response?.tokensave_meta;
  const isCacheHit = meta?.cache_hit;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300">Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Playground</h1>
          <p className="text-gray-500 text-sm mt-1">Test the TokenSave proxy and see optimizations in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Provider</label>
                  <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 focus:outline-none focus:border-cyan-400 text-sm">
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="google">Google (Gemini)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">API Key</label>
                  <input type="password" placeholder="Paste your API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm" />
                  <p className="text-gray-600 text-xs mt-1.5">Your key is sent directly to the provider. We never store it.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Prompt</h2>
              <textarea
                placeholder="Type your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm resize-none"
              />
              <button
                onClick={sendRequest}
                disabled={loading || !apiKey || !prompt}
                className="w-full mt-4 py-2.5 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 text-sm"
              >
                {loading ? "Processing..." : "Send Request"}
              </button>
            </div>

            {history.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Session history</h2>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-800/50 last:border-0">
                      <span className="text-gray-400 truncate flex-1 mr-4">{h.prompt}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {h.cached ? (
                          <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded font-medium">Cached</span>
                        ) : (
                          <span className="text-gray-500 text-xs bg-gray-800 px-2 py-0.5 rounded">{h.model}</span>
                        )}
                        <span className="text-gray-600 text-xs">{h.duration}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {meta && (
              <div className={`border rounded-xl p-6 ${isCacheHit ? "bg-green-400/5 border-green-400/30" : "bg-gray-900 border-gray-800"}`}>
                <h2 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Optimization results</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-lg p-3 ${isCacheHit ? "bg-green-400/10 border border-green-400/20" : "bg-gray-950 border border-gray-800"}`}>
                    <p className="text-gray-500 text-xs mb-1">Cache</p>
                    <p className={`text-sm font-semibold ${isCacheHit ? "text-green-400" : "text-gray-400"}`}>
                      {isCacheHit ? "Hit — 100% saved!" : "Miss — first request"}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Model used</p>
                    <p className="text-sm font-semibold text-cyan-400 font-mono">{meta.model_used || "Cached"}</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Complexity</p>
                    <p className="text-sm font-semibold text-gray-300 capitalize">{meta.complexity || "N/A"}</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Chars compressed</p>
                    <p className="text-sm font-semibold text-green-400">{meta.chars_saved || 0}</p>
                  </div>
                </div>

                {!isCacheHit && (
                  <div className="mt-4 p-3 bg-cyan-400/5 border border-cyan-400/20 rounded-lg">
                    <p className="text-cyan-400 text-sm mb-2">Try the cache: send the exact same prompt again to see a cache hit!</p>
                    <button
                      onClick={resendForCache}
                      disabled={loading}
                      className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-400/20 transition-colors disabled:opacity-40"
                    >
                      {loading ? "Processing..." : "Resend Same Prompt"}
                    </button>
                  </div>
                )}

                {isCacheHit && (
                  <div className="mt-4 p-3 bg-green-400/5 border border-green-400/20 rounded-lg">
                    <p className="text-green-400 text-sm font-medium">Cache hit! This response was served instantly from cache — zero API cost, zero latency.</p>
                  </div>
                )}
              </div>
            )}

            {aiText && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI Response</h2>
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showRaw ? "Show formatted" : "Show raw JSON"}
                  </button>
                </div>
                {showRaw ? (
                  <pre className="text-sm text-gray-400 whitespace-pre-wrap bg-gray-950 border border-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto font-mono">{JSON.stringify(response, null, 2)}</pre>
                ) : (
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-950 border border-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">{aiText}</div>
                )}
              </div>
            )}

            {!response && !loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center py-16">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-xl mx-auto mb-4">?</div>
                <p className="text-gray-500 text-sm mb-2">Send a request to see the response here</p>
                <p className="text-gray-600 text-xs">The optimization results will show cache status, model routing, and compression stats</p>
              </div>
            )}

            {loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center py-16">
                <div className="w-12 h-12 bg-cyan-400/10 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-400 text-sm">Optimizing and forwarding your request...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}