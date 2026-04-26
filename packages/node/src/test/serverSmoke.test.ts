import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMikuprojectServer } from "../server/createServer.js";

describe("MCP server smoke", () => {
  it("starts and exposes CLI-derived tool names", async () => {
    const fixture = await connectServer();

    try {
      const tools = await fixture.client.listTools();
      const toolNames = tools.tools.map((tool) => tool.name).sort();

      assert.deepEqual(toolNames, [
        "mikuproject.ai_detect_kind",
        "mikuproject.ai_export_phase_detail",
        "mikuproject.ai_export_project_overview",
        "mikuproject.ai_export_task_edit",
        "mikuproject.ai_spec",
        "mikuproject.ai_validate_patch",
        "mikuproject.state_from_draft"
      ]);
    } finally {
      await fixture.close();
    }
  });

  it("calls the read-only ai_spec tool through MCP", async () => {
    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject.ai_spec",
        arguments: {}
      });
      const content = assertTextToolContent(result.content);

      assert.equal(content.length, 1);

      const parsed = JSON.parse(content[0].text);
      assert.equal(parsed.operation, "mikuproject.ai_spec");
      assert.equal(Array.isArray(parsed.diagnostics), true);
    } finally {
      await fixture.close();
    }
  });

  it("reads the AI specification resource", async () => {
    const fixture = await connectServer();

    try {
      const result = await fixture.client.readResource({
        uri: "mikuproject://spec/ai-json"
      });

      assert.equal(result.contents.length, 1);
      assert.equal(result.contents[0].uri, "mikuproject://spec/ai-json");
      assert.equal("text" in result.contents[0], true);
    } finally {
      await fixture.close();
    }
  });

  it("calls state_from_draft and returns the generated state artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-state-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const draftPath = join(tempRoot, "draft.editjson");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state from-draft --in ' + args[3] + ' --out ' + args[5]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const draft = JSON.parse(readFileSync(args[3], 'utf8'));",
        "mkdirSync(dirname(args[5]), { recursive: true });",
        "writeFileSync(args[5], JSON.stringify({ kind: 'mikuproject_workbook_json', draft }, null, 2));"
      ].join("\n")
    );
    writeFileSync(draftPath, JSON.stringify({ kind: "project_draft_view", project: { name: "Smoke" } }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject.state_from_draft",
        arguments: {
          draftPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject.state_from_draft");
      assert.equal(parsed.artifacts[0].role, "workbook_state");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://state/current");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/state/current-workbook.json"));

      const state = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(state.kind, "mikuproject_workbook_json");
      assert.equal(state.draft.project.name, "Smoke");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls ai_export_project_overview and returns the generated projection artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-overview-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const workbookPath = join(tempRoot, "workbook.json");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'ai export project-overview --in ' + args[4] + ' --out ' + args[6]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[4], 'utf8'));",
        "mkdirSync(dirname(args[6]), { recursive: true });",
        "writeFileSync(args[6], JSON.stringify({ view_type: 'project_overview_view', project: workbook.project }, null, 2));"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Smoke" } }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject.ai_export_project_overview",
        arguments: {
          workbookPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject.ai_export_project_overview");
      assert.equal(parsed.artifacts[0].role, "projection");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://projection/project-overview");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/projection/project-overview.editjson"));

      const projection = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(projection.view_type, "project_overview_view");
      assert.equal(projection.project.name, "Smoke");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls ai_export_task_edit and returns the generated projection artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-task-edit-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const workbookPath = join(tempRoot, "workbook.json");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'ai export task-edit --in ' + args[4] + ' --task-uid ' + args[6] + ' --out ' + args[8]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[4], 'utf8'));",
        "mkdirSync(dirname(args[8]), { recursive: true });",
        "writeFileSync(args[8], JSON.stringify({ view_type: 'task_edit_view', target_task: { uid: args[6], name: workbook.taskName } }, null, 2));"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", taskName: "Smoke Task" }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject.ai_export_task_edit",
        arguments: {
          workbookPath,
          taskUid: "123"
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject.ai_export_task_edit");
      assert.equal(parsed.artifacts[0].role, "projection");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://projection/task-edit/123");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/projection/task-123.editjson"));

      const projection = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(projection.view_type, "task_edit_view");
      assert.equal(projection.target_task.uid, "123");
      assert.equal(projection.target_task.name, "Smoke Task");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls ai_export_phase_detail and returns the generated projection artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-phase-detail-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const workbookPath = join(tempRoot, "workbook.json");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'ai export phase-detail --in ' + args[4] + ' --phase-uid ' + args[6] + ' --mode ' + args[8] + ' --root-task-uid ' + args[10] + ' --max-depth ' + args[12] + ' --out ' + args[14]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[4], 'utf8'));",
        "mkdirSync(dirname(args[14]), { recursive: true });",
        "writeFileSync(args[14], JSON.stringify({ view_type: 'phase_detail_view', phase: { uid: args[6], name: workbook.phaseName }, scope: { mode: args[8], root_uid: args[10], max_depth: Number(args[12]) } }, null, 2));"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", phaseName: "Smoke Phase" }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject.ai_export_phase_detail",
        arguments: {
          workbookPath,
          phaseUid: "100",
          mode: "scoped",
          rootTaskUid: "123",
          maxDepth: 2
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject.ai_export_phase_detail");
      assert.equal(parsed.artifacts[0].role, "projection");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://projection/phase-detail/100");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/projection/phase-100.editjson"));

      const projection = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(projection.view_type, "phase_detail_view");
      assert.equal(projection.phase.uid, "100");
      assert.equal(projection.phase.name, "Smoke Phase");
      assert.equal(projection.scope.mode, "scoped");
      assert.equal(projection.scope.root_uid, "123");
      assert.equal(projection.scope.max_depth, 2);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls ai_validate_patch and returns validation stdout", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-validate-patch-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const statePath = join(tempRoot, "workbook.json");
    const patchPath = join(tempRoot, "patch.editjson");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    writeFileSync(
      runtimePath,
      [
        "import { readFileSync } from 'node:fs';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'ai validate-patch --state ' + args[3] + ' --in ' + args[5]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "JSON.parse(readFileSync(args[3], 'utf8'));",
        "JSON.parse(readFileSync(args[5], 'utf8'));",
        "console.log('validate-patch ok=true status=ok warnings=0 errors=0 changes=1');"
      ].join("\n")
    );
    writeFileSync(statePath, JSON.stringify({ kind: "mikuproject_workbook_json" }));
    writeFileSync(patchPath, JSON.stringify({ kind: "patch_json", operations: [] }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject.ai_validate_patch",
        arguments: {
          statePath,
          patchPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject.ai_validate_patch");
      assert.equal(parsed.input.statePath, statePath);
      assert.equal(parsed.input.patchPath, patchPath);
      assert.match(parsed.stdout, /validate-patch ok=true/);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });
});

async function connectServer(): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const server = createMikuprojectServer();
  const client = new Client({
    name: "mikuproject-mcp-test-client",
    version: "0.0.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
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

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
