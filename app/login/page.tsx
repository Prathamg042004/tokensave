"use client";
import { useState } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setMessage(error.message); } else { setMessage("Check your email to confirm your account!"); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage(error.message); } else { router.push("/dashboard"); }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <nav className="px-8 py-5">
        <a href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">TS</div>
          <span className="text-xl font-bold text-gray-100">TokenSave</span>
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-100 text-center mb-2">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            {isSignUp ? "Start your 14-day free trial" : "Sign in to your dashboard"}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50 text-sm mt-2"
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </div>

          {message && (
            <p className={`mt-4 text-center text-sm ${message.includes("Check") ? "text-green-400" : "text-red-400"}`}>{message}</p>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }} className="text-cyan-400 hover:underline">
              {isSignUp ? "Sign In" : "Start Free Trial"}
            </button>
          </p>
        </div>
      </div>

      <footer className="px-8 py-6 text-center text-gray-700 text-xs">© 2026 TokenSave</footer>
    </div>
  );
}