import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center text-gray-100 px-6 relative overflow-hidden">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="relative z-10 text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-8">TS</div>
        <h1 className="text-[72px] font-bold tracking-tight bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent">404</h1>
        <p className="text-gray-500 text-[15px] mb-8 mt-2">This page doesn&apos;t exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity">Go home</Link>
          <Link href="/docs" className="px-6 py-2.5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-xl text-[13px] hover:bg-white/[0.06] transition-colors">View docs</Link>
        </div>
      </div>
    </div>
  );
}