/**
 * TokenSave SDK v1.0.0
 * Zero-knowledge AI cost optimization
 * Your API keys NEVER leave your infrastructure
 *
 * npm install tokensave (coming soon)
 * For now, copy this file into your project
 */

class TokenSaveSDK {
    constructor(config) {
      this.provider = config.provider || "anthropic";
      this.apiKey = config.apiKey;
      this.enableCache = config.cache !== false;
      this.enableRouting = config.routing !== false;
      this.enableCompression = config.compression !== false;
      this.analyticsUrl = config.analyticsUrl || "https://tokensave.vercel.app/api/analytics";
      this.sendAnalytics = config.analytics !== false;
      this.cache = new Map();
      this.cacheTTL = config.cacheTTL || 1800000;
      this.stats = { requests: 0, cacheHits: 0, tokensSaved: 0 };
    }
  
    _hash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return "c_" + Math.abs(hash).toString(36);
    }
  
    _detectComplexity(text) {
      const wordCount = text.split(" ").length;
      const complexKeywords = ["analyze", "code", "debug", "write a function", "explain in detail", "compare", "evaluate", "create a", "build", "design", "implement", "refactor", "optimize", "algorithm", "architecture"];
      const isComplex = wordCount > 100 || complexKeywords.some((kw) => text.toLowerCase().includes(kw));
      return isComplex ? "complex" : "simple";
    }
  
    _pickModel(complexity) {
      const models = {
        anthropic: { simple: "claude-haiku-4-5-20241022", complex: "claude-sonnet-4-20250514" },
        openai: { simple: "gpt-4o-mini", complex: "gpt-4o" },
        google: { simple: "gemini-2.0-flash-lite", complex: "gemini-2.0-flash" },
      };
      return models[this.provider]?.[complexity] || models.anthropic[complexity];
    }
  
    _compress(text) {
      const original = text.length;
      let compressed = text.replace(/\s+/g, " ").trim();
      compressed = compressed.replace(/\b(just|really|very|basically|actually|literally|simply|perhaps|maybe|I think|I believe|in my opinion|to be honest|as you know)\b/gi, "").replace(/\s+/g, " ").trim();
      return { text: compressed, saved: original - compressed.length };
    }
  
    async _reportAnonymousStats() {
      if (!this.sendAnalytics) return;
      try {
        fetch(this.analyticsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: this.stats.requests,
            cacheHits: this.stats.cacheHits,
            tokensSaved: this.stats.tokensSaved,
            provider: this.provider,
          }),
        }).catch(() => {});
      } catch (e) {}
    }
  
    async chat(prompt, options = {}) {
      this.stats.requests++;
      const messages = typeof prompt === "string"
        ? [{ role: "user", content: prompt }]
        : prompt;
  
      const lastContent = messages[messages.length - 1]?.content || "";
  
      if (this.enableCache) {
        const key = this._hash(messages.map((m) => m.role + m.content).join(""));
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.time < this.cacheTTL) {
          this.stats.cacheHits++;
          this._reportAnonymousStats();
          return { ...cached.data, _tokensave: { cache: true, saved: "100%" } };
        }
      }
  
      let model = options.model;
      let complexity = "unknown";
      if (!model && this.enableRouting) {
        complexity = this._detectComplexity(lastContent);
        model = this._pickModel(complexity);
      }
  
      const optimizedMessages = this.enableCompression
        ? messages.map((m, i) => {
            if (i === messages.length - 1) {
              const { text, saved } = this._compress(m.content);
              this.stats.tokensSaved += saved;
              return { ...m, content: text };
            }
            return m;
          })
        : messages;
  
      let apiUrl, headers, body;
  
      if (this.provider === "anthropic") {
        apiUrl = "https://api.anthropic.com/v1/messages";
        headers = { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" };
        body = { model, max_tokens: options.maxTokens || 1024, messages: optimizedMessages };
      } else if (this.provider === "openai") {
        apiUrl = "https://api.openai.com/v1/chat/completions";
        headers = { "Content-Type": "application/json", "Authorization": "Bearer " + this.apiKey };
        body = { model, messages: optimizedMessages };
      } else {
        apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + this.apiKey;
        headers = { "Content-Type": "application/json" };
        body = { contents: optimizedMessages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) };
      }
  
      const response = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await response.json();
  
      if (this.enableCache) {
        const key = this._hash(messages.map((m) => m.role + m.content).join(""));
        this.cache.set(key, { data, time: Date.now() });
      }
  
      this._reportAnonymousStats();
      return { ...data, _tokensave: { cache: false, model, complexity, provider: this.provider } };
    }
  
    getStats() {
      return { ...this.stats };
    }
  
    clearCache() {
      this.cache.clear();
    }
  }
  
  if (typeof module !== "undefined") module.exports = { TokenSaveSDK };
  if (typeof window !== "undefined") window.TokenSaveSDK = TokenSaveSDK;