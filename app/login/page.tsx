"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [showPw, setShowPw] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) router.push("/dashboard"); else setChecking(false); }); }, [router]);

  const validate = () => {
    if (!email.trim()) { setMsg({ text: "Enter your email.", type: "e" }); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg({ text: "Enter a valid email.", type: "e" }); return false; }
    if (mode !== "reset" && !password) { setMsg({ text: "Enter your password.", type: "e" }); return false; }
    if (mode === "signup" && password.length < 6) { setMsg({ text: "Password must be 6+ characters.", type: "e" }); return false; }
    return true;
  };

  const submit = async () => {
    setMsg({ text: "", type: "" });
    if (!validate()) return;
    setLoading(true);
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://tokensave.vercel.app/dashboard" });
      setLoading(false);
      setMsg(error ? { text: error.message, type: "e" } : { text: "Reset link sent to " + email, type: "s" });
      return;
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) { setMsg({ text: error.message.includes("already") ? "Email already registered. Try signing in." : error.message, type: "e" }); if (error.message.includes("already")) setTimeout(() => setMode("signin"), 2000); }
      else if (data.user && data.session) { setMsg({ text: "Account created!", type: "s" }); setTimeout(() => router.push("/dashboard"), 800); }
      else if (data.user?.identities?.length === 0) { setMsg({ text: "Email already registered.", type: "e" }); setTimeout(() => setMode("signin"), 2000); }
      else { setMsg({ text: "Check " + email + " to verify.", type: "s" }); setTimeout(() => setMode("signin"), 3000); }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg({ text: error.message.includes("Invalid") ? "Wrong email or password." : error.message, type: "e" });
    else { setMsg({ text: "Welcome back!", type: "s" }); setTimeout(() => router.push("/dashboard"), 800); }
  };

  const oauthLogin = async (provider: "github" | "google") => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: "https://tokensave.vercel.app/dashboard" } });
    if (error) { setMsg({ text: error.message, type: "e" }); setLoading(false); }
  };

  if (checking) return <div className="min-h-screen bg-[#0A0D12] flex items-center justify-center"><div className="w-5 h-5 border-2 border-[#5B8DEF] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0D12] flex flex-col relative overflow-hidden">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#5B8DEF]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative z-10 px-6 md:px-10 py-5">
        <a href="/" className="flex items-center gap-2.5 w-fit">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20">TS</div>
          <span className="text-lg font-semibold tracking-tight text-[#E8ECF4]">TokenSave</span>
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold tracking-tight text-white font-display">
              {mode === "reset" ? "Reset password" : mode === "signup" ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-[#5A6577] text-[14px] mt-2">
              {mode === "reset" ? "We'll send a reset link" : mode === "signup" ? "Start your 14-day free trial" : "Sign in to your dashboard"}
            </p>
          </div>

          {mode !== "reset" && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button onClick={() => oauthLogin("google")} disabled={loading} className="flex items-center justify-center gap-2.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] text-[#7A8599] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all disabled:opacity-50">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
                <button onClick={() => oauthLogin("github")} disabled={loading} className="flex items-center justify-center gap-2.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] text-[#7A8599] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all disabled:opacity-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#7A8599"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </button>
              </div>
              <div className="flex items-center gap-4 mb-5"><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-[#3D4654] text-[11px]">or continue with email</span><div className="flex-1 h-px bg-white/[0.06]" /></div>
            </>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-[#5A6577] mb-1.5 block">Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => { setEmail(e.target.value); setMsg({ text: "", type: "" }); }} onKeyDown={e => e.key === "Enter" && (mode === "reset" ? submit() : document.getElementById("pw")?.focus())} className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[#E8ECF4] placeholder-[#3D4654] text-[14px] focus:outline-none focus:border-[#5B8DEF]/40 transition-all" autoFocus />
            </div>
            {mode !== "reset" && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[12px] text-[#5A6577]">Password</label>
                  {mode === "signin" && <button onClick={() => { setMode("reset"); setMsg({ text: "", type: "" }); }} className="text-[11px] text-[#3D4654] hover:text-[#5B8DEF] transition-colors">Forgot?</button>}
                </div>
                <div className="relative">
                  <input id="pw" type={showPw ? "text" : "password"} placeholder={mode === "signup" ? "Min 6 characters" : "Your password"} value={password} onChange={e => { setPassword(e.target.value); setMsg({ text: "", type: "" }); }} onKeyDown={e => e.key === "Enter" && submit()} className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[#E8ECF4] placeholder-[#3D4654] text-[14px] focus:outline-none focus:border-[#5B8DEF]/40 transition-all pr-14" />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3D4654] hover:text-[#5A6577] text-[11px]">{showPw ? "Hide" : "Show"}</button>
                </div>
                {mode === "signup" && password.length > 0 && (
                  <div className="flex gap-1 mt-2">{[2, 4, 6, 10].map((th, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= th ? (password.length >= 10 ? "bg-[#4ADE80]" : password.length >= 6 ? "bg-[#5B8DEF]" : "bg-[#E8B94B]") : "bg-white/[0.06]"}`} />)}</div>
                )}
              </div>
            )}

            {msg.text && (
              <div className={`p-3.5 rounded-xl text-[13px] flex items-start gap-2.5 ${msg.type === "s" ? "bg-[#4ADE80]/5 border border-[#4ADE80]/10 text-[#4ADE80]" : msg.type === "i" ? "bg-[#5B8DEF]/5 border border-[#5B8DEF]/10 text-[#5B8DEF]" : "bg-[#FF5F57]/5 border border-[#FF5F57]/10 text-[#FF5F57]"}`}>
                <span className="shrink-0 mt-0.5 text-[11px]">{msg.type === "s" ? "✓" : "!"}</span><span>{msg.text}</span>
              </div>
            )}

            <button onClick={submit} disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-[14px] flex items-center justify-center gap-2 mt-1 shadow-lg shadow-[#5B8DEF]/20">
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Please wait...</> : mode === "reset" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="mt-6 text-center">
            {mode === "signin" && <p className="text-[#5A6577] text-[13px]">No account? <button onClick={() => { setMode("signup"); setMsg({ text: "", type: "" }); setPassword(""); }} className="text-[#5B8DEF] hover:underline font-medium">Start free trial</button></p>}
            {mode === "signup" && <p className="text-[#5A6577] text-[13px]">Have an account? <button onClick={() => { setMode("signin"); setMsg({ text: "", type: "" }); setPassword(""); }} className="text-[#5B8DEF] hover:underline font-medium">Sign in</button></p>}
            {mode === "reset" && <p className="text-[#5A6577] text-[13px]">Remember it? <button onClick={() => { setMode("signin"); setMsg({ text: "", type: "" }); }} className="text-[#5B8DEF] hover:underline font-medium">Back to sign in</button></p>}
          </div>

          {mode === "signup" && <p className="mt-6 text-center text-[11px] text-[#3D4654]">By signing up you agree to our terms. Your API keys are never stored on our servers.</p>}
        </div>
      </div>
      <footer className="relative z-10 px-6 py-6 text-center text-[#3D4654] text-[11px]">© 2026 TokenSave</footer>
    </div>
  );
}