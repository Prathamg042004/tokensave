// Regenerate with node scripts/generate-openapi.mjs. No network or provider calls.
import fs from "node:fs";
import ts from "typescript";
const source = ts.transpileModule(
  fs.readFileSync(new URL("../app/lib/api-docs.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const { endpoints, API_BASE } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const message = {
  type: "object",
  required: ["role", "content"],
  properties: {
    role: { type: "string", enum: ["user", "assistant", "system"] },
    content: { type: "string", minLength: 1, maxLength: 100000, pattern: "\\S" },
  },
  additionalProperties: false,
};
const schemas = {
  Message: message,
  ProxyRequest: {
    type: "object",
    required: ["apiKey", "messages"],
    properties: {
      provider: {
        type: "string",
        enum: ["anthropic", "openai", "google", "groq"],
        default: "anthropic",
      },
      apiKey: {
        type: "string",
        minLength: 10,
        maxLength: 500,
        pattern: "^[!-~]{10,500}$",
        writeOnly: true,
      },
      messages: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        items: ref("Message"),
      },
      tsKey: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description:
          "Validated TokenSave credential for account attribution and rate limiting.",
      },
      model: { type: "string" },
      quality: {
        type: "string",
        enum: ["auto", "max_savings", "max_quality"],
        default: "auto",
        description:
          "Validated quality mode; max_savings currently follows auto.",
      },
      fallbackKeys: {
        type: "object",
        additionalProperties: { type: "string", writeOnly: true },
      },
      tags: {
        type: "object",
        additionalProperties: { type: "string" },
        description:
          "Up to 20 non-empty string values; key/value lengths are validated.",
      },
      userId: {
        type: "string",
        description: "Analytics identifier, not authenticated identity.",
      },
      webhookUrl: {
        type: "string",
        format: "uri",
        description:
          "Disabled; supplying webhookUrl returns 400.",
      },
    },
    additionalProperties: true,
  },
  ProxyResponse: {
    type: "object",
    required: ["tokensave_meta"],
    properties: {
      tokensave_meta: {
        type: "object",
        properties: {
          request_id: { type: "string" },
          cache_hit: { type: "boolean" },
          model_used: { type: "string" },
          complexity: { type: "string", enum: ["simple", "complex"] },
          chars_saved: { type: "number" },
          quality_mode: { type: "string" },
          latency_ms: { type: "number" },
          method: { type: "string" },
          cost: { type: ["number", "null"] },
          cost_without_optimization: { type: ["number", "null"] },
          savings_percent: { type: ["number", "null"] },
          input_tokens: { type: ["number", "null"] },
          output_tokens: { type: ["number", "null"] },
          tokens_saved: { type: ["number", "null"] },
          cost_saved: { type: ["number", "null"] },
          cost_source: { type: "string" },
          cost_unavailable_reason: { type: ["string", "null"] },
          usage_source: { type: "string" },
          savings_basis: { type: "string" },
          currency: { type: "string", enum: ["USD"] },
          pricing_version: { type: "string" },
          tags: { type: "object", additionalProperties: { type: "string" } },
          original_provider: { type: "string" },
          fallback_provider: { type: "string" },
          is_error: { type: "boolean" },
          note: { type: "string" },
        },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
    description:
      "Native provider JSON with branch-dependent metadata. No universal choices/content contract.",
  },
  Error: {
    type: "object",
    properties: {
      error: {
        oneOf: [
          { type: "string" },
          { type: "object", additionalProperties: true },
        ],
      },
      tokensave_meta: { type: "object", additionalProperties: true },
    },
    additionalProperties: true,
    description:
      "Error envelope varies by middleware/provider. Check HTTP status before parsing.",
  },
  BatchRequest: {
    type: "object",
    required: ["apiKey", "prompts"],
    properties: {
      provider: {
        type: "string",
        enum: ["anthropic", "openai", "google", "groq"],
        default: "anthropic",
      },
      apiKey: { type: "string", writeOnly: true },
      prompts: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          oneOf: [
            { type: "string", minLength: 1 },
            {
              type: "object",
              required: ["content"],
              properties: { content: { type: "string", minLength: 1 } },
            },
          ],
        },
      },
    },
  },
  BatchResponse: {
    type: "object",
    required: [
      "batch_id",
      "total",
      "successful",
      "cached",
      "processing_time_ms",
      "results",
    ],
    properties: {
      batch_id: { type: "string" },
      total: { type: "integer" },
      successful: { type: "integer" },
      cached: { type: "integer" },
      processing_time_ms: { type: "number" },
      results: {
        type: "array",
        items: {
          type: "object",
          required: ["prompt", "status"],
          properties: {
            prompt: { type: "string" },
            status: { type: "string", enum: ["success", "error"] },
            response: { type: "object", additionalProperties: true },
            error: { type: "string" },
          },
        },
      },
    },
  },
  TrimRequest: {
    type: "object",
    required: ["messages"],
    properties: {
      messages: { type: "array", minItems: 1, maxItems: 100, items: ref("Message") },
      maxTokens: {
        type: "integer",
        minimum: 1,
        maximum: 1000000,
        default: 4000,
        description:
          "Enforced character-estimate budget; preserved content that cannot fit returns 422.",
      },
    },
  },
  TrimResponse: {
    type: "object",
    required: [
      "original_messages",
      "trimmed_messages",
      "messages_removed",
      "original_tokens",
      "final_tokens",
      "tokens_saved",
      "trimmed",
    ],
    properties: {
      ...Object.fromEntries(
        [
          "original_messages",
          "trimmed_messages",
          "messages_removed",
          "original_tokens",
          "final_tokens",
          "tokens_saved",
        ].map((k) => [k, { type: "number" }]),
      ),
      trimmed: { type: "array", items: ref("Message") },
    },
  },
  SmartRequest: {
    type: "object",
    required: ["messages"],
    properties: {
      messages: { type: "array", minItems: 1, maxItems: 100, items: ref("Message") },
      maxTokens: { type: "integer", minimum: 1, maximum: 1000000, default: 4000 },
      keepRecent: { type: "integer", minimum: 1, maximum: 100, default: 6 },
    },
    description:
      "Positive integer limits are enforced. Preserved content that cannot fit returns 422.",
  },
  SmartResponse: {
    type: "object",
    required: [
      "optimized",
      "original_tokens",
      "final_tokens",
      "tokens_saved",
      "percent_saved",
      "messages",
    ],
    properties: {
      optimized: { type: "boolean" },
      reason: { type: "string" },
      ...Object.fromEntries(
        [
          "original_messages",
          "optimized_messages",
          "messages_summarized",
          "messages_kept",
          "original_tokens",
          "final_tokens",
          "tokens_saved",
          "percent_saved",
        ].map((k) => [k, { type: "number" }]),
      ),
      messages: { type: "array", minItems: 1, maxItems: 100, items: ref("Message") },
    },
    additionalProperties: true,
  },
  Health: {
    type: "object",
    required: ["status", "timestamp", "version", "services"],
    properties: {
      status: { type: "string", enum: ["healthy", "degraded"] },
      timestamp: { type: "string", format: "date-time" },
      version: { type: "string" },
      services: {
        type: "object",
        additionalProperties: { type: "object", additionalProperties: true },
      },
    },
  },
  Discovery: {
    type: "object",
    properties: {
      status: { type: "string" },
      service: { type: "string" },
      version: { type: "string" },
    },
    additionalProperties: true,
  },
};
const requestNames = {
  proxy: "ProxyRequest",
  batch: "BatchRequest",
  "trim-context": "TrimRequest",
  "smart-context": "SmartRequest",
};
const responseNames = {
  proxy: "ProxyResponse",
  batch: "BatchResponse",
  "trim-context": "TrimResponse",
  "smart-context": "SmartResponse",
  health: "Health",
  discovery: "Discovery",
};
const paths = {};
for (const endpoint of endpoints) {
  const method = endpoint.method.toLowerCase();
  const responseSchema = ref(responseNames[endpoint.id]);
  const examples = {
    success: {
      summary: "Illustrative success; not measured performance",
      value: JSON.parse(endpoint.response),
    },
  };
  for (const e of endpoint.responses || [])
    if (e.status === 200)
      examples[e.name.replaceAll(" ", "_")] = {
        summary: e.name,
        value: e.body,
      };
  const operation = {
    operationId: endpoint.id.replaceAll("-", "_"),
    summary: endpoint.title,
    description: [endpoint.description, endpoint.caveat]
      .filter(Boolean)
      .join("\n\n"),
    tags: ["Integration"],
    responses: {
      200: {
        description: "Successful JSON response; examples are illustrative.",
        content: { "application/json": { schema: responseSchema, examples } },
      },
    },
  };
  if (requestNames[endpoint.id])
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: ref(requestNames[endpoint.id]),
          example: JSON.parse(endpoint.request),
        },
      },
    };
  if (method === "post")
    for (const status of [400, 401, 413, 422, 429, 500, 502, 503, 504])
      operation.responses[status] = {
        description: {
          400: "Invalid request",
          401: "Invalid account or provider credential",
          413: "Request body exceeds the streamed byte limit",
          422: "Preserved content exceeds the estimated context budget",
          502: "Invalid provider response or connection failure",
          503: "Authentication or storage unavailable",
          504: "Provider deadline or cancellation",
          429: "Proxy or provider rate/quota limit",
          500: "Unexpected internal failure",
        }[status],
        content: { "application/json": { schema: ref("Error") } },
      };
  for (const e of endpoint.responses || [])
    if (e.status !== 200)
      operation.responses[e.status] = {
        description: e.name,
        content: {
          "application/json": {
            schema: ref(e.status === 503 ? "Health" : "Error"),
            example: e.body,
          },
        },
      };
  if (endpoint.id === "proxy") {
    operation.responses["200"].headers = {
      "X-RateLimit-Limit": {
        schema: { type: "integer" },
        description: "Configured proxy window limit.",
      },
      "X-RateLimit-Remaining": {
        schema: { type: "integer" },
        description: "Remaining requests in this Redis window.",
      },
    };
    operation.responses["429"].headers = {
      "Retry-After": {
        schema: { type: "integer" },
        description:
          "Remaining Redis window lifetime for the proxy limiter; upstream failures may omit it.",
      },
    };
    operation.responses.default = {
      description:
        "Other upstream HTTP statuses may be forwarded with a sanitized error object.",
      content: { "application/json": { schema: ref("Error") } },
    };
  }
  (paths[endpoint.path] ||= {})[method] = operation;
}
const output =
  JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "TokenSave integration API",
        version: "3.1.0",
        description:
          "Custom non-streaming text API. This contract documents recommended inputs and current response shapes, not a production assurance. An optional validated tsKey attributes usage to an account. Native provider success responses vary. Credential-isolated caching is scoped by provider, resolved model, quality and messages. Synthetic-data evaluation is recommended. Dashboard management routes are intentionally outside this integration contract.",
      },
      servers: [{ url: API_BASE }],
      security: [],
      paths,
      components: { schemas },
    },
    null,
    2,
  ) + "\n";
const target = new URL("../public/openapi.json", import.meta.url);
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output)
    throw new Error("OpenAPI is stale; run node scripts/generate-openapi.mjs");
} else fs.writeFileSync(target, output);
