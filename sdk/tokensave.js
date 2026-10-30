/* eslint-disable @typescript-eslint/no-require-imports -- This SDK intentionally supports Node CommonJS require(). */
/** TokenSave SDK v2.1.0 — Node.js 20+, server only. Copy the entire sdk/ directory.
 * Calls providers directly. No telemetry is sent. See docs/SDK.md.
 */
const { createHash, createHmac, randomBytes } = require("node:crypto");
const { accounting, cacheAccounting } = require("./accounting.js");
const PROVIDERS = ["anthropic", "openai", "google", "groq"];
const MODELS = {
  anthropic: {
    simple: "claude-haiku-4-5-20251001",
    complex: "claude-sonnet-4-6",
  },
  openai: { simple: "gpt-4o-mini", complex: "gpt-4o" },
  google: { simple: "gemini-2.0-flash-lite", complex: "gemini-2.0-flash" },
  groq: { simple: "llama-3.1-8b-instant", complex: "llama-3.3-70b-versatile" },
};
class TokenSaveError extends Error {
  constructor(
    message,
    { status = null, provider = null, code = "provider_error" } = {},
  ) {
    super(message);
    this.name = "TokenSaveError";
    this.status = status;
    this.provider = provider;
    this.code = code;
  }
}
function positive(value, name, max) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    throw new TypeError(name + " is out of range");
  return value;
}
function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 100)
    throw new TypeError("Expected 1–100 messages");
  if (Buffer.byteLength(JSON.stringify(messages), "utf8") > 500000)
    throw new TypeError("Messages exceed the 500KB limit");
  return messages.map((m) => {
    if (
      !m ||
      !["user", "assistant", "system"].includes(m.role) ||
      typeof m.content !== "string" ||
      !m.content.length ||
      m.content.length > 100000
    )
      throw new TypeError("Invalid text message");
    return { role: m.role, content: m.content };
  });
}
function providerRequest(provider, model, key, messages, maxTokens) {
  const headers = { "Content-Type": "application/json" };
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const conversation = messages.filter((m) => m.role !== "system");
  if (!conversation.length)
    throw new TypeError("At least one non-system message is required");
  if (provider === "anthropic")
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        ...headers,
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model,
        max_tokens: maxTokens,
        messages: conversation,
        ...(system ? { system } : {}),
      },
    };
  if (provider === "google")
    return {
      url:
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent",
      headers: { ...headers, "x-goog-api-key": key },
      body: {
        contents: conversation.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { maxOutputTokens: maxTokens },
      },
    };
  return {
    url:
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions",
    headers: { ...headers, Authorization: "Bearer " + key },
    body: { model, messages, max_tokens: maxTokens },
  };
}
function validResponse(provider, data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || data.error)
    return false;
  if (provider === "anthropic")
    return (
      Array.isArray(data.content) &&
      data.content.some(
        (part) => part?.type === "text" && typeof part.text === "string",
      )
    );
  if (provider === "google")
    return (
      Array.isArray(data.candidates) &&
      data.candidates.some(
        (candidate) =>
          Array.isArray(candidate?.content?.parts) &&
          candidate.content.parts.some(
            (part) => typeof part?.text === "string",
          ),
      )
    );
  return (
    Array.isArray(data.choices) &&
    data.choices.some(
      (choice) =>
        typeof choice?.message?.content === "string" ||
        typeof choice?.message?.refusal === "string",
    )
  );
}
class TokenSave {
  #cacheSalt = randomBytes(32);
  constructor(config = {}) {
    this.provider = config.provider || "anthropic";
    if (!PROVIDERS.includes(this.provider))
      throw new TypeError("Unsupported provider");
    this.apiKey = config.apiKey || "";
    this.fallbackKeys = { ...(config.fallbackKeys || {}) };
    for (const [p, k] of Object.entries(this.fallbackKeys))
      if (!PROVIDERS.includes(p) || typeof k !== "string" || !k.trim())
        throw new TypeError("Invalid fallback credential");
    this.quality = config.quality || "auto";
    if (!["auto", "max_savings", "max_quality"].includes(this.quality))
      throw new TypeError("Invalid quality mode");
    this.enableCache = config.cache !== false;
    this.enableRouting = config.routing !== false;
    // Compression is lossless by default: arbitrary text/code is preserved verbatim.
    this.enableCompression = config.compression !== false;
    this.cacheTTL = positive(config.cacheTTL ?? 1800000, "cacheTTL", 86400000);
    this.maxCacheEntries = positive(
      config.maxCacheEntries ?? 256,
      "maxCacheEntries",
      10000,
    );
    this.timeoutMs = positive(config.timeoutMs ?? 30000, "timeoutMs", 300000);
    this.maxTokens = positive(config.maxTokens ?? 1024, "maxTokens", 100000);
    this.fetcher = config.fetch ?? globalThis.fetch;
    if (typeof this.fetcher !== "function")
      throw new TypeError("fetch must be a function");
    this.cache = new Map();
    this.models = structuredClone(MODELS);
    if (config.simpleModel)
      this.models[this.provider].simple = config.simpleModel;
    if (config.complexModel)
      this.models[this.provider].complex = config.complexModel;
    this.stats = {
      requests: 0,
      cacheHits: 0,
      tokensSaved: 0,
      totalCost: 0,
      totalSaved: 0,
      unknownCostRequests: 0,
      unknownSavingsRequests: 0,
      errors: 0,
      latencies: [],
    };
  }
  _hash(str) {
    return createHash("sha256").update(str).digest("hex");
  }
  _estimateTokens(text) {
    return Math.ceil((text || "").length / 4);
  }
  _detectComplexity(text) {
    return /```|function |def |class |analy[sz]e|code|debug|compare|evaluate|create|build|design|implement|algorithm|architecture|step by step|comprehensive|system design/i.test(
      text,
    ) || text.split(/\s+/).length >= 25
      ? "complex"
      : "simple";
  }
  _compress(text) {
    return { text, saved: 0 };
  }
  _prune() {
    for (const [key, value] of this.cache)
      if (Date.now() - value.time >= this.cacheTTL) this.cache.delete(key);
    while (this.cache.size > this.maxCacheEntries)
      this.cache.delete(this.cache.keys().next().value);
  }
  _record(meta) {
    if (meta.cost === null) this.stats.unknownCostRequests++;
    else
      this.stats.totalCost =
        Math.round((this.stats.totalCost + meta.cost) * 1e9) / 1e9;
    if (meta.cost_saved === null) this.stats.unknownSavingsRequests++;
    else
      this.stats.totalSaved =
        Math.round((this.stats.totalSaved + meta.cost_saved) * 1e9) / 1e9;
    this.stats.tokensSaved += meta.tokens_saved || 0;
  }
  async chat(prompt, options = {}) {
    const start = Date.now();
    this.stats.requests++;
    try {
      if (typeof this.apiKey !== "string" || !this.apiKey.trim())
        throw new TypeError("A provider apiKey is required");
      const messages = validateMessages(
        typeof prompt === "string"
          ? [{ role: "user", content: prompt }]
          : prompt,
      );
      const maxTokens = positive(
        options.maxTokens ?? this.maxTokens,
        "maxTokens",
        100000,
      );
      const complexity =
        messages.length > 6
          ? "complex"
          : this._detectComplexity(messages.at(-1).content);
      const model =
        options.model ||
        (this.enableRouting
          ? this.models[this.provider][
              this.quality === "max_quality" ? "complex" : complexity
            ]
          : null);
      if (typeof model !== "string" || !model.trim() || model.length > 200)
        throw new TypeError(
          "An explicit model is required when routing is disabled",
        );
      if (options.signal?.aborted)
        throw new TokenSaveError("Request cancelled", { code: "aborted" });
      const key = this._hash(
        JSON.stringify({
          provider: this.provider,
          credential: createHmac("sha256", this.apiKey)
            .update(this.#cacheSalt)
            .digest("hex"),
          model,
          quality: this.quality,
          messages,
          maxTokens,
        }),
      );
      this._prune();
      const cached = this.enableCache ? this.cache.get(key) : null;
      if (cached) {
        this.stats.cacheHits++;
        const meta = {
          ...cacheAccounting(cached.meta),
          cache: true,
          cache_hit: true,
          latency: Date.now() - start,
        };
        this._record(meta);
        return { ...structuredClone(cached.data), _tokensave: meta };
      }
      // One deadline spans the primary and all fallbacks. No automatic retry of an ambiguous failed POST.
      const deadline = AbortSignal.timeout(this.timeoutMs);
      const signal = options.signal
        ? AbortSignal.any([deadline, options.signal])
        : deadline;
      const attempts = [
        [this.provider, this.apiKey],
        ...Object.entries(this.fallbackKeys).filter(
          ([p]) => p !== this.provider,
        ),
      ];
      let lastError;
      for (const [provider, credential] of attempts) {
        const selected =
          provider === this.provider
            ? model
            : this.models[provider][
                this.quality === "max_quality" ? "complex" : complexity
              ];
        const request = providerRequest(
          provider,
          selected,
          credential,
          messages,
          maxTokens,
        );
        let response;
        try {
          response = await this.fetcher(request.url, {
            method: "POST",
            headers: request.headers,
            body: JSON.stringify(request.body),
            redirect: "error",
            signal,
          });
        } catch {
          throw new TokenSaveError(
            signal.aborted
              ? "Request cancelled or timed out"
              : "Provider connection failed",
            { provider, code: signal.aborted ? "aborted" : "network_error" },
          );
        }
        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          // Do not expose credentials or raw provider error bodies through exception messages.
          lastError = new TokenSaveError(
            "Provider returned HTTP " + response.status,
            { provider, status: response.status },
          );
          if ([429, 500, 502, 503, 504, 529].includes(response.status))
            continue;
          throw lastError;
        }
        let data;
        try {
          data = await response.json();
        } catch {
          throw new TokenSaveError(
            signal.aborted
              ? "Request cancelled or timed out"
              : "Provider returned invalid JSON",
            {
              provider,
              code: signal.aborted ? "aborted" : "invalid_response",
            },
          );
        }
        if (!validResponse(provider, data))
          throw new TokenSaveError("Provider returned an invalid completion", {
            provider,
            code: "invalid_response",
          });
        const meta = {
          ...accounting(provider, selected, data),
          cache: false,
          cache_hit: false,
          provider,
          model: selected,
          complexity,
          charsSaved: 0,
          latency: Date.now() - start,
          ...(provider !== this.provider ? { fallback: provider } : {}),
        };
        // Never cache fallback results under a primary provider/model identity.
        if (this.enableCache && provider === this.provider) {
          this.cache.set(key, {
            data: structuredClone(data),
            meta: structuredClone(meta),
            time: Date.now(),
          });
          this._prune();
        }
        this._record(meta);
        return { ...data, _tokensave: meta };
      }
      throw lastError;
    } catch (error) {
      this.stats.errors++;
      this.stats.unknownCostRequests++;
      throw error;
    } finally {
      this.stats.latencies.push(Date.now() - start);
      if (this.stats.latencies.length > 1000) this.stats.latencies.shift();
    }
  }
  getStats() {
    return {
      ...this.stats,
      latencies: [...this.stats.latencies],
      currency: "USD",
      costSource: "published_rate_estimate",
      savingsBasis: "avoided_repeat_at_original_rate",
      avgLatency: this.stats.latencies.length
        ? Math.round(
            this.stats.latencies.reduce((a, b) => a + b, 0) /
              this.stats.latencies.length,
          )
        : 0,
    };
  }
  clearCache() {
    this.cache.clear();
  }
}
module.exports = {
  TokenSave,
  TokenSaveError,
  providerRequest,
  validResponse,
  validateMessages,
  MODELS,
};
