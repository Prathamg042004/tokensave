"use client";

export default function Security() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <div className="flex gap-4">
          <a href="/docs" className="text-sm text-gray-500 hover:text-gray-300">Docs</a>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300">Dashboard</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Security & Trust</h1>
        <p className="text-gray-500 mb-10">How TokenSave protects your data and API keys.</p>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-400/10 rounded-lg flex items-center justify-center text-green-400 font-bold">1</div>
              <h2 className="text-xl font-semibold">Zero-knowledge SDK — keys never leave your server</h2>
            </div>
            <div className="pl-14 space-y-3">
              <p className="text-gray-400 text-sm leading-relaxed">Our recommended integration is the TokenSave SDK, which runs entirely inside your own infrastructure. Your API keys are used locally to make direct calls to AI providers. They are never transmitted to TokenSave servers.</p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">How the SDK works</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs shrink-0">✓</div><span className="text-gray-300">Caching happens in-memory on your server</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs shrink-0">✓</div><span className="text-gray-300">Model routing decisions made locally</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs shrink-0">✓</div><span className="text-gray-300">Prompt compression runs on your machine</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs shrink-0">✓</div><span className="text-gray-300">API calls go directly from your server to the AI provider</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-green-400/10 rounded flex items-center justify-center text-green-400 text-xs shrink-0">✓</div><span className="text-gray-300">Only anonymous usage counts are sent to our dashboard</span></div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Data flow diagram</p>
                <pre className="text-sm text-gray-400 overflow-x-auto">{`Your App → TokenSave SDK (your server) → AI Provider
                     ↓
              Anonymous stats only
              (request count, tokens saved)
                     ↓
            TokenSave Dashboard`}</pre>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-400/10 rounded-lg flex items-center justify-center text-cyan-400 font-bold">2</div>
              <h2 className="text-xl font-semibold">Self-hosting option — run on your own servers</h2>
            </div>
            <div className="pl-14 space-y-3">
              <p className="text-gray-400 text-sm leading-relaxed">For maximum control, TokenSave can be deployed entirely within your own infrastructure. Our code is open source — you can audit every line before deploying.</p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Self-hosting benefits</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-cyan-400/10 rounded flex items-center justify-center text-cyan-400 text-xs shrink-0">✓</div><span className="text-gray-300">Full data sovereignty — nothing leaves your network</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-cyan-400/10 rounded flex items-center justify-center text-cyan-400 text-xs shrink-0">✓</div><span className="text-gray-300">Audit the source code on GitHub before deploying</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-cyan-400/10 rounded flex items-center justify-center text-cyan-400 text-xs shrink-0">✓</div><span className="text-gray-300">Deploy with Docker in under 5 minutes</span></div>
                  <div className="flex items-center gap-3"><div className="w-5 h-5 bg-cyan-400/10 rounded flex items-center justify-center text-cyan-400 text-xs shrink-0">✓</div><span className="text-gray-300">Compliant with SOC 2, GDPR, HIPAA requirements</span></div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-400/10 rounded-lg flex items-center justify-center text-purple-400 font-bold">3</div>
              <h2 className="text-xl font-semibold">Cloud proxy — what data we handle</h2>
            </div>
            <div className="pl-14 space-y-3">
              <p className="text-gray-400 text-sm leading-relaxed">If you choose our cloud proxy option (for simplicity), here is exactly what happens with your data:</p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider text-left border-b border-gray-800">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Stored?</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3">API keys</td>
                      <td className="px-4 py-3 text-red-400 font-medium">Never</td>
                      <td className="px-4 py-3 text-gray-500">Forwarded to provider and immediately discarded from memory</td>
                    </tr>
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3">Prompts</td>
                      <td className="px-4 py-3 text-amber-400 font-medium">Hashed only</td>
                      <td className="px-4 py-3 text-gray-500">A one-way hash is stored for cache matching. Original text is not stored.</td>
                    </tr>
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3">Responses</td>
                      <td className="px-4 py-3 text-amber-400 font-medium">Cached 30m</td>
                      <td className="px-4 py-3 text-gray-500">Encrypted in Redis. Auto-deleted after 30 minutes.</td>
                    </tr>
                    <tr className="border-b border-gray-800/50">
                      <td className="px-4 py-3">Usage stats</td>
                      <td className="px-4 py-3 text-green-400 font-medium">Yes</td>
                      <td className="px-4 py-3 text-gray-500">Request count, tokens saved, cache hits. Used for your dashboard.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">IP addresses</td>
                      <td className="px-4 py-3 text-red-400 font-medium">Never</td>
                      <td className="px-4 py-3 text-gray-500">Used for rate limiting only. Not logged or stored.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-400/10 rounded-lg flex items-center justify-center text-amber-400 font-bold">4</div>
              <h2 className="text-xl font-semibold">Open source transparency</h2>
            </div>
            <div className="pl-14 space-y-3">
              <p className="text-gray-400 text-sm leading-relaxed">Our entire codebase is open source. You can audit exactly what happens with your requests before you integrate. We believe transparency is the foundation of trust.</p>
              <a href="https://github.com/Prathamg042004/tokensave" target="_blank" className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-300 hover:border-gray-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                View on GitHub
              </a>
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-4">Choose your integration level</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
                <div className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Most secure</div>
                <h3 className="font-semibold mb-2">SDK</h3>
                <p className="text-gray-500 text-sm">Keys never leave your server. All optimization runs locally.</p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
                <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">Full control</div>
                <h3 className="font-semibold mb-2">Self-hosted</h3>
                <p className="text-gray-500 text-sm">Run TokenSave on your own infrastructure. Audit every line.</p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
                <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">Fastest setup</div>
                <h3 className="font-semibold mb-2">Cloud proxy</h3>
                <p className="text-gray-500 text-sm">One URL swap. Keys forwarded and never stored.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Questions?</h2>
            <p className="text-gray-400 text-sm">Reach out at <a href="mailto:prathamg200404@gmail.com" className="text-cyan-400 hover:underline">prathamg200404@gmail.com</a> for a security walkthrough or to discuss enterprise requirements.</p>
          </section>
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-4xl mx-auto px-6 md:px-8 py-8 text-center text-gray-600 text-sm">© 2026 TokenSave. All rights reserved.</footer>
    </div>
  );
}