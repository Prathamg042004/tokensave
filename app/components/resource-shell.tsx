import Link from "next/link";
import type { ReactNode } from "react";
import "./resources.css";

export function ResourceShell({
  children,
  section,
}: {
  children: ReactNode;
  section: string;
}) {
  return (
    <div className="resource-site">
      <a className="resource-skip" href="#resource-main">
        Skip to content
      </a>
      <header className="resource-header">
        <Link href="/" className="resource-brand">
          TokenSave<span>.</span>
        </Link>
        <nav aria-label="Resource navigation">
          {[
            ["/docs", "Docs"],
            ["/docs/api-reference", "API reference"],
            ["/pricing", "Pricing"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={section === label ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link className="resource-button" href="/playground">
            Playground ↗
          </Link>
        </nav>
      </header>
      <main id="resource-main">{children}</main>
      <footer className="resource-footer">
        <span>© 2026 TokenSave · Built in the open</span>
        <nav aria-label="Resource footer">
          <Link href="/security">Security & data handling</Link>
          <Link href="/status">Status</Link>
          <Link href="/changelog">Changelog</Link>
          <a href="mailto:support@tokensave.in">Support</a>
        </nav>
      </footer>
    </div>
  );
}
export function ResourceHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="resource-hero">
      <p className="resource-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="resource-lead">{children}</div>
    </div>
  );
}
export function Note({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="resource-note">
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="resource-section"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}
export function Fields({
  rows,
  headings = ["Field", "Type / requirement", "Behavior"],
}: {
  rows: readonly (readonly string[])[];
  headings?: readonly string[];
}) {
  return (
    <div
      className="resource-table"
      role="region"
      aria-label={headings.join(", ")}
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            {headings.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th scope="row" key={j}>
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
