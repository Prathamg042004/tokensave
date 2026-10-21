"use client";
import { useState } from "react";
export default function CodeBlock({
  code,
  label = "JSON",
}: {
  code: string;
  label?: string;
}) {
  const [status, setStatus] = useState("Copy code");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied");
    } catch {
      setStatus("Copy unavailable — select code below");
    }
  }
  return (
    <div className="resource-code">
      <div>
        <span>{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label} example`}
        >
          {status}
        </button>
        <span className="resource-sr" role="status">
          {status === "Copied" ? "Code copied to clipboard" : ""}
        </span>
      </div>
      <pre tabIndex={0} aria-label={`${label} example`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
