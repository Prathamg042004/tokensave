export const plans = [
  {
    name: "Starter",
    price: 99,
    volume: "50,000 requests / month",
    capacity: 50000,
    description: "For a focused text workflow.",
    features: [
      "Caching, routing and prompt compression",
      "Dashboard visibility with estimate labels",
      "Email support scope agreed before purchase",
    ],
  },
  {
    name: "Growth",
    price: 499,
    volume: "500,000 requests / month",
    capacity: 500000,
    description: "For a larger workload evaluation.",
    features: [
      "Core optimization capabilities",
      "Discuss team setup and fallback requirements",
      "Support and onboarding scope agreed in writing",
    ],
  },
  {
    name: "Enterprise",
    price: null,
    volume: "Volume and requirements agreed together",
    capacity: null,
    description: "For a tailored deployment conversation.",
    features: [
      "Review security and data requirements",
      "Agree capacity, billing and service terms",
      "Confirm custom work before committing",
    ],
  },
] as const;
export function planContact(name: string) {
  return `mailto:support@tokensave.in?subject=${encodeURIComponent(`TokenSave ${name} plan enquiry`)}`;
}
export function calculateBenefit(
  spend: number,
  reduction: number,
  fee: number,
) {
  return (spend * reduction) / 100 - fee;
}

export function recommendPlan(requests: number) {
  if (!Number.isFinite(requests) || !Number.isInteger(requests) || requests < 0)
    return null;
  if (requests <= 50000) return plans[0];
  if (requests <= 500000) return plans[1];
  return plans[2];
}
