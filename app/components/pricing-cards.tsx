import Link from "next/link";
import { plans, planContact } from "../lib/plans";
import "./resources.css";
export default function PricingCards() {
  return (
    <div className="resource-cards">
      {plans.map((plan) => (
        <article
          key={plan.name}
          className={`resource-card ${plan.name === "Growth" ? "resource-card-featured" : ""}`}
        >
          <span className="resource-badge">
            {plan.price === null
              ? "Custom scope"
              : "Listed plan · activation by agreement"}
          </span>
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
          <p className="resource-price">
            {plan.price === null ? "Custom" : `$${plan.price}`}{" "}
            {plan.price !== null ? <small>/ month</small> : null}
          </p>
          <p>{plan.volume}</p>
          {plan.price !== null && plan.capacity !== null ? (
            <p className="resource-unit">
              ${((plan.price / plan.capacity) * 1000).toFixed(3)} per 1,000
              requests at full stated volume. Subscription equivalent, not an
              overage rate.
            </p>
          ) : null}
          <a className="resource-button" href={planContact(plan.name)}>
            {plan.price === null
              ? "Discuss requirements"
              : `Enquire about ${plan.name}`}{" "}
            →
          </a>
          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <Link href="/pricing#commercial">Review commercial details</Link>
        </article>
      ))}
    </div>
  );
}
