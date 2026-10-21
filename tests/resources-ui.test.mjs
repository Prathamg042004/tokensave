// Interaction tests in an isolated DOM. No web requests, provider keys or Sentry.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const load = createRequire(import.meta.url);
for (const extension of [".ts", ".tsx"])
  load.extensions[extension] = (loaded, file) =>
    loaded._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
      file,
    );
load.extensions[".css"] = () => {};
const React = await import("react");
const { render, screen, cleanup, fireEvent } =
  await import("@testing-library/react");
const { default: userEvent } = await import("@testing-library/user-event");
const Reference = load(
  "../app/docs/api-reference/reference-client.tsx",
).default;
const Calculator = load("../app/components/benefit-calculator.tsx").default;
const Selector = load("../app/components/plan-selector.tsx").default;
const CodeBlock = load("../app/components/code-block.tsx").default;
afterEach(() => cleanup());

test("endpoint search preserves sidebar destinations, including after a no-match search", async () => {
  render(React.createElement(Reference));
  const user = userEvent.setup();
  const search = screen.getByRole("searchbox", { name: "Find an endpoint" });
  await user.type(search, "unmatched-search");
  assert.ok(screen.getByText("No matching endpoints"));
  for (const id of [
    "proxy",
    "batch",
    "trim-context",
    "smart-context",
    "health",
    "discovery",
  ])
    assert.ok(document.getElementById(id));
  await user.click(screen.getByRole("button", { name: "Clear search" }));
  assert.equal(search.value, "");
  assert.ok(
    screen.getByText(
      "6 matching endpoints. All endpoint details remain available below.",
    ),
  );
});

test("example language buttons switch the code offered for copying", async () => {
  render(React.createElement(Reference));
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Python", exact: true }));
  assert.equal(
    screen
      .getByRole("button", { name: "Python", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  const pre = screen.getByLabelText("Python · requests example");
  assert.ok(pre.textContent.includes("timeout=30"));
  assert.ok(pre.textContent.includes('os.environ["OPENAI_API_KEY"]'));
});

test("pricing calculator updates plan costs and rejects an empty spend", async () => {
  render(React.createElement(Calculator));
  assert.equal(
    screen.getByRole("status").textContent.includes("$101.00"),
    true,
  );
  const user = userEvent.setup();
  await user.selectOptions(
    screen.getByLabelText("Plan for this scenario"),
    "499",
  );
  assert.ok(screen.getByText("-$299.00"));
  fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
  assert.ok(
    screen.getByText(
      "At 0% reduction, provider savings cannot cover the subscription.",
    ),
  );
  await user.clear(screen.getByLabelText("Monthly provider spend · USD"));
  assert.equal(
    screen
      .getByLabelText("Monthly provider spend · USD")
      .getAttribute("aria-invalid"),
    "true",
  );
  assert.ok(
    screen.getByText("Enter a provider spend between $0 and $100,000,000."),
  );
});

test("volume selector updates the quoted tier and handles invalid volume", async () => {
  render(React.createElement(Selector));
  const input = screen.getByLabelText("Expected monthly requests");
  fireEvent.change(input, { target: { value: "50001" } });
  assert.ok(screen.getByRole("heading", { name: "Growth discussion" }));
  assert.ok(
    screen
      .getByRole("link", { name: "Discuss Growth →" })
      .href.includes("Growth"),
  );
  fireEvent.change(input, { target: { value: "500001" } });
  assert.ok(screen.getByRole("heading", { name: "Enterprise discussion" }));
  fireEvent.change(input, { target: { value: "-1" } });
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.ok(
    screen.getByText("Enter a whole number between 0 and 1,000,000,000."),
  );
});

test("copy failure leaves code readable and supplies a manual recovery message", async () => {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async () => {
        throw new Error("Denied");
      },
    },
    configurable: true,
  });
  render(
    React.createElement(CodeBlock, { label: "Test", code: "example code" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy Test example" }));
  await screen.findByText("Copy unavailable — select code below");
  assert.equal(
    screen.getByLabelText("Test example").textContent,
    "example code",
  );
});
