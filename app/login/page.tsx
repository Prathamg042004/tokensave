"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { router.push("/dashboard"); }
      else { setCheckingAuth(false); }
    });
  }, [router]);

  const validateInputs = () => {
    if (!email.trim()) {
      setMessage({ text: "Please enter your email address.", type: "error" });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ text: "Please enter a valid email address.", type: "error" });
      return false;
    }
    if (mode !== "reset" && !password) {
      setMessage({ text: "Please enter your password.", type: "error" });
      return false;
    }
    if (mode === "signup" && password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setMessage({ text: "", type: "" });
    if (!validateInputs()) return;
    setLoading(true);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://tokensave.vercel.app/dashboard",
      });
      setLoading(false);
      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({ text: "Password reset link sent to " + email + ". Check your inbox.", type: "success" });
      }
      return;
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          setMessage({ text: "This email is already registered. Please sign in instead.", type: "info" });
          setTimeout(() => setMode("signin"), 2000);
        } else {
          setMessage({ text: error.message, type: "error" });
        }
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        setMessage({ text: "This email is already registered. Please sign in instead.", type: "info" });
        setTimeout(() => setMode("signin"), 2000);
      } else if (data.user && data.session) {
        setMessage({ text: "Account created! Redirecting to dashboard...", type: "success" });
        setTimeout(() => router.push("/dashboard"), 1500);
      } else if (data.user && !data.session) {
        setMessage({ text: "Account created! Check " + email + " to verify your account, then sign in.", type: "success" });
        setTimeout(() => setMode("signin"), 3000);
      } else {
        setMessage({ text: "Account created successfully! You can now sign in.", type: "success" });
        setTimeout(() => setMode("signin"), 2000);
      }
      return;
    }

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        if (error.message.includes("Invalid login")) {
          setMessage({ text: "Incorrect email or password. Please try again.", type: "error" });
        } else if (error.message.includes("Email not confirmed")) {
          setMessage({ text: "Please verify your email before signing in. Check your inbox.", type: "error" });
        } else {
          setMessage({ text: error.message, type: "error" });
        }
      } else {
        setMessage({ text: "Welcome back! Redirecting...", type: "success" });
        setTimeout(() => router.push("/dashboard"), 1000);
      }
      return;
    }
  };

  const handleGitHubLogin = async () => {
    setMessage({ text: "", type: "" });
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: "https://tokensave.vercel.app/dashboard" },
    });
    if (error) {
      setMessage({ text: error.message, type: "error" });
      setLoading(false);
    }
  };

  const switchMode = (newMode: string) => {
    setMode(newMode);
    setMessage({ text: "", type: "" });
    setPassword("");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400 text-sm">Checking authentication...</span>
        </div>
      </div>
    );
  }

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
            {mode === "reset" ? "Reset your password" : mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            {mode === "reset" ? "Enter your email and we'll send a reset link" : mode === "signup" ? "Start your 14-day free trial — no credit card required" : "Sign in to your TokenSave dashboard"}
          </p>

          {mode !== "reset" && (
            <>
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="w-full py-2.5 bg-gray-900 border border-gray-800 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 mb-6 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Continue with GitHub
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span className="text-gray-600 text-xs">or continue with email</span>
                <div className="flex-1 h-px bg-gray-800"></div>
              </div>
            </>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setMessage({ text: "", type: "" }); }}
                onKeyDown={(e) => e.key === "Enter" && (mode === "reset" ? handleSubmit() : document.getElementById("password-input")?.focus())}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm transition-colors"
                autoComplete="email"
                autoFocus
              />
            </div>
            {mode !== "reset" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm text-gray-400">Password</label>
                  {mode === "signin" && (
                    <button onClick={() => switchMode("reset")} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">Forgot password?</button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "Min 6 characters" : "Enter your password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setMessage({ text: "", type: "" }); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm pr-12 transition-colors"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                    type="button"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {mode === "signup" && password.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 2 ? (password.length >= 6 ? "bg-green-400" : "bg-amber-400") : "bg-gray-700"}`}></div>
                    <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 4 ? (password.length >= 6 ? "bg-green-400" : "bg-amber-400") : "bg-gray-700"}`}></div>
                    <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 6 ? (password.length >= 10 ? "bg-green-400" : "bg-amber-400") : "bg-gray-700"}`}></div>
                    <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 10 ? "bg-green-400" : "bg-gray-700"}`}></div>
                  </div>
                )}
              </div>
            )}

            {message.text && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                message.type === "success" ? "bg-green-400/10 border border-green-400/20 text-green-400" :
                message.type === "info" ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-400" :
                "bg-red-400/10 border border-red-400/20 text-red-400"
              }`}>
                <span className="shrink-0 mt-0.5">{message.type === "success" ? "✓" : message.type === "info" ? "→" : "!"}</span>
                <span>{message.text}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 bg-cyan-400 text-gray-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </>
              ) : (
                mode === "reset" ? "Send Reset Link" : mode === "signup" ? "Create Account" : "Sign In"
              )}
            </button>
          </div>

          <div className="mt-6 space-y-3 text-center">
            {mode === "signin" && (
              <p className="text-gray-500 text-sm">
                {"Don't have an account? "}
                <button onClick={() => switchMode("signup")} className="text-cyan-400 hover:underline font-medium">Create one free</button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-gray-500 text-sm">
                Already have an account?{" "}
                <button onClick={() => switchMode("signin")} className="text-cyan-400 hover:underline font-medium">Sign in</button>
              </p>
            )}
            {mode === "reset" && (
              <p className="text-gray-500 text-sm">
                Remember your password?{" "}
                <button onClick={() => switchMode("signin")} className="text-cyan-400 hover:underline font-medium">Back to sign in</button>
              </p>
            )}
          </div>

          {mode === "signup" && (
            <p className="mt-6 text-center text-xs text-gray-600">
              By creating an account, you agree to our terms of service. Your API keys are never stored on our servers.
            </p>
          )}
        </div>
      </div>

      <footer className="px-6 md:px-8 py-6 text-center text-gray-700 text-xs">© 2026 TokenSave. All rights reserved.</footer>
    </div>
  );
}