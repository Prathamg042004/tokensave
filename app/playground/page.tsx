"use client";
import { useState } from "react";

export default function Playground() {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ error: err.message });
    }
    setLoading(false);
  };

  const meta = response?.tokensave_meta;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-800/50 max-w-5xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300">Back to Dashboard</a>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Playground</h1>
          <p className="text-gray-500 text-sm mt-1">Test the TokenSave proxy with your own API key</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
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
              <textarea placeholder="Type your prompt here..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm resize-none" />
              <button onClick={sendRequest} disabled={loading || !apiKey || !prompt} className="w-full mt-4 py-2.5 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 text-sm">
                {loading ? "Processing..." : "Send Request"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {meta && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Optimization results</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Cache</p>
                    <p className={`text-sm font-semibold ${meta.cache_hit ? "text-green-400" : "text-gray-400"}`}>{meta.cache_hit ? "Hit — 100% saved" : "Miss — first request"}</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Model used</p>
                    <p className="text-sm font-semibold text-cyan-400">{meta.model_used || "Cached"}</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Complexity</p>
                    <p className="text-sm font-semibold text-gray-300">{meta.complexity || "N/A"}</p>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Chars saved</p>
                    <p className="text-sm font-semibold text-green-400">{meta.chars_saved || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {response && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Response</h2>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-950 border border-gray-800 rounded-lg p-4 max-h-80 overflow-y-auto">{JSON.stringify(response, null, 2)}</pre>
              </div>
            )}

            {!response && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                <div className="text-gray-700 text-4xl mb-3">{"{ }"}</div>
                <p className="text-gray-500 text-sm">Send a request to see the response and optimization results here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}