import type { Metadata } from "next";
import Link from "next/link";
import {
  ResourceShell,
  ResourceHero,
  Note,
  Section,
  Fields,
} from "../components/resource-shell";
import CodeBlock from "../components/code-block";
import { javascriptExample, routingModels } from "../lib/api-docs";
export const metadata: Metadata = {
  title: "Integration guide · TokenSave",
  description:
    "Integrate TokenSave's text JSON API, understand caching and routing, handle failures, and evaluate cost and output quality.",
};
const sections = [
  ["quickstart", "Quick start"],
  ["compatibility", "Compatibility"],
  ["pipeline", "Request behavior"],
  ["routing", "Models & quality"],
  ["errors", "Errors & retries"],
  ["measurement", "Measure results"],
  ["production", "Before production"],
];
export default function Docs() {
  return (
    <ResourceShell section="Docs">
      <ResourceHero
        eyebrow="DEVELOPER DOCUMENTATION"
        title="From first request to informed decision."
      >
        <p>
          Connect your server, inspect the result, and evaluate TokenSave
          against your own cost and quality requirements.
        </p>
        <div className="resource-actions">
          <Link className="resource-button" href="/docs/api-reference">
            Explore the API reference →
          </Link>
          <Link
            className="resource-button resource-button-secondary"
            href="/playground"
          >
            Try the playground
          </Link>
        </div>
      </ResourceHero>
      <div className="resource-layout">
        <nav className="resource-toc" aria-label="On this page">
          <strong>Integration guide</strong>
          {sections.map(([id, title]) => (
            <a key={id} href={`#${id}`}>
              {title}
            </a>
          ))}
        </nav>
        <div>
          <Note title="A custom JSON API for non-streaming text">
            <p>
              Changing the base URL of an OpenAI or Anthropic SDK is not
              sufficient. Use HTTP requests with the schema below. Hosted
              requests include prompts and provider credentials; start with
              synthetic data and{" "}
              <Link href="/security">review data handling</Link>.
            </p>
          </Note>
          <Section id="quickstart" title="01 · Make your first request">
            <ol>
              <li>
                Choose a provider: Anthropic, OpenAI, Google or Groq. Create a
                provider key with an appropriate usage limit.
              </li>
              <li>
                Store it in your server environment. For this example set{" "}
                <code>OPENAI_API_KEY</code>. Never prefix secrets with{" "}
                <code>NEXT_PUBLIC_</code> or commit them to source control.
              </li>
              <li>
                Send the request below from Node.js 20+ on your server. A
                TokenSave account is not required by the current proxy; provider
                usage charges can apply.
              </li>
            </ol>
            <CodeBlock
              code={javascriptExample}
              label="JavaScript · Node.js 20+"
            />
            <p>
              A successful OpenAI request returns <code>choices</code> plus{" "}
              <code>tokensave_meta</code>. Check the HTTP status before
              rendering the answer. The reference also includes Python and cURL
              examples.
            </p>
            <p>
              Optional: <Link href="/login">sign in</Link> to explore the
              dashboard. A <code>tsKey</code> currently supplies a rate-limit
              identifier, not a verified subscription entitlement.
            </p>
          </Section>
          <Section id="compatibility" title="02 · Know the supported surface">
            <Fields
              headings={[
                "Capability",
                "Current support",
                "Integration consequence",
              ]}
              rows={[
                [
                  "Text messages",
                  "Supported",
                  "user, assistant and system string messages accepted by the proxy; each provider still has role restrictions.",
                ],
                [
                  "Provider responses",
                  "Native JSON",
                  "Parse the response for your selected provider. Fallback may change its shape.",
                ],
                [
                  "Streaming / SSE",
                  "Not supported",
                  "Wait for a complete JSON response.",
                ],
                [
                  "Tool calling, images, audio, structured-output options",
                  "Not forwarded",
                  "Use the direct provider for workflows requiring these capabilities.",
                ],
                [
                  "Provider parameters",
                  "Limited",
                  "model is supported. temperature, max_tokens and other extra fields are not forwarded; Anthropic output limit is fixed at 1024.",
                ],
                [
                  "Context endpoints",
                  "Separate operations",
                  "Call trim-context or smart-context explicitly, review the returned messages, then send them to proxy.",
                ],
              ]}
            />
          </Section>
          <Section id="pipeline" title="03 · Understand the request path">
            <ol>
              <li>
                <strong>Validate and clean:</strong> messages and key are
                validated, control characters stripped. Proxy accepts up to 100
                messages and 100,000 characters per message. Declared body sizes
                above 500,000 bytes are rejected.
              </li>
              <li>
                <strong>Rate limit:</strong> a Redis-backed 60-request window of
                60 seconds uses tsKey or client IP. It currently does not vary
                by paid plan. Redis failure can disable enforcement.
              </li>
              <li>
                <strong>Look up cached content:</strong> eligible responses are
                stored for 30 minutes when Redis is available. Matching uses a
                hash of cleaned roles and content, not semantic similarity.
              </li>
              <li>
                <strong>Route and compress on a miss:</strong> complexity rules
                choose a model, or your model override is used. Except in
                max_quality, the final message may have whitespace and filler
                phrases removed.
              </li>
              <li>
                <strong>Call a provider:</strong> eligible rate/quota failures
                can attempt supplied fallback credentials. All providers can
                still fail; return errors to your application.
              </li>
              <li>
                <strong>Return metadata:</strong> inspect cache status, selected
                model and timing. Cost figures are estimates.
              </li>
            </ol>
            <Note title="Cache matching needs production review">
              <p>
                The current cache key does not include provider, model, quality,
                credentials or tenant identity. A repeated prompt may reuse a
                response across these settings. There is no request-level cache
                bypass or public purge API. Do not treat changing quality or
                model as an isolated experiment, or use confidential
                multi-tenant traffic without addressing isolation.
              </p>
            </Note>
            <p>
              Compression can remove line breaks and meaningful formatting.
              Validate code, JSON, quoted text and formatting-sensitive tasks.{" "}
              <code>max_quality</code> skips compression on a cache miss.
            </p>
          </Section>
          <Section id="routing" title="04 · Choose your quality tradeoff">
            <Fields
              headings={["Provider identifier", "Simple path", "Capable path"]}
              rows={routingModels}
            />
            <p>
              These are model IDs configured in this repository, not a guarantee
              of current availability for your provider account. Confirm access
              with your provider before evaluating.
            </p>
            <Fields
              headings={["Mode", "Routing", "Compression"]}
              rows={[
                [
                  "auto",
                  "Rule-based simple/complex classification",
                  "Enabled for the final message when applicable.",
                ],
                [
                  "max_savings",
                  "Currently identical to auto",
                  "Currently identical to auto.",
                ],
                [
                  "max_quality",
                  "Capable path unless model overrides it",
                  "Skipped. Cache is still checked first.",
                ],
              ]}
            />
            <p>
              Fallback tries configured credentials in Groq → Anthropic → OpenAI
              → Google order, excluding the primary. It uses complexity-based
              model selection and may not preserve the primary model override or
              max_quality intent. Parse according to the returned provider.
            </p>
          </Section>
          <Section id="errors" title="05 · Handle failures deliberately">
            <Fields
              headings={["Status", "Meaning", "Client action"]}
              rows={[
                [
                  "400",
                  "Proxy input validation failed",
                  "Correct the body; do not retry unchanged.",
                ],
                [
                  "413",
                  "Declared request body exceeds 500,000 bytes",
                  "Reduce the request size.",
                ],
                [
                  "429",
                  "TokenSave limit or upstream rate/quota failure",
                  "For proxy limits honor Retry-After (60 seconds). Use bounded backoff with jitter; stop when your retry budget is exhausted.",
                ],
                [
                  "Provider 4xx / 5xx",
                  "Upstream error forwarded after eligible fallback attempts",
                  "Inspect status; fix credentials or model access for auth/configuration failures.",
                ],
                [
                  "500",
                  "Parsing, transport or unexpected proxy failure",
                  "Record safe diagnostics; consider a bounded retry or a direct-provider recovery path.",
                ],
              ]}
            />
            <p>
              Set a client timeout. A timeout does not prove the provider
              stopped processing; retrying can incur another charge. The current
              API does not provide idempotency keys. Do not log credentials, raw
              prompts or sensitive provider errors.
            </p>
            <p>
              Success and proxy-rate-limit responses include{" "}
              <code>X-RateLimit-Limit</code> and{" "}
              <code>X-RateLimit-Remaining</code>. They are not guaranteed on
              every error path. There is no stable universal error envelope;{" "}
              <code>error</code> can be a string or provider object.
            </p>
          </Section>
          <Section
            id="measurement"
            title="06 · Prove the benefit on your workload"
          >
            <ol>
              <li>
                Collect representative synthetic tasks and define an acceptable
                answer for each.
              </li>
              <li>
                Run a direct-provider baseline with your real production model
                and record provider-reported usage, latency and task success.
              </li>
              <li>
                Run an optimized evaluation, separating first requests from
                repeated/cache-hit requests. Account for the cache-matching
                limitation above.
              </li>
              <li>
                Compare answer quality, provider invoices and latency
                distributions. Include retries, fallback calls and integration
                effort.
              </li>
              <li>
                Calculate net benefit: actual provider savings − TokenSave
                subscription − other operating costs.{" "}
                <Link href="/pricing#calculator">
                  Explore a pricing scenario
                </Link>
                .
              </li>
            </ol>
            <p>
              Token estimates use character counts; output estimates use a
              truncated serialized provider payload. Cache-hit logs include
              fixed savings placeholders. Neither dashboard totals nor{" "}
              <code>savings_percent</code> are measured billing evidence. No
              public reproducible savings benchmark is published yet.
            </p>
          </Section>
          <Section
            id="production"
            title="07 · Prepare for a production evaluation"
          >
            <p>
              Confirm authentication and tenant isolation, credential/log
              redaction, cache behavior, retention and deletion, provider
              availability, monitoring and recovery. Agree support and
              commercial terms before purchasing. No standard SLA or compliance
              certification is established by these docs.
            </p>
            <div className="resource-actions">
              <Link
                href="/security"
                className="resource-button resource-button-secondary"
              >
                Security & data handling
              </Link>
              <a
                href="mailto:support@tokensave.in?subject=TokenSave%20integration%20evaluation"
                className="resource-button"
              >
                Discuss your integration →
              </a>
            </div>
          </Section>
        </div>
      </div>
    </ResourceShell>
  );
}
