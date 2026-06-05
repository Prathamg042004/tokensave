"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); } else { router.push("/login"); }
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-400 border border-red-400/20 rounded-lg">Log Out</button>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Your API Endpoint</h2>
          <p className="text-gray-400 text-sm mb-3">Replace your AI provider URL with this:</p>
          <div className="bg-gray-800 rounded-lg p-4 font-mono text-cyan-400 text-sm">https://tokensave.vercel.app/api/proxy</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <a href="/playground" className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400 transition-colors">
            <h3 className="font-semibold text-cyan-400 mb-1">Playground</h3>
            <p className="text-gray-500 text-sm">Test the proxy with your API key</p>
          </a>
          <a href="/" className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-400 transition-colors">
            <h3 className="font-semibold text-cyan-400 mb-1">Landing Page</h3>
            <p className="text-gray-500 text-sm">View your public landing page</p>
          </a>
        </div>
      </div>
    </div>
  );
}