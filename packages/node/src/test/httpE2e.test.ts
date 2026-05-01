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
    const workspacePath = join(tempRoot, "workspace");

    writeFileSync(
      runtimePath,
      [
        "let stdin = '';",
        "process.stdin.setEncoding('utf8');",
        "for await (const chunk of process.stdin) stdin += chunk;",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') === 'ai detect-kind --in -') {",
        "  console.log(JSON.stringify({ kind: 'text', content: stdin }));",
        "  process.exit(0);",
        "}",
        "if (args.join(' ') === 'state from-draft --in - --out -') {",
        "  process.stdout.write(JSON.stringify({ kind: 'mikuproject_workbook_json', draft: stdin }, null, 2));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(2);"
      ].join("\n")
    );

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
            content: "project draft"
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
            draftContent: "project draft",
            outputMode: "content"
          }
        });
        const stateContent = assertTextToolContent(stateResult.content);
        const stateParsed = JSON.parse(stateContent[0].text);
        const httpWorkspaceRoot = stateParsed.workspace.root;

        assert.equal(stateParsed.ok, true);
        assert.match(httpWorkspaceRoot, /mikuproject-mcp-http-/);
        assert.equal(stateParsed.artifacts[0].role, "workbook_state");
        assert.equal(JSON.parse(stateParsed.artifacts[0].text).draft, "project draft");
        await waitForPathRemoved(httpWorkspaceRoot);
      } finally {
        await client.close();
      }
    } finally {
      child.kill("SIGTERM");
    }
  });

  it("handles content-mode tool calls without request-scoped workspace artifacts", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../http.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-content-e2e-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");

    writeFileSync(
      runtimePath,
      [
        "import { readFileSync } from 'node:fs';",
        "let stdin = '';",
        "process.stdin.setEncoding('utf8');",
        "for await (const chunk of process.stdin) stdin += chunk;",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state apply-patch --state ' + args[3] + ' --in - --out -') {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const state = JSON.parse(readFileSync(args[3], 'utf8'));",
        "const patch = JSON.parse(stdin);",
        "process.stdout.write(JSON.stringify({ kind: 'mikuproject_workbook_json', state, patch }, null, 2));"
      ].join("\n")
    );

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
        name: "mikuproject-mcp-http-content-test-client",
        version: "0.0.0"
      });
      const transport = new StreamableHTTPClientTransport(new URL(endpoint));

      try {
        await client.connect(transport);

        const result = await client.callTool({
          name: "mikuproject_state_apply_patch",
          arguments: {
            stateContent: JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "HTTP" } }),
            patchContent: JSON.stringify({ kind: "patch_json", operations: [{ op: "test" }] }),
            outputMode: "content"
          }
        });
        const content = assertTextToolContent(result.content);
        const parsed = JSON.parse(content[0].text);

        assert.equal(parsed.ok, true);
        assert.match(parsed.workspace.root, /mikuproject-mcp-http-/);
        assert.equal(parsed.artifacts[0].role, "workbook_state");
        assert.equal(parsed.artifacts[0].mimeType, "application/json");
        assert.equal("path" in parsed.artifacts[0], false);
        assert.equal(JSON.parse(parsed.artifacts[0].text).patch.operations.length, 1);

        const summary = parsed.artifacts.find((artifact: { role?: string }) => artifact.role === "operation_summary");
        const diagnostics = parsed.artifacts.find((artifact: { role?: string }) => artifact.role === "diagnostics_log");
        assert.equal(typeof summary.text, "string");
        assert.equal(summary.mimeType, "application/json");
        assert.equal("path" in summary, false);
        assert.equal(typeof diagnostics.text, "string");
        assert.equal(diagnostics.mimeType, "application/json");
        assert.equal("path" in diagnostics, false);
        assert.equal(existsSync(join(workspacePath, "mikuproject/state/next-workbook.json")), false);
        assert.equal(existsSync(join(workspacePath, "mikuproject/summary")), false);
        assert.equal(existsSync(join(workspacePath, "mikuproject/diagnostics")), false);
        await waitForPathRemoved(parsed.workspace.root);
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
          "content-type": "application/json",
          "accept": "application/json, text/event-stream"
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

  it("rejects host path arguments over HTTP", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../http.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-path-policy-e2e-"));
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
          "accept": "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "mikuproject_ai_detect_kind",
            arguments: {
              path: "/etc/passwd"
            }
          }
        })
      });

      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.error.message, "HTTP tools/call does not accept host path argument: path");
    } finally {
      child.kill("SIGTERM");
    }
  });

  it("rejects oversized HTTP response bodies", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = resolve(currentDir, "../../../..");
    const serverEntryPoint = resolve(currentDir, "../http.js");
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-response-size-e2e-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");

    writeFileSync(
      runtimePath,
      [
        "import { readFileSync } from 'node:fs';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state apply-patch --state ' + args[3] + ' --in - --out -') {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "readFileSync(args[3], 'utf8');",
        "process.stdout.write(JSON.stringify({ kind: 'mikuproject_workbook_json', payload: 'x'.repeat(4096) }));"
      ].join("\n")
    );

    const child = spawn(process.execPath, [serverEntryPoint], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        MIKUPROJECT_MCP_HTTP_HOST: "127.0.0.1",
        MIKUPROJECT_MCP_HTTP_PORT: "0",
        MIKUPROJECT_MCP_HTTP_MAX_RESPONSE_BYTES: "2048",
        MIKUPROJECT_MCP_RUNTIME_NODE: runtimePath,
        MIKUPROJECT_MCP_WORKSPACE: join(tempRoot, "workspace")
      }
    });

    try {
      const endpoint = await waitForHttpEndpoint(child);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "mikuproject_state_apply_patch",
            arguments: {
              stateContent: JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "HTTP" } }),
              patchContent: JSON.stringify({ kind: "patch_json", operations: [] }),
              outputMode: "content"
            }
          }
        })
      });

      assert.equal(response.status, 413);
      const body = await response.json();
      assert.equal(body.error.message, "Response body exceeds configured limit");
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
