"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">TS</div>
          <span className="text-xl font-bold">TokenSave</span>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => router.push("/login")} className="px-4 py-2 text-gray-400 hover:text-white text-sm hidden sm:block">Sign In</button>
          <button onClick={() => router.push("/login")} className="px-5 py-2 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300">Start Free Trial</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-12 md:pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 bg-cyan-400/10 text-cyan-400 rounded-full text-sm font-medium mb-6 border border-cyan-400/20">Built for developer teams</div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">Reduce your AI API costs <br className="hidden md:block" /><span className="text-cyan-400">by 50-60%</span></h1>
          <p className="text-gray-400 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">TokenSave is an intelligent middleware layer that sits between your application and AI providers. We optimize every request through caching, smart routing, and prompt compression.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button onClick={() => router.push("/login")} className="px-8 py-3.5 bg-cyan-400 text-gray-950 rounded-lg font-semibold hover:bg-cyan-300 text-base">Start 14-Day Free Trial</button>
            <button onClick={() => router.push("/playground")} className="px-8 py-3.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-900 text-base">Live Demo</button>
          </div>
          <p className="text-gray-600 text-sm">No credit card required. Set up in under 2 minutes.</p>
        </div>

        <div className="mt-16 md:mt-20 mb-16 md:mb-20">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-cyan-400/10 border border-cyan-400/20 rounded-full flex items-center justify-center text-cyan-400 font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Connect your API keys</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Add your Claude, GPT, or Gemini API keys to your TokenSave dashboard. Takes 30 seconds.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-cyan-400/10 border border-cyan-400/20 rounded-full flex items-center justify-center text-cyan-400 font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Replace one URL</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Swap your AI provider endpoint with your TokenSave proxy URL. One line of code.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-cyan-400/10 border border-cyan-400/20 rounded-full flex items-center justify-center text-cyan-400 font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Watch your costs drop</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Every request is automatically cached, routed, and compressed. See savings in real-time.</p>
            </div>
          </div>
        </div>

        <div className="mb-16 md:mb-20">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-3xl font-bold mb-4">Three engines working together</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Each request passes through our optimization pipeline before reaching the AI provider.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-green-400/10 rounded-lg flex items-center justify-center text-green-400 text-lg font-bold mb-4">C</div>
              <h3 className="font-semibold text-lg mb-2">Semantic Cache</h3>
              <p className="text-gray-400 text-sm leading-relaxed">If a similar query was answered before, we return the cached response instantly. Zero API cost, zero latency, same quality.</p>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-green-400 text-sm font-medium">Saves up to 100% on repeated queries</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-blue-400/10 rounded-lg flex items-center justify-center text-blue-400 text-lg font-bold mb-4">R</div>
              <h3 className="font-semibold text-lg mb-2">Model Router</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Simple tasks like Q&A route to cost-efficient models. Complex tasks like coding route to powerful models. Automatic.</p>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-blue-400 text-sm font-medium">Saves 60-80% on simple tasks</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-purple-400/10 rounded-lg flex items-center justify-center text-purple-400 text-lg font-bold mb-4">P</div>
              <h3 className="font-semibold text-lg mb-2">Prompt Compressor</h3>
              <p className="text-gray-400 text-sm leading-relaxed">We remove redundant words and whitespace from every prompt. Same meaning, fewer tokens, lower cost per request.</p>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-purple-400 text-sm font-medium">Saves 10-30% per request</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16 md:mb-20 bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Simple integration</h2>
            <p className="text-gray-500">Replace one URL in your existing code. Everything else stays the same.</p>
          </div>
          <div className="bg-gray-950 rounded-xl p-4 md:p-6 font-mono text-sm overflow-x-auto">
            <p className="text-gray-500 mb-1">{"// Before (calling AI directly)"}</p>
            <p className="text-red-400/70 mb-3">{"fetch(\"https://api.anthropic.com/v1/messages\", { ... })"}</p>
            <p className="text-gray-500 mb-1">{"// After (through TokenSave)"}</p>
            <p className="text-green-400">{"fetch(\"https://tokensave.vercel.app/api/proxy\", { ... })"}</p>
          </div>
        </div>

        <div className="mb-16 md:mb-20">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-3xl font-bold mb-4">Pricing</h2>
            <p className="text-gray-500">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8">
              <h3 className="font-semibold text-lg mb-1">Starter</h3>
              <div className="mb-1"><span className="text-4xl font-bold">$99</span><span className="text-gray-500">/mo</span></div>
              <p className="text-gray-500 text-sm mb-6">For small startups</p>
              <div className="space-y-3 text-sm text-gray-400">
                <p>Up to 50,000 requests/mo</p>
                <p>Smart caching</p>
                <p>Model routing</p>
                <p>Basic analytics dashboard</p>
              </div>
              <button onClick={() => router.push("/login")} className="w-full mt-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">Get Started</button>
            </div>
            <div className="bg-gray-900 border-2 border-cyan-400 rounded-xl p-6 md:p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-400 text-gray-950 text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
              <h3 className="font-semibold text-lg mb-1">Growth</h3>
              <div className="mb-1"><span className="text-4xl font-bold">$499</span><span className="text-gray-500">/mo</span></div>
              <p className="text-gray-500 text-sm mb-6">For growing teams</p>
              <div className="space-y-3 text-sm text-gray-400">
                <p>Up to 500,000 requests/mo</p>
                <p>Everything in Starter</p>
                <p>Prompt compression</p>
                <p>Team management</p>
                <p>Priority support</p>
              </div>
              <button onClick={() => router.push("/login")} className="w-full mt-6 py-2.5 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">Get Started</button>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8">
              <h3 className="font-semibold text-lg mb-1">Enterprise</h3>
              <div className="mb-1"><span className="text-4xl font-bold">Custom</span></div>
              <p className="text-gray-500 text-sm mb-6">For large organizations</p>
              <div className="space-y-3 text-sm text-gray-400">
                <p>Unlimited requests</p>
                <p>Everything in Growth</p>
                <p>Custom routing rules</p>
                <p>Dedicated account manager</p>
                <p>SLA guarantee</p>
              </div>
              <button onClick={() => window.location.href = "mailto:prathamg200404@gmail.com?subject=TokenSave Enterprise"} className="w-full mt-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">Contact Sales</button>
            </div>
          </div>
        </div>

        <div className="text-center py-12 md:py-16 bg-gray-900 border border-gray-800 rounded-2xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Start saving today</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">14-day free trial. No credit card required. Set up in under 2 minutes.</p>
          <button onClick={() => router.push("/login")} className="px-8 py-3.5 bg-cyan-400 text-gray-950 rounded-lg font-semibold hover:bg-cyan-300 text-base">Get Started Free</button>
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-6xl mx-auto px-6 md:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-sm">
        <p>© 2026 TokenSave. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="/docs" className="hover:text-gray-400">Documentation</a>
          <a href="mailto:prathamg200404@gmail.com" className="hover:text-gray-400">Contact</a>
        </div>
      </footer>
    </div>
  );
}