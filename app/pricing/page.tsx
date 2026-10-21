import type { Metadata } from "next";
import Link from "next/link";
import {
  ResourceShell,
  ResourceHero,
  Note,
  Section,
  Fields,
} from "../components/resource-shell";
import PricingCards from "../components/pricing-cards";
import BenefitCalculator from "../components/benefit-calculator";
import PlanSelector from "../components/plan-selector";
export const metadata: Metadata = {
  title: "Pricing & evaluation · TokenSave",
  description:
    "Compare TokenSave's listed plans, separate provider costs, model break-even and review commercial details before purchase.",
};
export default function Pricing() {
  return (
    <ResourceShell section="Pricing">
      <ResourceHero
        eyebrow="PRICING & EVALUATION"
        title="Make the numbers work for you."
      >
        <p>
          Choose a workload, measure its results, then discuss a plan. TokenSave
          subscription fees and AI-provider usage are separate.
        </p>
        <div className="resource-actions">
          <Link href="/playground" className="resource-button">
            Evaluate in the playground →
          </Link>
          <a
            href="#calculator"
            className="resource-button resource-button-secondary"
          >
            Calculate break-even
          </a>
        </div>
      </ResourceHero>
      <Note title="Evaluate first. Confirm the plan before purchase.">
        <p>
          Prices below are listed monthly plans in USD. Plan activation and
          commercial terms require confirmation with TokenSave. Signing up does
          not start a paid subscription or confirm trial eligibility. Provider
          charges may apply during evaluation.
        </p>
      </Note>
      <nav className="resource-pricing-nav" aria-label="Pricing sections">
        <a href="#compare">Compare plans</a>
        <a href="#choose">Find a volume fit</a>
        <a href="#calculator">Calculate break-even</a>
        <a href="#commercial">Commercial details</a>
      </nav>
      <PricingCards />
      <Section id="compare" title="Compare the plans">
        <p>
          Core optimization is shared. Listed volume and individually agreed
          service scope distinguish these options; switching plans does not
          automatically unlock a different routing engine.
        </p>
        <Fields
          headings={["Plan detail", "Starter", "Growth", "Enterprise"]}
          rows={[
            ["Listed monthly fee (USD)", "$99", "$499", "Written quote"],
            [
              "Stated monthly volume",
              "50,000 requests",
              "500,000 requests",
              "Agreed volume",
            ],
            [
              "Caching, routing, compression",
              "Core product",
              "Core product",
              "Core product; custom work quoted separately",
            ],
            [
              "Provider usage",
              "Billed separately",
              "Billed separately",
              "Billed separately",
            ],
            [
              "Throughput and activation",
              "Confirm before purchase",
              "Confirm before purchase",
              "Agree capacity before purchase",
            ],
            [
              "Support / onboarding",
              "Written scope",
              "Written scope",
              "Custom scope",
            ],
            [
              "SLA / data commitments",
              "No standard commitment",
              "No standard commitment",
              "Only if agreed in writing",
            ],
          ]}
        />
        <p>
          Growth lists 10× the volume at about 5× the monthly fee. That is a
          capacity comparison, not proof of savings. Choose based on your
          workload and an agreed service scope.
        </p>
      </Section>
      <Section id="choose" title="Find a volume fit">
        <PlanSelector />
      </Section>
      <Section id="process" title="A clear path from evaluation to activation">
        <ol>
          <li>
            <strong>Evaluate:</strong> use synthetic prompts with your own
            provider key. No TokenSave subscription is activated by this page;
            your provider may charge for requests.
          </li>
          <li>
            <strong>Measure:</strong> compare quality, actual provider usage and
            peak traffic against your current setup.
          </li>
          <li>
            <strong>Review a quote:</strong> agree scope, counted usage,
            throughput, charges, renewal and cancellation before accepting
            anything.
          </li>
          <li>
            <strong>Activate only after agreement:</strong> confirm the required
            controls and capacity are implemented for your workload.
          </li>
        </ol>
        <p>
          For self-hosting, the MIT-licensed source has no software licence fee;
          infrastructure, provider usage, maintenance and any separately agreed
          support remain your responsibility.
        </p>
      </Section>
      <Section id="included" title="Understand what you are evaluating">
        <Fields
          headings={["Capability", "Current product", "Commercial distinction"]}
          rows={[
            [
              "Response caching",
              "30-minute Redis cache when available",
              "Cache matching and tenant isolation need review before confidential production use.",
            ],
            [
              "Routing & compression",
              "Rule-based model choice and final-message text trimming",
              "No guaranteed savings or output quality.",
            ],
            [
              "Quality modes",
              "auto and max_quality; max_savings currently follows auto",
              "Do not assume a separate optimization engine or paid access gate.",
            ],
            [
              "Fallback",
              "Requires credentials for each backup provider",
              "Backup provider usage can be charged separately.",
            ],
            [
              "Dashboard",
              "Usage visibility with cost estimates",
              "Service-wide counters are not customer invoices.",
            ],
            [
              "Capacity",
              "Current proxy: 60 requests per 60-second window",
              "Paid-tier rate limits and monthly quota enforcement are not implemented in the current proxy.",
            ],
            [
              "Team & priority support",
              "Discuss requirements before purchase",
              "No standard response-time SLA or isolated enterprise management API is promised.",
            ],
          ]}
        />
      </Section>
      <Section id="calculator" title="Does the subscription pay for itself?">
        <p>
          Enter your measured reduction or explore an assumption. The default
          20% is a hypothetical input, not a prediction of TokenSave
          performance.
        </p>
        <BenefitCalculator />
        <p>
          Net benefit = provider spend × assumed reduction − subscription.
          Excludes taxes, overages, retries, integration and operating costs.
          Confirm that your request volume fits the agreed plan. A cheaper model
          only creates value if its output meets your requirements.
        </p>
      </Section>
      <Section id="commercial" title="Commercial details, before you commit">
        <p>
          This page offers evaluation and plan enquiries, not checkout. The
          listed prices are a starting point for a written agreement; do not
          treat an enquiry or account signup as an activated subscription.
        </p>
        <Fields
          headings={["Question", "Published position", "Before activation"]}
          rows={[
            [
              "What counts as a request?",
              "Plan cards list monthly request volumes",
              "Confirm counting for cache hits, failures, retries, fallback and each prompt in a batch.",
            ],
            [
              "What happens at the quota?",
              "No published overage rate or quota policy",
              "Agree cap behavior, alerts and any extra charges before sending paid traffic.",
            ],
            [
              "Is there a trial?",
              "Playground evaluation with your own provider key",
              "No trial duration, credits or eligibility are guaranteed by account creation.",
            ],
            [
              "When am I charged?",
              "Listed monthly subscription prices in USD",
              "Confirm activation date, invoice cadence, taxes, payment method and any renewal arrangement.",
            ],
            [
              "Can I cancel or get a refund?",
              "No standard cancellation/refund policy published",
              "Obtain the notice period, effective date and refund rules in writing before purchase.",
            ],
            [
              "What support is included?",
              "Contact support for scope",
              "Agree channels, coverage, response targets and onboarding deliverables.",
            ],
            [
              "Enterprise assurances?",
              "No default SLA, compliance or residency commitment",
              "Agree any required security, data-processing and service terms first.",
            ],
          ]}
        />
        <a
          className="resource-button"
          href="mailto:support@tokensave.in?subject=TokenSave%20written%20plan%20quote&body=Please%20send%20a%20written%20quote%20covering%20plan%20activation%2C%20request%20counting%2C%20overages%2C%20billing%2C%20taxes%2C%20cancellation%2C%20refunds%20and%20support.%0A%0AWorkflow%3A%0AMonthly%20requests%3A%0AProvider%20spend%3A%0AData%20requirements%3A"
        >
          Request a written quote →
        </a>
      </Section>
      <Section id="faq" title="A few practical answers">
        <div className="resource-faq">
          {[
            [
              "Do these prices include model usage?",
              "No. Your selected AI providers bill usage on your credentials. TokenSave's listed subscription is separate; include both when evaluating value.",
            ],
            [
              "Will switching to Growth remove the rate limit?",
              "The current proxy does not enforce plan-specific limits or paid entitlements. Do not purchase on the assumption of higher throughput; confirm implementation and capacity before activation.",
            ],
            [
              "Can I guarantee a saving?",
              "No. Repetition, baseline model, prompt format, quality requirements and subscription cost all affect the outcome. Use direct-provider measurements and invoices, not estimated dashboard totals.",
            ],
            [
              "Can I self-host?",
              "The source is MIT-licensed. Self-hosting has its own infrastructure, provider and maintenance costs, and does not remove the need to review security and external data flows.",
            ],
            [
              "How do I choose a plan?",
              "Start with representative synthetic prompts. Measure acceptable output quality, expected monthly requests and real provider savings. Then request a quote that defines capacity and service terms.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <p>
          <Link href="/docs">Integration guide</Link> ·{" "}
          <Link href="/security">Security & data handling</Link> ·{" "}
          <a href="mailto:support@tokensave.in">support@tokensave.in</a>
        </p>
      </Section>
    </ResourceShell>
  );
}
