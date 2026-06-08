"use client";

export default function Docs() {
  const proxyUrl = "https://tokensave.vercel.app/api/proxy";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <div className="flex gap-4">
          <a href="/playground" className="text-sm text-gray-500 hover:text-gray-300">Playground</a>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300">Dashboard</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
        <p className="text-gray-500 mb-10">Everything you need to integrate TokenSave into your application.</p>

        <div className="space-y-12">

          <section>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-800">Quick start</h2>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">TokenSave works as a drop-in replacement for your AI provider's API endpoint. Replace one URL in your code and every request is automatically optimized through caching, smart model routing, and prompt compression.</p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900">
                <span className="text-xs text-gray-500 font-mono">3-step setup</span>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <div className="flex gap-3">
                  <span className="text-cyan-400 font-mono shrink-0">1.</span>
                  <p className="text-gray-300">Sign up at <a href="/login" className="text-cyan-400 hover:underline">tokensave.vercel.app/login</a> and get your TokenSave API key from the dashboard.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-cyan-400 font-mono shrink-0">2.</span>
                  <p className="text-gray-300">Replace your AI provider URL with <span className="text-cyan-400 font-mono">{proxyUrl}</span></p>
                </div>
                <div className="flex gap-3">
                  <span className="text-cyan-400 font-mono shrink-0">3.</span>
                  <p className="text-gray-300">Pass your provider API key in the request body. That&apos;s it.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-800">POST /api/proxy</h2>
            <p className="text-gray-400 text-sm mb-4">Send AI requests through the TokenSave optimization pipeline.</p>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Request body</h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3 font-mono text-cyan-400">provider</td>
                      <td className="px-4 py-3 text-gray-500">string</td>
                      <td className="px-4 py-3 text-gray-500">Yes</td>
                      <td className="px-4 py-3 text-gray-400">&quot;anthropic&quot;, &quot;openai&quot;, or &quot;google&quot;</td>
                    </tr>
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3 font-mono text-cyan-400">apiKey</td>
                      <td className="px-4 py-3 text-gray-500">string</td>
                      <td className="px-4 py-3 text-gray-500">Yes</td>
                      <td className="px-4 py-3 text-gray-400">Your AI provider API key</td>
                    </tr>
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3 font-mono text-cyan-400">messages</td>
                      <td className="px-4 py-3 text-gray-500">array</td>
                      <td className="px-4 py-3 text-gray-500">Yes</td>
                      <td className="px-4 py-3 text-gray-400">Array of message objects with role and content</td>
                    </tr>
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3 font-mono text-cyan-400">tsKey</td>
                      <td className="px-4 py-3 text-gray-500">string</td>
                      <td className="px-4 py-3 text-gray-500">No</td>
                      <td className="px-4 py-3 text-gray-400">Your TokenSave API key for tracking and higher rate limits</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-cyan-400">model</td>
                      <td className="px-4 py-3 text-gray-500">string</td>
                      <td className="px-4 py-3 text-gray-500">No</td>
                      <td className="px-4 py-3 text-gray-400">Override auto-routing with a specific model name</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Example — cURL</h3>
              <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400 overflow-x-auto">{`curl -X POST ${proxyUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "anthropic",
    "apiKey": "sk-ant-your-key",
    "tsKey": "ts_live_your-tokensave-key",
    "messages": [
      { "role": "user", "content": "What is the capital of France?" }
    ]
  }'`}</pre>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Example — JavaScript</h3>
              <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400 overflow-x-auto">{`const response = await fetch("${proxyUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "anthropic",
    apiKey: "sk-ant-your-key",
    tsKey: "ts_live_your-tokensave-key",
    messages: [
      { role: "user", content: "What is the capital of France?" }
    ]
  })
});

const data = await response.json();
console.log(data);`}</pre>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Example — Python</h3>
              <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400 overflow-x-auto">{`import requests

response = requests.post(
    "${proxyUrl}",
    json={
        "provider": "anthropic",
        "apiKey": "sk-ant-your-key",
        "tsKey": "ts_live_your-tokensave-key",
        "messages": [
            {"role": "user", "content": "What is the capital of France?"}
        ]
    }
)

