"use client";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-cyan-400">TokenSave</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push("/login")} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Sign In</button>
          <button onClick={() => router.push("/login")} className="px-4 py-2 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300">Start Free Trial</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-20 text-center">
        <div className="inline-block px-4 py-1 bg-cyan-400/10 text-cyan-400 rounded-full text-sm mb-6">Save 50-60% on AI API costs</div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">Stop overpaying for<br /><span className="text-cyan-400">AI API calls</span></h1>
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">TokenSave sits between your app and AI providers like Claude, GPT, and Gemini. We automatically cache, route, and compress every request to cut your bill by 50-60%.</p>
        <div className="flex gap-4 justify-center mb-16">
          <button onClick={() => router.push("/login")} className="px-8 py-3 bg-cyan-400 text-gray-950 rounded-lg font-semibold hover:bg-cyan-300 text-lg">Start 14-Day Free Trial</button>
          <button onClick={() => router.push("/playground")} className="px-8 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 text-lg">Try Playground</button>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-20">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
            <span className="text-3xl mb-3 block">💾</span>
            <h3 className="font-semibold text-lg mb-2">Smart Cache</h3>
            <p className="text-gray-400 text-sm">Similar query asked before? We return the cached answer instantly. Zero API cost, zero latency.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
            <span className="text-3xl mb-3 block">🔀</span>
            <h3 className="font-semibold text-lg mb-2">Model Router</h3>
            <p className="text-gray-400 text-sm">Simple questions go to cheap models. Complex tasks go to powerful ones. You save money without losing quality.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
            <span className="text-3xl mb-3 block">✂️</span>
            <h3 className="font-semibold text-lg mb-2">Prompt Compressor</h3>
            <p className="text-gray-400 text-sm">We strip filler words and redundancy from every prompt. Same meaning, fewer tokens, lower cost.</p>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-10">Simple pricing</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-1">Starter</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-1"><span className="text-sm text-gray-500">/mo</span></p>
              <p className="text-gray-500 text-sm mb-4">For small startups</p>
              <ul className="text-sm text-gray-400 space-y-2 text-left">
                <li>✓ Up to 50K requests/mo</li>
                <li>✓ Smart caching</li>
                <li>✓ Model routing</li>
                <li>✓ Basic dashboard</li>
              </ul>
            </div>
            <div className="bg-gray-900 border-2 border-cyan-400 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-400 text-gray-950 text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              <h3 className="font-semibold text-lg mb-1">Growth</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-1"><span className="text-sm text-gray-500">/mo</span></p>
              <p className="text-gray-500 text-sm mb-4">For growing teams</p>
              <ul className="text-sm text-gray-400 space-y-2 text-left">
                <li>✓ Up to 500K requests/mo</li>
                <li>✓ Everything in Starter</li>
                <li>✓ Prompt compression</li>
                <li>✓ Team management</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-1">Enterprise</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-1">Custom</p>
              <p className="text-gray-500 text-sm mb-4">For large companies</p>
              <ul className="text-sm text-gray-400 space-y-2 text-left">
                <li>✓ Unlimited requests</li>
                <li>✓ Everything in Growth</li>
                <li>✓ Custom routing rules</li>
                <li>✓ Dedicated support</li>
                <li>✓ SLA guarantee</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to cut your AI costs?</h2>
          <p className="text-gray-400 mb-6">Start your free 14-day trial. No credit card required.</p>
          <button onClick={() => router.push("/login")} className="px-8 py-3 bg-cyan-400 text-gray-950 rounded-lg font-semibold hover:bg-cyan-300 text-lg">Get Started Free</button>
        </div>
      </div>

      <footer className="border-t border-gray-800 px-8 py-6 text-center text-gray-500 text-sm mt-20">© 2026 TokenSave. All rights reserved.</footer>
    </div>
  );
}
