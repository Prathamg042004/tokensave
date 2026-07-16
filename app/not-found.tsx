import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100 px-6">
      <div className="w-12 h-12 bg-cyan-400 rounded-xl flex items-center justify-center text-gray-950 font-bold text-xl mb-6">TS</div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-gray-500 text-sm mb-6">This page doesn&apos;t exist or has been moved.</p>
      <div className="flex gap-4">
        <Link href="/" className="px-6 py-2.5 bg-cyan-400 text-gray-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors">Go Home</Link>
        <Link href="/docs" className="px-6 py-2.5 border border-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-900 transition-colors">View Docs</Link>
      </div>
    </div>
  );
}