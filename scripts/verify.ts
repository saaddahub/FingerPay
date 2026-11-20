// Every local gate check, in CI order. Stops at the first failure.  usage: npm run verify
import { execSync } from "node:child_process";

const GITLEAKS = "ghcr.io/gitleaks/gitleaks:v8.28.0";
const steps: [string, string][] = [
  ["typecheck", "npx tsc --noEmit"],
  ["lint", "npx eslint ."],
  ["unit tests", "npm run test:unit"],
  ["database tests", "npm run test:db"],
  ["build", "npx next build"],
  ["astryx doctor", "npx astryx doctor --built ."],
  // Production dependencies must be clean. Dev-only tooling findings are reported, not fatal.
  ["npm audit (production)", "npm audit --omit=dev --audit-level=high"],
  ["gitleaks", `docker run --rm -v "${process.cwd()}:/repo" ${GITLEAKS} dir /repo --config /repo/.gitleaks.toml --redact --no-banner`],
];

for (const [name, cmd] of steps) {
  console.log(`\n▶ ${name}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`\n✖ ${name} failed`);
    process.exit(1);
  }
}
try {
  execSync("npm audit --audit-level=high", { stdio: "ignore" });
} catch {
  console.log("\nnote: npm audit reports high findings in dev-only tooling (run `npm audit` for details)");
}
console.log("\n✔ verify passed");
