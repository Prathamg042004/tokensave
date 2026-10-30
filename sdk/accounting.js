/** Standard direct-API USD rates per million text tokens. See docs/ACCOUNTING.md.
 * No guessed rates: models without a verified public rate return cost:null.
 */
const PRICING = Object.freeze({
  openai: Object.freeze({
    "gpt-4o": { input: 2.5, output: 10, cached: 1.25 },
    "gpt-4o-2024-08-06": { input: 2.5, output: 10, cached: 1.25 },
    "gpt-4o-mini": { input: 0.15, output: 0.6, cached: 0.075 },
    "gpt-4o-mini-2024-07-18": { input: 0.15, output: 0.6, cached: 0.075 },
  }),
  anthropic: Object.freeze({
    "claude-haiku-4-5-20251001": {
      input: 1,
      output: 5,
      cached: 0.1,
      write5m: 1.25,
      write1h: 2,
    },
    "claude-haiku-4-5": {
      input: 1,
      output: 5,
      cached: 0.1,
      write5m: 1.25,
      write1h: 2,
    },
    "claude-sonnet-4-6": {
      input: 3,
      output: 15,
      cached: 0.3,
      write5m: 3.75,
      write1h: 6,
    },
  }),
});
// Keep the exported registry read-only down to individual rates.
for (const models of Object.values(PRICING))
  for (const rates of Object.values(models)) Object.freeze(rates);
const PRICE_VERSION = "2026-10-30";
const count = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;
const optional = (value) =>
  value === undefined || value === null ? 0 : count(value);

function normalizeUsage(provider, data) {
  if (!data || typeof data !== "object") return null;
  const u = provider === "google" ? data.usageMetadata : data.usage;
  if (!u || typeof u !== "object") return null;
  const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  for (const name of [
    "prompt_tokens_details",
    "completion_tokens_details",
    "cache_creation",
  ]) {
    if (u[name] !== undefined && u[name] !== null && !object(u[name]))
      return null;
  }
  let input,
    output,
    cached,
    write5m = 0,
    write1h = 0;
  if (provider === "anthropic") {
    const base = count(u.input_tokens);
    cached = optional(u.cache_read_input_tokens);
    const writes = optional(u.cache_creation_input_tokens);
    if (u.cache_creation) {
      write5m = optional(u.cache_creation.ephemeral_5m_input_tokens);
      write1h = optional(u.cache_creation.ephemeral_1h_input_tokens);
      if (write5m === null || write1h === null || writes !== write5m + write1h)
        return null;
    } else write5m = writes;
    if ([base, cached, write5m, write1h].includes(null)) return null;
    input = base + cached + write5m + write1h;
    output = count(u.output_tokens);
  } else if (provider === "google") {
    const prompt = count(u.promptTokenCount);
    const tools = optional(u.toolUsePromptTokenCount);
    input = prompt === null || tools === null ? null : prompt + tools;
    const candidates = count(u.candidatesTokenCount);
    const thoughts = optional(u.thoughtsTokenCount);
    output =
      candidates === null || thoughts === null ? null : candidates + thoughts;
    cached = optional(u.cachedContentTokenCount);
  } else if (provider === "openai" || provider === "groq") {
    input = count(u.prompt_tokens);
    output = count(u.completion_tokens);
    cached = optional(u.prompt_tokens_details?.cached_tokens);
    // completion_tokens already includes reasoning tokens; never add them twice.
  } else return null;
  if (
    [input, output, cached].includes(null) ||
    !Number.isSafeInteger(input + output) ||
    cached + write5m + write1h > input
  )
    return null;
  const reportedTotal =
    provider === "google"
      ? u.totalTokenCount
      : provider === "anthropic"
        ? undefined
        : u.total_tokens;
  if (
    reportedTotal !== undefined &&
    reportedTotal !== null &&
    (count(reportedTotal) === null || reportedTotal !== input + output)
  )
    return null;
  return {
    input_tokens: input,
    output_tokens: output,
    cached_input_tokens: cached,
    cache_write_5m_tokens: write5m,
    cache_write_1h_tokens: write1h,
    total_tokens: input + output,
  };
}

function accounting(provider, requestedModel, data) {
  const usage = normalizeUsage(provider, data);
  const model =
    typeof data?.model === "string"
      ? data.model
      : typeof data?.modelVersion === "string"
        ? data.modelVersion
        : requestedModel;
  const rates =
    Object.hasOwn(PRICING, provider) && Object.hasOwn(PRICING[provider], model)
      ? PRICING[provider][model]
      : undefined;
  let reason = !usage
    ? "missing_or_invalid_usage"
    : !rates
      ? "unverified_model_price"
      : null;
  // Refuse unsupported billing modes rather than silently applying standard rates.
  if (
    ["audio_tokens", "image_tokens", "cache_write_tokens"].some(
      (k) => data?.usage?.prompt_tokens_details?.[k],
    ) ||
    data?.usage?.completion_tokens_details?.audio_tokens
  )
    reason = "unsupported_usage_category";
  if (
    data?.service_tier &&
    !["default", "standard"].includes(data.service_tier)
  )
    reason = "unsupported_service_tier";
  if (
    data?.usage?.server_tool_use &&
    Object.values(data.usage.server_tool_use).some((v) => v !== 0)
  )
    reason = "unsupported_tool_charges";
  let cost = reason
    ? null
    : ((usage.input_tokens -
        usage.cached_input_tokens -
        usage.cache_write_5m_tokens -
        usage.cache_write_1h_tokens) *
        rates.input +
        usage.cached_input_tokens * rates.cached +
        usage.cache_write_5m_tokens * (rates.write5m || 0) +
        usage.cache_write_1h_tokens * (rates.write1h || 0) +
        usage.output_tokens * rates.output) /
      1e6;
  if (
    cost !== null &&
    (!Number.isFinite(cost) || !Number.isSafeInteger(Math.round(cost * 1e9)))
  ) {
    cost = null;
    reason = "usage_charge_out_of_range";
  }
  return {
    model_used: model,
    usage_source: usage ? "provider" : "unavailable",
    input_tokens: usage?.input_tokens ?? null,
    output_tokens: usage?.output_tokens ?? null,
    usage,
    cost,
    cost_source: cost === null ? "unavailable" : "published_rate_estimate",
    cost_unavailable_reason: reason,
    currency: "USD",
    pricing_version: PRICE_VERSION,
    cost_without_optimization: null,
    cost_saved: null,
    savings_percent: null,
    savings_basis: "unmeasured_baseline",
    tokens_saved: 0,
  };
}

function cacheAccounting(original) {
  original = structuredClone(original);
  const avoided =
    typeof original.cost === "number" &&
    Number.isFinite(original.cost) &&
    original.cost >= 0
      ? original.cost
      : null;
  return {
    ...original,
    usage_source: "cache_record",
    cost: 0,
    cost_source: "no_provider_call",
    cost_unavailable_reason: null,
    cost_without_optimization: avoided,
    cost_saved: avoided,
    savings_percent: avoided !== null && avoided > 0 ? 100 : null,
    savings_basis: "avoided_repeat_at_original_rate",
    tokens_saved: original.usage?.total_tokens ?? null,
    // These are tokens billed on THIS request, not the cached response's original usage.
    input_tokens: 0,
    output_tokens: 0,
  };
}

module.exports = {
  PRICING,
  PRICE_VERSION,
  normalizeUsage,
  accounting,
  cacheAccounting,
};
