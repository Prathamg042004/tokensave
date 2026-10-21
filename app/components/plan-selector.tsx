"use client";
import { useState } from "react";
import { recommendPlan, planContact } from "../lib/plans";
export default function PlanSelector() {
  const [requests, setRequests] = useState("25000");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const value = Number(requests);
  const valid =
    requests.trim() !== "" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 1000000000;
  const plan = valid ? recommendPlan(value) : null;
  const brief = `TokenSave evaluation enquiry\nMonthly requests: ${valid ? value.toLocaleString("en-US") : "To confirm"}\nListed tier to discuss: ${plan?.name ?? "To confirm"}\n\nWorkflow:\nCurrent provider/model:\nMonthly provider spend:\nMeasured savings and quality results:\nPeak requests per minute:\nData and security requirements:\n\nPlease confirm activation, counting, capacity, overages, taxes, renewal, cancellation, refund and support terms in a written quote.`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }
  return (
    <div className="resource-calculator">
      <div>
        <label htmlFor="request-volume">
          Expected monthly requests
          <input
            id="request-volume"
            type="number"
            min="0"
            max="1000000000"
            step="1"
            value={requests}
            onChange={(e) => {
              setRequests(e.target.value);
              setCopied(false);
              setCopyFailed(false);
            }}
            aria-invalid={!valid}
            aria-describedby={
              valid ? "volume-help" : "volume-help volume-error"
            }
          />
        </label>
        <p id="volume-help">
          Use your application traffic estimate. Batch prompts, failed calls and
          cache hits need an agreed counting rule.
        </p>
      </div>
      <div aria-live="polite">
        <span className="resource-badge">Volume fit · indicative only</span>
        {plan ? (
          <>
            <h3>{plan.name} discussion</h3>
            <p>
              {plan.price === null
                ? "Your volume needs a custom capacity and price discussion."
                : `Listed fee: $${plan.price}/month for a stated volume of ${plan.volume}.`}
            </p>
            <p>
              This compares listed volumes only. It does not confirm throughput,
              eligibility or whether the subscription pays for itself.
            </p>
            <a className="resource-button" href={planContact(plan.name)}>
              Discuss {plan.name} →
            </a>
          </>
        ) : (
          <p id="volume-error">
            Enter a whole number between 0 and 1,000,000,000.
          </p>
        )}
      </div>
      <details className="resource-brief">
        <summary>Prepare an evaluation brief</summary>
        <p>
          No information is submitted here. Copy this brief into your own email
          and complete it.
        </p>
        <textarea
          aria-label="Evaluation brief"
          readOnly
          rows={12}
          value={brief}
        />
        <button
          type="button"
          className="resource-button resource-button-secondary"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy brief"}
        </button>
        <span role="status">
          {copied
            ? " Brief copied."
            : copyFailed
              ? " Clipboard access failed. Select and copy the brief above."
              : " You can also select and copy the text."}
        </span>
      </details>
    </div>
  );
}
