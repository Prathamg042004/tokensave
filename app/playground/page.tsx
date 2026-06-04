"use client";
import { useState } from "react";

export default function Playground() {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-cyan-400">TokenSave Playground</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Your Proxy</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">AI Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-cyan-400">
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Your API Key</label>
              <input type="password" placeholder="Paste your API key here" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400" />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Your Prompt</label>
              <textarea placeholder="Type your prompt here..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none" />
            </div>

            <button onClick={sendRequest} disabled={loading || !apiKey || !prompt} className="w-full py-3 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50">
              {loading ? "Processing..." : "Send through TokenSave"}
            </button>
          </div>
        </div>

        {response && (
          <div className="space-y-4">
            {response.tokensave_meta && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-md font-semibold mb-3 text-green-400">TokenSave Optimization Results</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Cache Hit</p>
                    <p className={"font-bold " + (response.tokensave_meta.cache_hit ? "text-green-400" : "text-amber-400")}>{response.tokensave_meta.cache_hit ? "Yes (100% saved!)" : "No (first request)"}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Model Used</p>
                    <p className="font-bold text-cyan-400">{response.tokensave_meta.model_used || "Cached"}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Complexity</p>
                    <p className="font-bold text-purple-400">{response.tokensave_meta.complexity || "N/A"}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Characters Saved</p>
                    <p className="font-bold text-emerald-400">{response.tokensave_meta.chars_saved || 0}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-md font-semibold mb-3">AI Response</h3>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">{JSON.stringify(response, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