print(response.json())`}</pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Response</h3>
              <p className="text-gray-400 text-sm mb-3">The response includes the original AI provider response plus a <span className="font-mono text-cyan-400">tokensave_meta</span> object with optimization details.</p>
              <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400 overflow-x-auto">{`{
  // Original AI provider response fields...
  "tokensave_meta": {
    "cache_hit": false,
    "model_used": "claude-haiku-4-5-20241022",
    "complexity": "simple",
    "chars_saved": 12,
    "method": "routed_to_cheap",
    "rate_limit_remaining": 55
  }
}`}</pre>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-800">Optimization features</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Semantic cache</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Identical requests are cached for 30 minutes. When a cache hit occurs, the response is returned instantly with zero API cost. The <span className="font-mono text-cyan-400">cache_hit</span> field in tokensave_meta indicates whether the response was served from cache.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Model routing</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">TokenSave analyzes each request and routes it to the most cost-effective model. Simple queries (short, factual) go to cheaper models; complex queries (coding, analysis, long-form) go to capable models.</p>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3">Simple tasks</th>
                        <th className="px-4 py-3">Complex tasks</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-gray-800/50">
                        <td className="px-4 py-3">Anthropic</td>
                        <td className="px-4 py-3 font-mono text-green-400 text-xs">claude-haiku-4-5</td>
                        <td className="px-4 py-3 font-mono text-cyan-400 text-xs">claude-sonnet-4</td>
                      </tr>
                      <tr className="border-b border-gray-800/50">
                        <td className="px-4 py-3">OpenAI</td>
                        <td className="px-4 py-3 font-mono text-green-400 text-xs">gpt-4o-mini</td>
                        <td className="px-4 py-3 font-mono text-cyan-400 text-xs">gpt-4o</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Google</td>
                        <td className="px-4 py-3 font-mono text-green-400 text-xs">gemini-2.0-flash-lite</td>
                        <td className="px-4 py-3 font-mono text-cyan-400 text-xs">gemini-2.0-flash</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Prompt compression</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Filler words, extra whitespace, and redundant phrases are automatically removed from prompts before forwarding. The <span className="font-mono text-cyan-400">chars_saved</span> field shows how many characters were compressed.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-800">Rate limits</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">The API enforces rate limits per TokenSave key (or per IP if no key is provided).</p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Rate limit</th>
                    <th className="px-4 py-3">Cache TTL</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800/50">
                    <td className="px-4 py-3">Free trial</td>
                    <td className="px-4 py-3">60 requests/minute</td>
                    <td className="px-4 py-3">30 minutes</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="px-4 py-3">Starter</td>
                    <td className="px-4 py-3">200 requests/minute</td>
                    <td className="px-4 py-3">60 minutes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Growth / Enterprise</td>
                    <td className="px-4 py-3">Unlimited</td>
                    <td className="px-4 py-3">Configurable</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500 text-sm mt-3">Rate limit headers <span className="font-mono text-gray-400">X-RateLimit-Remaining</span> and <span className="font-mono text-gray-400">X-RateLimit-Limit</span> are included in every response.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-800">Error codes</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800/50">
                    <td className="px-4 py-3 font-mono">400</td>
                    <td className="px-4 py-3 text-gray-400">Missing required fields (messages, apiKey)</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="px-4 py-3 font-mono">429</td>
                    <td className="px-4 py-3 text-gray-400">Rate limit exceeded. Wait and retry.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">500</td>
                    <td className="px-4 py-3 text-gray-400">Server error or AI provider error</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="pb-8">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-800">Support</h2>
            <p className="text-gray-400 text-sm">Questions or issues? Email <a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 hover:underline">prathamg200404@gmail.com</a> or try the <a href="/playground" className="text-cyan-400 hover:underline">Playground</a> to test your integration.</p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-4xl mx-auto px-6 md:px-8 py-8 text-center text-gray-600 text-sm">© 2026 TokenSave. All rights reserved.</footer>
    </div>
  );
}