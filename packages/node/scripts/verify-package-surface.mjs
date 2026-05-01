#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const tarballPath = process.argv[2];

if (!tarballPath) {
  console.error("Usage: node packages/node/scripts/verify-package-surface.mjs <package.tgz>");
  process.exit(2);
}

const expectedPhaseCTools = [
  "mikuproject_report_wbs_xlsx",
  "mikuproject_report_daily_svg",
  "mikuproject_report_weekly_svg",
  "mikuproject_report_monthly_calendar_svg",
  "mikuproject_report_all"
];

const expectedPrompts = [
  "mikuproject_create_project_draft",
  "mikuproject_revise_state_with_patch",
  "mikuproject_review_artifact_diagnostics"
];

const workspacePath = mkdtempSync(`${tmpdir()}/mikuproject-mcp-package-surface-`);
const extractRoot = mkdtempSync(resolve("node_modules/.mikuproject-mcp-package-surface-"));
mkdirSync(extractRoot, { recursive: true });

const extractResult = spawnSync("tar", ["-xzf", resolve(tarballPath), "-C", extractRoot], {
  encoding: "utf8"
});

if (extractResult.status !== 0) {
  console.error(extractResult.stderr);
  process.exit(extractResult.status ?? 1);
}

const serverEntryPoint = join(extractRoot, "package/dist/index.js");
const packageRoot = join(extractRoot, "package");
const runtimeConfigModule = await import(`file://${join(packageRoot, "dist/runtime/runtimeConfig.js")}`);
const runtimeConfig = runtimeConfigModule.resolveRuntimeConfig(packageRoot);

assert.match(
  runtimeConfig.javaJarPath || "",
  /runtime\/mikuproject-java\/mikuproject-\d+(?:\.\d+)*\.jar$/,
  "Expected package runtime discovery to select a versioned Java runtime artifact."
);
assert.match(
  runtimeConfig.nodeCliPath || "",
  /runtime\/mikuproject-node\/mikuproject-\d+(?:\.\d+)*\.mjs$/,
  "Expected package runtime discovery to select a versioned Node.js runtime artifact."
);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntryPoint],
  cwd: packageRoot,
  env: {
    ...getDefaultEnvironment(),
    MIKUPROJECT_MCP_WORKSPACE: workspacePath
  },
  stderr: "pipe"
});
const stderrChunks = [];

transport.stderr?.on("data", (chunk) => {
  stderrChunks.push(Buffer.from(chunk).toString("utf8"));
});

const client = new Client({
  name: "mikuproject-mcp-package-surface-test-client",
  version: "0.0.0"
});

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();

  for (const toolName of expectedPhaseCTools) {
    assert.ok(toolNames.includes(toolName), `Expected tools/list to include ${toolName}.`);
  }

  const prompts = await client.listPrompts();
  const promptNames = prompts.prompts.map((prompt) => prompt.name).sort();

  assert.deepEqual(promptNames, expectedPrompts.slice().sort());

  for (const promptName of promptNames) {
    assert.match(promptName, /^[a-z0-9_-]+$/);
  }
} catch (error) {
  const stderr = stderrChunks.join("").trim();
  if (stderr) {
    console.error(stderr);
  }
  throw error;
} finally {
  await client.close();
}
