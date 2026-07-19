"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center px-6">
      <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-6">!</div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Something went wrong</h1>
      <p className="text-gray-500 text-sm mb-6">An unexpected error occurred.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-sm font-semibold hover:opacity-90">Try again</button>
        <a href="/" className="px-6 py-2.5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-xl text-sm hover:bg-white/[0.06]">Go home</a>
      </div>
      <p className="mt-8 text-xs text-gray-700 font-mono break-all">{error.message}</p>
    </div>
  );
}