"use client";
import { useState } from "react";
import { plans, calculateBenefit } from "../lib/plans";
export default function BenefitCalculator() {
  const [spend, setSpend] = useState("1000");
  const [reduction, setReduction] = useState(20);
  const [fee, setFee] = useState(99);
  const amount = Number(spend);
  const valid =
    spend.trim() !== "" &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 100000000;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  const benefit = calculateBenefit(amount, reduction, fee);
  const breakEven = reduction > 0 ? fee / (reduction / 100) : null;
  return (
    <div className="resource-calculator">
      <div>
        <label htmlFor="pricing-spend">
          Monthly provider spend · USD
          <input
            id="pricing-spend"
            type="number"
            min="0"
            max="100000000"
            step="any"
            value={spend}
            aria-invalid={!valid}
            aria-describedby={!valid ? "pricing-input-error" : undefined}
            onChange={(e) => setSpend(e.target.value)}
          />
        </label>
        <label htmlFor="pricing-plan">
          Plan for this scenario
          <select
            id="pricing-plan"
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          >
            {plans
              .filter((p) => p.price !== null)
              .map((p) => (
                <option key={p.name} value={p.price!}>
                  {p.name} — ${p.price}/month
                </option>
              ))}
          </select>
        </label>
        <label htmlFor="pricing-reduction">
          Assumed provider-cost reduction: {reduction}%
          <input
            id="pricing-reduction"
            type="range"
            min="0"
            max="100"
            value={reduction}
            onChange={(e) => setReduction(Number(e.target.value))}
          />
        </label>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <span className="resource-badge">Hypothetical monthly result</span>
        {valid ? (
          <>
            <output>{money(benefit)}</output>
            <p>
              {benefit > 0
                ? "Net benefit after subscription"
                : benefit === 0
                  ? "Break-even before other costs"
                  : "Additional cost after subscription"}
            </p>
            <p>
              {money((amount * reduction) / 100)} provider savings −{" "}
              {money(fee)} subscription.
            </p>
            <p>
              {breakEven !== null
                ? `At this assumed reduction, break-even provider spend is ${money(breakEven)}/month before other costs.`
                : "At 0% reduction, provider savings cannot cover the subscription."}
            </p>
          </>
        ) : (
          <p id="pricing-input-error">
            Enter a provider spend between $0 and $100,000,000.
          </p>
        )}
      </div>
    </div>
  );
}
