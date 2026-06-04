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
      if (error) { setMessage(error.message); } else { router.push("/"); }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="text-3xl">⚡</span>
          <span className="text-2xl font-bold text-cyan-400">TokenSave</span>
        </div>
        <h2 className="text-center text-gray-300 mb-6">{isSignUp ? "Create your account" : "Sign in to your account"}</h2>
        <div className="flex flex-col gap-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400" />
          <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50">{loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}</button>
        </div>
        {message && <p className="mt-4 text-center text-sm text-amber-400">{message}</p>}
        <p className="mt-6 text-center text-sm text-gray-500">{isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}<button onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }} className="text-cyan-400 hover:underline">{isSignUp ? "Sign In" : "Sign Up"}</button></p>
      </div>
    </div>
  );
}
