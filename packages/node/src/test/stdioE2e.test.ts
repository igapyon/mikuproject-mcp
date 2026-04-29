import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("stdio MCP server E2E", () => {
  it("starts the built server process and exercises MCP primitives over stdio", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../index.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-stdio-e2e-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const inputPath = join(tempRoot, "input.txt");
    const workspacePath = join(tempRoot, "workspace");

    writeFileSync(
      runtimePath,
      [
        "const args = process.argv.slice(2);",
        "if (args.join(' ') === 'ai detect-kind --in ' + args[3]) {",
        "  console.log(JSON.stringify({ kind: 'text', path: args[3] }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(2);"
      ].join("\n")
    );
    writeFileSync(inputPath, "project draft");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntryPoint],
      cwd: repositoryRoot,
      env: {
        ...getDefaultEnvironment(),
        MIKUPROJECT_MCP_RUNTIME_NODE: runtimePath,
        MIKUPROJECT_MCP_WORKSPACE: workspacePath
      },
      stderr: "pipe"
    });
    const client = new Client({
      name: "mikuproject-mcp-stdio-e2e-test-client",
      version: "0.0.0"
    });

    try {
      await client.connect(transport);

      const tools = await client.listTools();
      assert.ok(tools.tools.some((tool) => tool.name === "mikuproject_ai_detect_kind"));

      const resource = await client.readResource({ uri: "mikuproject://spec/ai-json" });
      assert.equal(resource.contents.length, 1);

      const prompts = await client.listPrompts();
      assert.ok(prompts.prompts.some((prompt) => prompt.name === "mikuproject_create_project_draft"));

      const result = await client.callTool({
        name: "mikuproject_ai_detect_kind",
        arguments: {
          path: inputPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_ai_detect_kind");
      assert.match(parsed.stdout, /"kind":"text"/);
    } finally {
      await client.close();
    }
  });
});

function assertTextToolContent(content: unknown): Array<{ type: "text"; text: string }> {
  if (!Array.isArray(content)) {
    assert.fail("Expected tool content to be an array.");
  }

  assert.equal(content.length, 1);

  const first = content[0] as { type?: unknown; text?: unknown };
  assert.equal(first.type, "text");
  assert.equal(typeof first.text, "string");

  return content as Array<{ type: "text"; text: string }>;
}
