import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

describe("Streamable HTTP MCP server E2E", () => {
  it("starts the built HTTP server and exercises MCP primitives", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../http.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-e2e-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const inputPath = join(tempRoot, "input.txt");
    const workspacePath = join(tempRoot, "workspace");

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') === 'ai detect-kind --in ' + args[3]) {",
        "  console.log(JSON.stringify({ kind: 'text', path: args[3] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'state' && args[1] === 'from-draft') {",
        "  const draft = readFileSync(args[3], 'utf8');",
        "  mkdirSync(dirname(args[5]), { recursive: true });",
        "  writeFileSync(args[5], JSON.stringify({ kind: 'mikuproject_workbook_json', draft }, null, 2));",
        "  console.log(JSON.stringify({ outputPath: args[5] }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(2);"
      ].join("\n")
    );
    writeFileSync(inputPath, "project draft");

    const child = spawn(process.execPath, [serverEntryPoint], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        MIKUPROJECT_MCP_HTTP_HOST: "127.0.0.1",
        MIKUPROJECT_MCP_HTTP_PORT: "0",
        MIKUPROJECT_MCP_RUNTIME_NODE: runtimePath,
        MIKUPROJECT_MCP_WORKSPACE: workspacePath
      }
    });

    try {
      const endpoint = await waitForHttpEndpoint(child);
      const client = new Client({
        name: "mikuproject-mcp-http-e2e-test-client",
        version: "0.0.0"
      });
      const transport = new StreamableHTTPClientTransport(new URL(endpoint));

      try {
        await client.connect(transport);
        assert.equal(transport.sessionId, undefined);

        const tools = await client.listTools();
        assert.ok(tools.tools.some((tool) => tool.name === "mikuproject_ai_detect_kind"));

        const resources = await client.listResources();
        assert.ok(resources.resources.some((resource) => resource.uri === "mikuproject://spec/ai-json"));

        const resource = await client.readResource({ uri: "mikuproject://spec/ai-json" });
        assert.equal(resource.contents.length, 1);

        const prompts = await client.listPrompts();
        assert.ok(prompts.prompts.some((prompt) => prompt.name === "mikuproject_create_project_draft"));

        const prompt = await client.getPrompt({
          name: "mikuproject_create_project_draft",
          arguments: {
            requirements: "Create a small test project."
          }
        });
        assert.ok(prompt.messages.length > 0);

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

        const stateResult = await client.callTool({
          name: "mikuproject_state_from_draft",
          arguments: {
            draftPath: inputPath
          }
        });
        const stateContent = assertTextToolContent(stateResult.content);
        const stateParsed = JSON.parse(stateContent[0].text);
        const httpWorkspaceRoot = stateParsed.workspace.root;
        const outputPath = stateParsed.artifacts[0].path;

        assert.equal(stateParsed.ok, true);
        assert.match(httpWorkspaceRoot, /mikuproject-mcp-http-/);
        await waitForPathRemoved(outputPath);
        await waitForPathRemoved(httpWorkspaceRoot);
      } finally {
        await client.close();
      }
    } finally {
      child.kill("SIGTERM");
    }
  });

  it("rejects invalid Origin headers", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../http.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-origin-e2e-"));
    const child = spawn(process.execPath, [serverEntryPoint], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        MIKUPROJECT_MCP_HTTP_HOST: "127.0.0.1",
        MIKUPROJECT_MCP_HTTP_PORT: "0",
        MIKUPROJECT_MCP_WORKSPACE: join(tempRoot, "workspace")
      }
    });

    try {
      const endpoint = await waitForHttpEndpoint(child);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "origin": "https://example.invalid"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: {
              name: "invalid-origin-test-client",
              version: "0.0.0"
            }
          }
        })
      });

      assert.equal(response.status, 403);
      const body = await response.json();
      assert.equal(body.error.message, "Forbidden: invalid Origin header");
    } finally {
      child.kill("SIGTERM");
    }
  });

  it("rejects oversized HTTP request bodies", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../http.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-size-e2e-"));
    const child = spawn(process.execPath, [serverEntryPoint], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        MIKUPROJECT_MCP_HTTP_HOST: "127.0.0.1",
        MIKUPROJECT_MCP_HTTP_PORT: "0",
        MIKUPROJECT_MCP_HTTP_MAX_BODY_BYTES: "16",
        MIKUPROJECT_MCP_WORKSPACE: join(tempRoot, "workspace")
      }
    });

    try {
      const endpoint = await waitForHttpEndpoint(child);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: {
              name: "oversized-body-test-client",
              version: "0.0.0"
            }
          }
        })
      });

      assert.equal(response.status, 413);
      const body = await response.json();
      assert.equal(body.error.message, "Request body exceeds configured limit");
    } finally {
      child.kill("SIGTERM");
    }
  });
});

function waitForHttpEndpoint(child: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for HTTP server startup. stderr: ${stderr}`));
    }, 10_000);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      const match = stderr.match(/listening on (http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`HTTP server exited before startup. code=${code ?? ""} signal=${signal ?? ""}`));
    });
  });
}

async function waitForPathRemoved(path: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (!existsSync(path)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  assert.fail(`Expected path to be removed: ${path}`);
}

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
