"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("TokenSave Error:", error);
    // In production, send to Sentry or similar
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center px-6">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="relative z-10 text-center max-w-md">
        <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-6">!</div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-[14px] mb-6">An unexpected error occurred. Our team has been notified.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity">Try again</button>
          <a href="/" className="px-6 py-2.5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-xl text-[13px] hover:bg-white/[0.06] transition-colors">Go home</a>
        </div>
        <p className="mt-8 text-[11px] text-gray-700 font-mono break-all">{error.message}</p>
      </div>
    </div>
  );
}"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("TokenSave Error:", error);
    // In production, send to Sentry or similar
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center px-6">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="relative z-10 text-center max-w-md">
        <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-6">!</div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-[14px] mb-6">An unexpected error occurred. Our team has been notified.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity">Try again</button>
          <a href="/" className="px-6 py-2.5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-xl text-[13px] hover:bg-white/[0.06] transition-colors">Go home</a>
        </div>
        <p className="mt-8 text-[11px] text-gray-700 font-mono break-all">{error.message}</p>
      </div>
    </div>
  );
}