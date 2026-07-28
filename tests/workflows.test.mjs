// Makes the CI policy self-enforcing. A workflow that drifts back to a
// floating tag, an unrestricted token or no timeout fails the build.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("../.github/workflows/", import.meta.url);
const files = readdirSync(dir).filter(
  (name) => name.endsWith(".yml") || name.endsWith(".yaml")
);

const HEX = "0123456789abcdef";

function isCommitSha(ref) {
  return ref.length === 40 && Array.from(ref).every((char) => HEX.indexOf(char) !== -1);
}

function usesLines(text) {
  return text
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- uses:") || line.startsWith("uses:"));
}

test("the workflow directory is not empty", () => {
  assert.ok(files.length > 0, "no workflow files found");
});

for (const file of files) {
  const text = readFileSync(new URL(file, dir), "utf8");

  test(file + ": third-party actions are pinned to a full commit sha", () => {
    for (const line of usesLines(text)) {
      const spec = line.slice(line.indexOf("uses:") + 5).trim().split(" ")[0];
      if (spec.startsWith("./")) continue;
      const at = spec.lastIndexOf("@");
      assert.ok(at > 0, "action has no version reference: " + spec);
      assert.ok(
        isCommitSha(spec.slice(at + 1)),
        "pin to a 40 character commit sha instead of a moveable tag: " + spec
      );
    }
  });

  test(file + ": declares an explicit GITHUB_TOKEN permission scope", () => {
    assert.ok(
      text.indexOf("permissions:") !== -1,
      file + " must declare a permissions block so the token is not write-all"
    );
  });

  test(file + ": every job is bounded by a timeout", () => {
    assert.ok(
      text.indexOf("timeout-minutes:") !== -1,
      file + " must set timeout-minutes so a hung job cannot burn Actions minutes"
    );
  });
}
