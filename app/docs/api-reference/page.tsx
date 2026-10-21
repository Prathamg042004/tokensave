import type { Metadata } from "next";
import Link from "next/link";
import {
  ResourceShell,
  ResourceHero,
  Note,
  Section,
  Fields,
} from "../../components/resource-shell";
import { internalEndpoints, API_BASE, endpoints } from "../../lib/api-docs";
import ReferenceClient from "./reference-client";
export const metadata: Metadata = {
  title: "API reference · TokenSave",
  description:
    "Request schemas, native response formats, limits, errors and current implementation notes for the TokenSave JSON API.",
};
export default function ApiReference() {
  return (
    <ResourceShell section="API reference">
      <ResourceHero
        eyebrow="HTTP API · IMPLEMENTATION REFERENCE"
        title="Every request, explained."
      >
        <p>
          Schemas, responses and operational limits for the current text API.
          Base URL: <code>{API_BASE}</code>.
        </p>
        <div className="resource-actions">
          <a
            href="/openapi.json"
            download="tokensave-openapi.json"
            className="resource-button"
          >
            Download OpenAPI 3.1 →
          </a>
          <Link
            href="/docs"
            className="resource-button resource-button-secondary"
          >
            Integration guide
          </Link>
        </div>
      </ResourceHero>
      <div className="resource-layout">
        <nav className="resource-toc" aria-label="API reference sections">
          <strong>API reference</strong>
          <a href="#contract">Conventions</a>
          <a href="#examples">Code examples</a>
          {endpoints.map((e) => (
            <a key={e.id} href={`#${e.id}`}>
              {e.method} {e.path}
            </a>
          ))}
          <a href="#metadata">Response metadata</a>
          <a href="#internal">Dashboard endpoints</a>
        </nav>
        <div>
          <Note title="Read before integrating">
            <p>
              This is a custom API, not an SDK base-URL replacement. Start with
              synthetic data. Provider keys and prompts reach the hosted proxy.{" "}
              <Link href="/docs#pipeline">
                Review cache isolation and optimization limitations
              </Link>
              .
            </p>
          </Note>
          <Section id="contract" title="Conventions & limits">
            <Fields
              headings={["Topic", "Current behavior", "What to do"]}
              rows={[
                [
                  "Content type",
                  "JSON request/response; no streaming",
                  "Send Content-Type: application/json.",
                ],
                [
                  "Credentials",
                  "apiKey in proxy/batch body",
                  "Use provider keys from server environment variables. Never log request bodies.",
                ],
                [
                  "TokenSave key",
                  "Optional tsKey rate-limit identifier",
                  "Not a verified authentication or paid-plan entitlement.",
                ],
                [
                  "Proxy rate window",
                  "60 requests per 60-second Redis window",
                  "tsKey bucket, or client IP if absent. No paid-tier differentiation; Redis errors can disable enforcement.",
                ],
                [
                  "Size limits",
                  "100 messages; 100,000 characters per content; declared body limit 500,000 bytes",
                  "Treat provider context limits separately.",
                ],
                [
                  "API version",
                  "No versioned URL contract",
                  "Discovery reports version 3.1.0. Check changelog and retest before upgrades.",
                ],
                [
                  "Retries",
                  "No idempotency key support",
                  "Set a timeout and bounded retry budget. Repeated calls can cost money.",
                ],
                [
                  "Errors",
                  "error may be string or object",
                  "Check HTTP status first. Validation: 400; size: 413; rate: 429; unexpected failure: 500; upstream statuses can pass through.",
                ],
              ]}
            />
            <p>
              <Link href="/docs#errors">
                See detailed error and retry guidance →
              </Link>
            </p>
          </Section>
          <ReferenceClient />
          <Section id="metadata" title="Read tokensave_meta defensively">
            <Fields
              headings={["Field", "When present", "Meaning"]}
              rows={[
                [
                  "request_id",
                  "Proxy response metadata",
                  "Diagnostic identifier. Not an idempotency key.",
                ],
                [
                  "cache_hit / method",
                  "Cache or provider path",
                  "cache, fallback, routed_to_cheap or routed_to_smart. Routing labels can differ from the actual overridden model; inspect model_used.",
                ],
                [
                  "model_used / complexity",
                  "Provider calls",
                  "Chosen model ID and rule-based simple/complex classification. May be absent on a cache hit.",
                ],
                [
                  "quality_mode / chars_saved",
                  "Quality mode; characters on a miss",
                  "Characters removed are not tokenizer-measured tokens.",
                ],
                [
                  "latency_ms",
                  "Proxy timing",
                  "Server-side elapsed time at the point measured; not full browser round trip.",
                ],
                [
                  "cost / cost_without_optimization / savings_percent",
                  "Provider calls",
                  "Estimated USD and comparison with a configured expensive model. Not actual savings versus your application baseline.",
                ],
                [
                  "input_tokens / output_tokens",
                  "Provider calls",
                  "Character-based estimates, not authoritative provider billing usage.",
                ],
                [
                  "original_provider / fallback_provider",
                  "Successful fallback",
                  "Fallback can change response schema and quality behavior.",
                ],
                [
                  "tokens_saved",
                  "Cache hit",
                  "String 100% indicates a reused response, not measured account-wide savings.",
                ],
                [
                  "tags / is_error / note",
                  "Depends on path",
                  "Optional diagnostic information; do not assume identical metadata on all branches.",
                ],
              ]}
            />
            <p>
              Native response paths: OpenAI/Groq{" "}
              <code>choices[0].message.content</code>; Anthropic text blocks in{" "}
              <code>content</code>; Google text parts in <code>candidates</code>
              . Check the returned shape, especially after fallback.
            </p>
          </Section>
          <Section id="internal" title="Dashboard & operational endpoints">
            <p>
              Inventory for transparency. These routes exist, but they do not
              establish a supported, tenant-isolated external management API. Do
              not build customer authorization or billing on caller-supplied
              identifiers or service-wide counters.
            </p>
            <Fields
              headings={["Endpoint", "Purpose", "Current boundary"]}
              rows={internalEndpoints}
            />
            <p>
              <Link href="/security">Review security and data handling</Link>{" "}
              before connecting production systems.{" "}
              <a href="https://github.com/Prathamg042004/tokensave/tree/main/app/api">
                Inspect route implementations ↗
              </a>
            </p>
          </Section>
        </div>
      </div>
    </ResourceShell>
  );
}
