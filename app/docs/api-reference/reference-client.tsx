"use client";
import { useState } from "react";
import CodeBlock from "../../components/code-block";
import { Fields } from "../../components/resource-shell";
import {
  endpoints,
  javascriptExample,
  pythonExample,
  curlExample,
} from "../../lib/api-docs";
const languages = [
  {
    name: "JavaScript",
    label: "Node.js 20+ · server",
    code: javascriptExample,
  },
  { name: "Python", label: "Python · requests", code: pythonExample },
  { name: "cURL", label: "cURL · jq", code: curlExample },
];
export default function ReferenceClient() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState(0);
  const normalized = query.trim().toLowerCase();
  const matches = endpoints.filter((e) =>
    `${e.method} ${e.path} ${e.title} ${e.description}`
      .toLowerCase()
      .includes(normalized),
  );
  return (
    <>
      <section
        className="resource-section"
        id="examples"
        aria-labelledby="examples-title"
      >
        <h2 id="examples-title">A complete first request</h2>
        <p>
          Examples run on your server and use an environment variable. They
          perform a real provider request when executed and can incur charges.
        </p>
        <div
          className="resource-controls"
          role="group"
          aria-label="Example language"
        >
          {languages.map((l, i) => (
            <button
              type="button"
              key={l.name}
              aria-pressed={language === i}
              onClick={() => setLanguage(i)}
            >
              {l.name}
            </button>
          ))}
        </div>
        <CodeBlock
          key={language}
          code={languages[language].code}
          label={languages[language].label}
        />
      </section>
      <section
        className="resource-endpoint-search"
        aria-label="Find an endpoint"
      >
        <label className="resource-search">
          Find an endpoint
          <input
            type="search"
            placeholder="Search by path or purpose…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-controls="endpoint-results"
          />
        </label>
        <p role="status">
          {matches.length} matching endpoints. All endpoint details remain
          available below.
        </p>
        <div id="endpoint-results" className="resource-controls">
          {matches.map((e) => (
            <a
              className="resource-button resource-button-secondary"
              key={e.id}
              href={`#${e.id}`}
            >
              {e.method} {e.path}
            </a>
          ))}
        </div>
        {normalized && matches.length === 0 ? (
          <div className="resource-note">
            <strong>No matching endpoints</strong>
            <button
              type="button"
              className="resource-button resource-button-secondary"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </div>
        ) : null}
      </section>
      {endpoints.map((e) => (
        <article key={e.id} id={e.id} className="resource-endpoint">
          <h3>
            <span>{e.method}</span>
            <code>{e.path}</code>
          </h3>
          <strong>{e.title}</strong>
          <p>{e.description}</p>
          {e.fields.length > 0 ? (
            <Fields rows={e.fields} />
          ) : (
            <p>No request body.</p>
          )}
          {e.request ? (
            <CodeBlock label={`${e.path} request body`} code={e.request} />
          ) : null}
          <h4>Response · HTTP 200</h4>
          <CodeBlock
            label={`${e.path} response · illustrative JSON`}
            code={e.response}
          />
          {e.responses?.map((example) => (
            <div key={example.name}>
              <h4>
                {example.name} · HTTP {example.status}
              </h4>
              <CodeBlock
                label={`${e.path} ${example.name} · illustrative JSON`}
                code={JSON.stringify(example.body, null, 2)}
              />
            </div>
          ))}
          {e.caveat ? (
            <aside className="resource-note">
              <strong>Implementation note</strong>
              {e.caveat}
            </aside>
          ) : null}
          <a href="#examples">Back to examples ↑</a>
        </article>
      ))}
    </>
  );
}
