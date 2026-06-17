#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const fixturePort = 4173;
const fixtureBaseUrl = `http://127.0.0.1:${fixturePort.toString()}`;
let fixtureProcess;
let tempRoot;

try {
  tempRoot = await mkdtemp(join(tmpdir(), "ui-pop-smoke-"));
  console.log(`smoke_temp=${tempRoot}`);

  await run("npm", ["run", "build"]);

  const baseSpec = join(tempRoot, "base-spec");
  await run("node", [
    "dist/cli.js",
    "analyze-source",
    "tests/fixtures/next-app/app/orders/page.tsx",
    "--out",
    baseSpec,
    "--force",
  ]);
  await run("node", ["dist/cli.js", "draft", baseSpec, "--force"]);
  await run("node", ["dist/cli.js", "render-wireframe", baseSpec, "--force"]);
  await printArtifactList(baseSpec);

  const ordersSpec = join(tempRoot, "orders-spec");
  const missingSpec = join(tempRoot, "missing-spec");
  const mismatchSpec = join(tempRoot, "mismatch-spec");
  await cp(baseSpec, ordersSpec, { recursive: true });
  await cp(baseSpec, missingSpec, { recursive: true });
  await cp(baseSpec, mismatchSpec, { recursive: true });

  fixtureProcess = startFixtureRuntime();
  await waitForRoute("/orders");

  await run("node", [
    "dist/cli.js",
    "validate-runtime",
    ordersSpec,
    "--url",
    `${fixtureBaseUrl}/orders`,
  ]);
  await run(
    "node",
    ["dist/cli.js", "validate-runtime", missingSpec, "--url", `${fixtureBaseUrl}/missing-label`],
    3,
  );
  await run(
    "node",
    ["dist/cli.js", "validate-runtime", mismatchSpec, "--url", `${fixtureBaseUrl}/mismatch`],
    3,
  );

  await printRuntimeSummary("orders", ordersSpec);
  await printRuntimeSummary("missing-label", missingSpec);
  await printRuntimeSummary("mismatch", mismatchSpec);
  console.log("smoke_status=pass");
} finally {
  await cleanup();
}

function run(command, args, expectedExit = 0) {
  console.log(`$ ${[command, ...args].join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      console.log(`exit=${String(code)}`);
      if (code === expectedExit) {
        resolve();
      } else {
        reject(new Error(`${command} exited ${String(code)}; expected ${expectedExit.toString()}`));
      }
    });
  });
}

function startFixtureRuntime() {
  console.log("$ npm run fixture:runtime -- --port 4173");
  const child = spawn("npm", ["run", "fixture:runtime", "--", "--port", "4173"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`fixture_runtime_exit=${code.toString()}`);
    }
  });
  return child;
}

async function waitForRoute(route) {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    try {
      const response = await fetch(`${fixtureBaseUrl}${route}`);
      if (response.ok) {
        console.log(`fixture_ready_attempt=${attempt.toString()}`);
        return;
      }
    } catch {
      await sleep(100);
    }
  }
  throw new Error(`fixture runtime did not become ready at ${fixtureBaseUrl}${route}`);
}

async function printArtifactList(specDir) {
  const files = await readdir(specDir);
  console.log(`artifacts=${files.sort().join(",")}`);
}

async function printRuntimeSummary(name, specDir) {
  const evidence = JSON.parse(await readFile(join(specDir, "runtime-evidence.json"), "utf8"));
  console.log(`${name}_summary=${JSON.stringify(evidence.summary)}`);
}

async function cleanup() {
  if (fixtureProcess !== undefined && !fixtureProcess.killed) {
    fixtureProcess.kill();
    await sleep(100);
  }

  if (tempRoot !== undefined) {
    await rm(tempRoot, { force: true, recursive: true });
    console.log("tmp_removed=yes");
  }
}
