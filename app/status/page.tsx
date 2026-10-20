"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const services = [
  { name: "Cache infrastructure", path: "/api/health", detail: "Live server health and Redis connectivity", kind: "health" },
  { name: "Request proxy", path: "/api/proxy", detail: "API discovery response", kind: "proxy" },
  { name: "Batch API", path: "/api/batch", detail: "Batch endpoint discovery response", kind: "batch" },
  { name: "Playground", path: "/playground", detail: "Public page availability", kind: "page" },
  { name: "Documentation", path: "/docs", detail: "Public page availability", kind: "page" },
];
type Check = { state: "passed" | "failed"; ms: number; detail: string };
export default function Status() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState("");
  const controller = useRef<AbortController | null>(null);
  const runChecks = useCallback(async () => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    const timeout = setTimeout(() => abort.abort(), 12000);
    const results = await Promise.all(services.map(async (service): Promise<Check> => {
      const start = performance.now();
      try {
        const response = await fetch(service.path, { cache: "no-store", signal: abort.signal });
        let passed = response.ok;
        if (service.kind !== "page") {
          const data = await response.json();
          passed = passed && (service.kind === "health" ? data.status === "healthy" && data.services?.redis?.status === "connected" : service.kind === "proxy" ? data.status === "active" : Boolean(data.service));
        }
        return { state: passed ? "passed" : "failed", ms: Math.round(performance.now() - start), detail: passed ? "Response verified" : response.ok ? "Unexpected health response" : `HTTP ${response.status}` };
      } catch {
        return { state: "failed", ms: Math.round(performance.now() - start), detail: abort.signal.aborted ? "Check timed out" : "Could not reach endpoint" };
      }
    }));
    clearTimeout(timeout);
    if (controller.current !== abort) return;
    controller.current = null;
    setChecks(results);
    setChecked(new Date().toLocaleString());
    setLoading(false);
  }, []);
  useEffect(() => { void runChecks(); return () => { controller.current?.abort(); controller.current = null; }; }, [runChecks]);
  const passed = checks.filter(c => c.state === "passed").length;
  const healthy = checks.length === services.length && passed === services.length;
  return <div className="service-page">
    <style>{`
.service-page{min-height:100vh;background:#090d15;color:#edf1fa;font:14px/1.65 var(--font-inter),sans-serif}.service-page *{box-sizing:border-box}.service-page a{text-decoration:none;color:inherit}.service-page button{font:inherit;cursor:pointer}.service-page :is(a,button):focus-visible{outline:3px solid #c5b5ff;outline-offset:5px}.service-page h1,.service-page h2,.service-page p{margin:0}.service-nav{max-width:1180px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:25px 32px;border-bottom:1px solid #263044}.service-brand{font-size:22px;font-weight:650;letter-spacing:-1px}.service-brand span{color:#bbabf4}.service-links{display:flex;gap:24px;color:#adbad0}.service-main{max-width:1060px;margin:auto;padding:65px 32px 70px}.service-eyebrow{color:#b9a7ef;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600}.service-title{font-size:clamp(38px,6vw,62px);line-height:1.12;letter-spacing:-2.5px;font-weight:550;margin:15px 0!important}.service-intro{color:#acb9ce;font-size:16px;max-width:600px}.service-summary{display:flex;align-items:center;gap:25px;padding:30px;margin:36px 0 22px;border:1px solid #344354;border-radius:20px;background:radial-gradient(ellipse at top right,#a0d9c90c,transparent 65%),#111924}.service-summary h2{font-size:24px;letter-spacing:-.6px}.service-summary p{color:#acb9ce;margin-top:6px;font-size:13px}.service-orb{flex-shrink:0;width:58px;height:58px;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;font-size:24px;background:#ffffff04}.service-refresh{margin-left:auto;white-space:nowrap;background:#c5b6f5;color:#141126;border:0;border-radius:9px;padding:11px 18px;font-weight:600!important}.service-refresh:disabled{opacity:.6;cursor:wait}.service-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:22px}.service-panel{border:1px solid #283347;border-radius:16px;background:#101721;overflow:hidden}.service-panel-head{padding:20px 24px;display:flex;justify-content:space-between;border-bottom:1px solid #283347}.service-panel-head h2{font-size:15px}.service-panel-head span{color:#99a9c0;font-size:12px}.service-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px;border-bottom:1px solid #242e3e}.service-row:last-child{border:0}.service-row h3{font-size:14px;margin:0 0 4px;font-weight:550}.service-row p{font-size:12px;color:#a5b3c8}.service-result{text-align:right;white-space:nowrap;font-size:12px}.service-result small{display:block;color:#a5b3c8;font-size:11px;margin-top:4px}.service-aside{display:flex;flex-direction:column;gap:18px}.service-note{padding:24px;border:1px solid #283347;border-radius:16px;background:#101721}.service-note h2{font-size:15px;margin-bottom:10px}.service-note p{color:#a5b3c8;font-size:13px}.service-note a{display:inline-block;color:#c9bbf5;margin-top:17px;font-size:13px}.service-bottom{margin-top:22px;display:flex;justify-content:space-between;gap:25px;padding:22px 24px;border:1px solid #283347;border-radius:16px;color:#a5b3c8;font-size:13px}.service-bottom strong{color:#e4eaf4;display:block;margin-bottom:4px}.service-bottom a{color:#c9bbf5;white-space:nowrap}.service-footer{max-width:996px;margin:auto;padding:26px 0;border-top:1px solid #283347;display:flex;justify-content:space-between;color:#9cacc4;font-size:12px}.service-footer div{display:flex;gap:20px}.service-summary,.service-panel,.service-note{animation:status-enter .4s ease both}.service-panel{animation-delay:.06s}@keyframes status-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.service-page *{animation:none!important;transition:none!important}}@media(max-width:760px){.service-nav{padding:21px}.service-links{gap:16px;font-size:12px}.service-main{padding:38px 20px}.service-grid{grid-template-columns:1fr}.service-summary{padding:22px;gap:16px;flex-wrap:wrap}.service-summary h2{font-size:20px}.service-orb{width:44px;height:44px}.service-refresh{margin-left:0}.service-aside{display:grid;grid-template-columns:1fr 1fr}.service-row{padding:18px}.service-bottom{flex-direction:column;gap:12px}.service-footer{margin:0 20px;gap:20px;flex-wrap:wrap}}@media(max-width:420px){.service-aside{grid-template-columns:1fr}.service-row{gap:8px}.service-row p{max-width:170px}}
`}</style>
    <nav className="service-nav" aria-label="Main navigation"><Link href="/" className="service-brand">TokenSave<span>.</span></Link><div className="service-links"><Link href="/changelog">Changelog</Link><Link href="/dashboard">Dashboard ↗</Link></div></nav>
    <main className="service-main">
      <div className="service-eyebrow">Service transparency</div>
      <h1 className="service-title">A clear view of<br />what&apos;s running.</h1>
      <p className="service-intro">Live endpoint checks, measured from your browser. See the result and exactly what each check covers.</p>
      <section className="service-summary" aria-live="polite">
        <div className="service-orb" style={{color:loading ? "#c5b6f5" : healthy ? "#a3dec8" : "#f0c990"}} aria-hidden="true">{loading ? "↻" : healthy ? "✓" : "!"}</div>
        <div><h2>{loading ? "Checking services…" : healthy ? "All checks passing" : "Some checks need attention"}</h2><p>{loading ? "Running five independent checks" : `${passed} of ${services.length} checks passed · ${checked}`}</p></div>
        <button className="service-refresh" onClick={() => void runChecks()} disabled={loading}>{loading ? "Checking…" : "↻ Refresh checks"}</button>
      </section>
      <div className="service-grid">
        <section className="service-panel" aria-label="Endpoint checks" aria-busy={loading}>
          <div className="service-panel-head"><h2>Service checks</h2><span>On-demand snapshot</span></div>
          {services.map((service,i) => <div className="service-row" key={service.path}><div><h3>{service.name}</h3><p>{service.detail}</p></div><div className="service-result" style={{color:loading ? "#b9a8f0" : checks[i]?.state === "passed" ? "#a3dec8" : "#f0c990"}}>{loading ? "Checking…" : checks[i]?.state === "passed" ? "✓ Passed" : "! Not passing"}<small>{loading ? "Awaiting response" : checks[i]?.state === "passed" ? `${checks[i].ms.toLocaleString()} ms round trip` : checks[i]?.detail}</small></div></div>)}
        </section>
        <aside className="service-aside">
          <section className="service-note"><h2>What this tells you</h2><p>These checks verify endpoint responses and cache connectivity. They do not send AI prompts or test sign-in, billing, or provider generation.</p><Link href="/docs">Explore the API →</Link></section>
          <section className="service-note"><h2>A snapshot, not uptime</h2><p>Results reflect this browser and network at the time shown. Historical uptime and incident tracking are not published here yet.</p><Link href="/changelog">Read product updates →</Link></section>
        </aside>
      </div>
      <div className="service-bottom"><p><strong>Something isn&apos;t working?</strong>Refresh the checks, then share the time and affected service with support. Please omit API keys and private prompts.</p><a href="https://mail.google.com/mail/?view=cm&fs=1&to=support%40tokensave.in" target="_blank" rel="noopener noreferrer">Contact support ↗</a></div>
    </main>
    <footer className="service-footer"><span>© 2026 TokenSave · Built in the open</span><div><Link href="/security">Security</Link><Link href="/docs">Documentation</Link></div></footer>
  </div>;
}
