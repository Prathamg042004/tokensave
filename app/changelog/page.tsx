"use client";

const updates = [
  {
    date: "July 2026",
    version: "1.3.0",
    title: "Batch Processing & Context Manager",
    changes: [
      "Batch API — process up to 50 prompts in a single request",
      "Context window manager — auto-trim old messages to save tokens",
      "Budget alerts with progress bar and warning banners",
      "Request history with search and filtering",
      "TokenSave API key generation per user",
    ],
  },
  {
    date: "July 2026",
    version: "1.2.0",
    title: "Advanced Playground",
    changes: [
      "Chat Mode — multi-turn conversations with optimization on every message",
      "Compare Providers — side-by-side cost and quality comparison",
      "Cost calculator — see exact savings on every request",
      "Prompt templates — one-click presets for common tasks",
      "File upload — attach TXT, CSV, JSON files to prompts",
      "Response export — copy or download AI responses",
      "Groq (Llama) — free provider for unlimited testing",
    ],
  },
  {
    date: "June 2026",
    version: "1.1.0",
    title: "Security & Trust",
    changes: [
      "Zero-knowledge SDK — API keys never leave your server",
      "Security & trust page with data flow transparency",
      "Rate limiting — 60 requests per minute per key",
      "API documentation with cURL, JavaScript, and Python examples",
      "Demo Mode in playground — test without any API key",
    ],
  },
  {
    date: "June 2026",
    version: "1.0.0",
    title: "Initial Launch",
    changes: [
      "Semantic caching — 100% savings on repeated queries",
      "Intelligent model routing — simple to cheap, complex to powerful",
      "Prompt compression — removes filler words to save tokens",
      "Support for Anthropic, OpenAI, Google, and Groq",
      "Real-time dashboard with 7-day usage chart",
      "Professional landing page with pricing",
      "GitHub OAuth and email/password authentication",
    ],
  },
];

export default function Changelog() {
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
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-gray-500 mb-10">What&apos;s new in TokenSave. We ship updates frequently.</p>

        <div className="space-y-12">
          {updates.map((update, i) => (
            <div key={i} className="relative pl-8 border-l-2 border-gray-800">
              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-cyan-400 rounded-full border-4 border-gray-950"></div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-500 text-sm">{update.date}</span>
                <span className="px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded text-cyan-400 text-xs font-mono">{update.version}</span>
              </div>
              <h2 className="text-xl font-semibold mb-4">{update.title}</h2>
              <div className="space-y-2">
                {update.changes.map((change, j) => (
                  <div key={j} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 mt-0.5 shrink-0">+</span>
                    <span className="text-gray-400">{change}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-4xl mx-auto px-6 md:px-8 py-8 text-center text-gray-600 text-sm">© 2026 TokenSave. All rights reserved.</footer>
    </div>
  );
}