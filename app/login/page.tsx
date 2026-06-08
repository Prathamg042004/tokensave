"use client";
import { useState } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://tokensave.vercel.app/dashboard",
      });
      if (error) { setMessage(error.message); }
      else { setMessage("Password reset link sent! Check your email."); }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setMessage(error.message); }
      else { setMessage("Account created! Check your email to confirm."); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage(error.message); }
      else { router.push("/dashboard"); }
    }
    setLoading(false);
  };

  const handleGitHubLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: "https://tokensave.vercel.app/dashboard" },
    });
    if (error) setMessage(error.message);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <nav className="px-6 md:px-8 py-5">
        <a href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">TS</div>
          <span className="text-xl font-bold text-gray-100">TokenSave</span>
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-100 text-center mb-2">
            {isReset ? "Reset your password" : isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            {isReset ? "We'll send you a reset link" : isSignUp ? "Start your 14-day free trial" : "Sign in to your dashboard"}
          </p>

          <button
            onClick={handleGitHubLogin}
            className="w-full py-2.5 bg-gray-900 border border-gray-800 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 mb-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-gray-600 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

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
            {!isReset && (
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
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || !email || (!isReset && !password)}
              className="w-full py-2.5 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50 text-sm mt-2"
            >
              {loading ? "Please wait..." : isReset ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </div>

          {message && (
            <p className={`mt-4 text-center text-sm ${message.includes("sent") || message.includes("created") || message.includes("Check") ? "text-green-400" : "text-red-400"}`}>{message}</p>
          )}

          <div className="mt-6 text-center text-sm space-y-2">
            {!isReset && (
              <p className="text-gray-500">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={() => { setIsSignUp(!isSignUp); setMessage(""); setIsReset(false); }} className="text-cyan-400 hover:underline">
                  {isSignUp ? "Sign In" : "Start Free Trial"}
                </button>
              </p>
            )}
            <p>
              <button onClick={() => { setIsReset(!isReset); setMessage(""); setIsSignUp(false); }} className="text-gray-600 hover:text-gray-400 text-sm">
                {isReset ? "Back to Sign In" : "Forgot password?"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <footer className="px-6 md:px-8 py-6 text-center text-gray-700 text-xs">© 2026 TokenSave</footer>
    </div>
  );
}