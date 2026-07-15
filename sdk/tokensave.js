/**
 * TokenSave SDK v2.0.0
 * Zero-knowledge AI cost optimization
 * API keys NEVER leave your infrastructure
 * 
 * Install: npm install tokensave (coming soon)
 * For now: copy this file into your project
 * 
 * Usage:
 *   const { TokenSave } = require('./tokensave');
 *   const ts = new TokenSave({ provider: 'anthropic', apiKey: 'sk-...' });
 *   const result = await ts.chat('Hello!');
 */

class TokenSave {
  constructor(config = {}) {
    this.provider = config.provider || "anthropic";
    this.apiKey = config.apiKey || "";
    this.fallbackKeys = config.fallbackKeys || {};
    this.quality = config.quality || "auto";
    this.enableCache = config.cache !== false;
    this.enableRouting = config.routing !== false;
    this.enableCompression = config.compression !== false;
    this.analyticsUrl = config.analyticsUrl || "https://tokensave.vercel.app/api/analytics";
    this.sendAnalytics = config.analytics !== false;
    this.userId = config.userId || null;
    this.tags = config.tags || {};
    this.webhookUrl = config.webhookUrl || null;
    this.cache = new Map();
    this.cacheTTL = config.cacheTTL || 1800000;
    this.stats = { requests: 0, cacheHits: 0, tokensSaved: 0, totalCost: 0, totalSaved: 0, errors: 0, latencies: [] };
    this.models = {
      anthropic: { simple: config.simpleModel || "claude-haiku-4-5-20251001", complex: config.complexModel || "claude-sonnet-4-6" },
      openai: { simple: "gpt-4o-mini", complex: "gpt-4o" },
      google: { simple: "gemini-2.0-flash-lite", complex: "gemini-2.0-flash" },
      groq: { simple: "llama-3.1-8b-instant", complex: "llama-3.3-70b-versatile" },
    };
  }

  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
    return "c_" + Math.abs(hash).toString(36);
  }

  _estimateTokens(text) { return Math.ceil((text || "").length / 4); }

  _detectComplexity(text) {
    const wordCount = (text || "").split(" ").length;
    const complex = ["analyze", "code", "debug", "write a function", "explain in detail", "compare", "evaluate", "create a", "build", "design", "implement", "algorithm", "architecture", "step by step", "comprehensive", "system design"];
    const simple = ["what is the capital", "define ", "translate", "convert ", "how many", "what year", "who is"];
    const lower = (text || "").toLowerCase();
    if ((text || "").includes("```") || (text || "").includes("function ") || (text || "").includes("def ")) return "complex";
    if (complex.some(k => lower.includes(k))) return "complex";
    if (simple.some(k => lower.includes(k)) && wordCount < 15) return "simple";
    if (wordCount > 80) return "complex";
    return wordCount < 25 ? "simple" : "complex";
  }

  _compress(text) {
    if ((text || "").length < 50) return { text, saved: 0 };
    const original = text.length;
    let c = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    ["to be honest with you", "in my humble opinion", "as you probably know", "I would like to say that", "the thing is that", "at the end of the day", "needless to say", "as a matter of fact"].forEach(f => { c = c.replace(new RegExp(f, "gi"), ""); });
    c = c.replace(/\s+/g, " ").trim();
    return { text: c, saved: original - c.length };
  }

  async _report() {
    if (!this.sendAnalytics) return;
    try { fetch(this.analyticsUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requests: this.stats.requests, cacheHits: this.stats.cacheHits, tokensSaved: this.stats.tokensSaved, provider: this.provider, userId: this.userId }) }).catch(() => {}); } catch (e) {}
  }

  async chat(prompt, options = {}) {
    const start = Date.now();
    this.stats.requests++;
    const messages = typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
    const lastContent = messages[messages.length - 1]?.content || "";

    if (this.enableCache) {
      const key = this._hash(messages.map(m => m.role + m.content).join(""));
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.time < this.cacheTTL) {
        this.stats.cacheHits++;
        this.stats.latencies.push(Date.now() - start);
        this._report();
        return { ...cached.data, _tokensave: { cache: true, saved: "100%", latency: Date.now() - start } };
      }
    }

    let model = options.model;
    let complexity = "auto";
    if (!model && this.enableRouting) {
      complexity = this._detectComplexity(lastContent);
      const providerModels = this.models[this.provider] || this.models.anthropic;
      model = this.quality === "max_quality" ? providerModels.complex : providerModels[complexity];
    }

    let finalMessages = messages;
    let charsSaved = 0;
    if (this.enableCompression && this.quality !== "max_quality") {
      finalMessages = messages.map((m, i) => {
        if (i === messages.length - 1) { const { text, saved } = this._compress(m.content); charsSaved += saved; return { ...m, content: text }; }
        return m;
      });
      this.stats.tokensSaved += charsSaved;
    }

    let apiUrl, headers = { "Content-Type": "application/json" }, body;
    if (this.provider === "anthropic") { apiUrl = "https://api.anthropic.com/v1/messages"; headers["x-api-key"] = this.apiKey; headers["anthropic-version"] = "2023-06-01"; body = { model, max_tokens: options.maxTokens || 1024, messages: finalMessages }; }
    else if (this.provider === "openai") { apiUrl = "https://api.openai.com/v1/chat/completions"; headers["Authorization"] = "Bearer " + this.apiKey; body = { model, messages: finalMessages }; }
    else if (this.provider === "google") { apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + this.apiKey; body = { contents: finalMessages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) }; }
    else if (this.provider === "groq") { apiUrl = "https://api.groq.com/openai/v1/chat/completions"; headers["Authorization"] = "Bearer " + this.apiKey; body = { model, messages: finalMessages }; }

    try {
      const response = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await response.json();
      const latency = Date.now() - start;
      this.stats.latencies.push(latency);

      if (response.status >= 400 && Object.keys(this.fallbackKeys).length > 0) {
        for (const [fbProvider, fbKey] of Object.entries(this.fallbackKeys)) {
          try {
            const fbModels = this.models[fbProvider] || this.models.groq;
            const fbModel = fbModels[complexity] || fbModels.simple;
            let fbUrl, fbHeaders = { "Content-Type": "application/json" }, fbBody;
            if (fbProvider === "groq") { fbUrl = "https://api.groq.com/openai/v1/chat/completions"; fbHeaders["Authorization"] = "Bearer " + fbKey; fbBody = { model: fbModel, messages: finalMessages }; }
            else if (fbProvider === "openai") { fbUrl = "https://api.openai.com/v1/chat/completions"; fbHeaders["Authorization"] = "Bearer " + fbKey; fbBody = { model: fbModel, messages: finalMessages }; }
            const fbRes = await fetch(fbUrl, { method: "POST", headers: fbHeaders, body: JSON.stringify(fbBody) });
            if (fbRes.status < 400) {
              const fbData = await fbRes.json();
              if (this.enableCache) { const key = this._hash(messages.map(m => m.role + m.content).join("")); this.cache.set(key, { data: fbData, time: Date.now() }); }
              this._report();
              return { ...fbData, _tokensave: { cache: false, model: fbModel, complexity, charsSaved, latency: Date.now() - start, fallback: fbProvider } };
            }
          } catch (e) { continue; }
        }
      }

      if (this.enableCache) { const key = this._hash(messages.map(m => m.role + m.content).join("")); this.cache.set(key, { data, time: Date.now() }); }
      this._report();
      return { ...data, _tokensave: { cache: false, model, complexity, charsSaved, latency, provider: this.provider } };
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  getStats() {
    const avgLatency = this.stats.latencies.length > 0 ? Math.round(this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length) : 0;
    return { ...this.stats, avgLatency };
  }

  clearCache() { this.cache.clear(); }
}

if (typeof module !== "undefined") module.exports = { TokenSave };
if (typeof window !== "undefined") window.TokenSave = TokenSave;