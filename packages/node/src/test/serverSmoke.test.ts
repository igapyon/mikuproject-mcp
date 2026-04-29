import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMikuprojectServer } from "../server/createServer.js";
import { resolveWorkspaceConfig } from "../workspace/workspace.js";

describe("MCP server smoke", () => {
  it("starts and exposes CLI-derived tool names", async () => {
    const fixture = await connectServer();

    try {
      const tools = await fixture.client.listTools();
      const toolNames = tools.tools.map((tool) => tool.name).sort();

      for (const toolName of toolNames) {
        assert.match(toolName, /^[a-z0-9_-]+$/);
      }

      assert.deepEqual(toolNames, [
        "mikuproject_ai_detect_kind",
        "mikuproject_ai_export_bundle",
        "mikuproject_ai_export_phase_detail",
        "mikuproject_ai_export_project_overview",
        "mikuproject_ai_export_task_edit",
        "mikuproject_ai_spec",
        "mikuproject_ai_validate_patch",
        "mikuproject_export_workbook_json",
        "mikuproject_export_xlsx",
        "mikuproject_export_xml",
        "mikuproject_import_xlsx",
        "mikuproject_report_all",
        "mikuproject_report_daily_svg",
        "mikuproject_report_mermaid",
        "mikuproject_report_monthly_calendar_svg",
        "mikuproject_report_wbs_markdown",
        "mikuproject_report_wbs_xlsx",
        "mikuproject_report_weekly_svg",
        "mikuproject_state_apply_patch",
        "mikuproject_state_diff",
        "mikuproject_state_from_draft",
        "mikuproject_state_summarize",
        "mikuproject_version"
      ]);
    } finally {
      await fixture.close();
    }
  });

  it("uses the repository workspace as the default workspace root", () => {
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    delete process.env.MIKUPROJECT_MCP_WORKSPACE;

    try {
      const workspace = resolveWorkspaceConfig();

      assert.match(workspace.root, /mikuproject-mcp\/workplace$/);
    } finally {
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls the read-only ai_spec tool through MCP", async () => {
    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_ai_spec",
        arguments: {}
      });
      const content = assertTextToolContent(result.content);

      assert.equal(content.length, 1);

      const parsed = JSON.parse(content[0].text);
      assert.equal(parsed.operation, "mikuproject_ai_spec");
      assert.equal(Array.isArray(parsed.diagnostics), true);
    } finally {
      await fixture.close();
    }
  });

  it("calls the read-only version tool through MCP", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-version-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    writeFileSync(
      runtimePath,
      [
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== '--version') {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "console.log('mikuproject 9.9.9');"
      ].join("\n")
    );

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_version",
        arguments: {}
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_version");
      assert.match(parsed.stdout, /mikuproject 9\.9\.9/);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
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

  it("reads current and saved workbook state resources", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-state-resource-"));
    const workspacePath = join(tempRoot, "workspace");
    const stateDir = join(workspacePath, "mikuproject", "state");
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "current-workbook.json"),
      JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Current" } })
    );
    writeFileSync(
      join(stateDir, "baseline.json"),
      JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Baseline" } })
    );

    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const current = await fixture.client.readResource({
        uri: "mikuproject://state/current"
      });
      const currentContent = assertTextResourceContent(current.contents);
      const currentState = JSON.parse(currentContent[0].text);

      assert.equal(currentContent[0].uri, "mikuproject://state/current");
      assert.equal(currentState.kind, "mikuproject_workbook_json");
      assert.equal(currentState.project.name, "Current");

      const saved = await fixture.client.readResource({
        uri: "mikuproject://state/baseline"
      });
      const savedContent = assertTextResourceContent(saved.contents);
      const savedState = JSON.parse(savedContent[0].text);

      assert.equal(savedContent[0].uri, "mikuproject://state/baseline");
      assert.equal(savedState.kind, "mikuproject_workbook_json");
      assert.equal(savedState.project.name, "Baseline");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("reads operation summary and diagnostics resources", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-operation-resource-"));
    const workspacePath = join(tempRoot, "workspace");
    const summaryDir = join(workspacePath, "mikuproject", "summary");
    const diagnosticsDir = join(workspacePath, "mikuproject", "diagnostics");
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    mkdirSync(summaryDir, { recursive: true });
    mkdirSync(diagnosticsDir, { recursive: true });
    writeFileSync(
      join(summaryDir, "op-123.json"),
      JSON.stringify({ operationId: "op-123", operation: "mikuproject_state_diff", changeCount: 1 })
    );
    writeFileSync(
      join(diagnosticsDir, "op-123.json"),
      JSON.stringify({ operationId: "op-123", diagnostics: [{ level: "info", code: "ok", message: "done" }] })
    );

    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const summary = await fixture.client.readResource({
        uri: "mikuproject://summary/op-123"
      });
      const summaryContent = assertTextResourceContent(summary.contents);
      const summaryJson = JSON.parse(summaryContent[0].text);

      assert.equal(summaryContent[0].uri, "mikuproject://summary/op-123");
      assert.equal(summaryJson.operationId, "op-123");
      assert.equal(summaryJson.operation, "mikuproject_state_diff");
      assert.equal(summaryJson.changeCount, 1);

      const diagnostics = await fixture.client.readResource({
        uri: "mikuproject://diagnostics/op-123"
      });
      const diagnosticsContent = assertTextResourceContent(diagnostics.contents);
      const diagnosticsJson = JSON.parse(diagnosticsContent[0].text);

      assert.equal(diagnosticsContent[0].uri, "mikuproject://diagnostics/op-123");
      assert.equal(diagnosticsJson.operationId, "op-123");
      assert.equal(diagnosticsJson.diagnostics[0].code, "ok");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("lists and gets product-specific prompts", async () => {
    const fixture = await connectServer();

    try {
      const prompts = await fixture.client.listPrompts();
      const promptNames = prompts.prompts.map((prompt) => prompt.name).sort();

      for (const promptName of promptNames) {
        assert.match(promptName, /^[a-z0-9_-]+$/);
      }

      assert.deepEqual(promptNames, [
        "mikuproject_create_project_draft",
        "mikuproject_review_artifact_diagnostics",
        "mikuproject_revise_state_with_patch"
      ]);

      const prompt = await fixture.client.getPrompt({
        name: "mikuproject_revise_state_with_patch",
        arguments: {
          stateUri: "mikuproject://state/current",
          changeRequest: "Update task 123."
        }
      });

      assert.equal(prompt.messages.length, 1);
      assert.equal(prompt.messages[0].role, "user");
      assert.equal(prompt.messages[0].content.type, "text");
      assert.match(prompt.messages[0].content.text, /mikuproject patch workflow/);
      assert.match(prompt.messages[0].content.text, /mikuproject:\/\/spec\/ai-json/);
      assert.match(prompt.messages[0].content.text, /Update task 123\./);
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
        name: "mikuproject_state_from_draft",
        arguments: {
          draftPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_state_from_draft");
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
        name: "mikuproject_ai_export_project_overview",
        arguments: {
          workbookPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_ai_export_project_overview");
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

  it("calls ai_export_bundle and returns the generated projection artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-bundle-"));
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
        "if (args.join(' ') !== 'ai export bundle --in ' + args[4] + ' --out ' + args[6]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[4], 'utf8'));",
        "mkdirSync(dirname(args[6]), { recursive: true });",
        "writeFileSync(args[6], JSON.stringify({ view_type: 'ai_bundle_view', project: workbook.project }, null, 2));"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Smoke" } }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_ai_export_bundle",
        arguments: {
          workbookPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_ai_export_bundle");
      assert.equal(parsed.artifacts[0].role, "projection");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://projection/bundle");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/projection/bundle.editjson"));

      const projection = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(projection.view_type, "ai_bundle_view");
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
        name: "mikuproject_ai_export_task_edit",
        arguments: {
          workbookPath,
          taskUid: "123"
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_ai_export_task_edit");
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
        name: "mikuproject_ai_export_phase_detail",
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
      assert.equal(parsed.operation, "mikuproject_ai_export_phase_detail");
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
        name: "mikuproject_ai_validate_patch",
        arguments: {
          statePath,
          patchPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_ai_validate_patch");
      assert.equal(parsed.input.statePath, statePath);
      assert.equal(parsed.input.patchPath, patchPath);
      assert.match(parsed.stdout, /validate-patch ok=true/);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("calls state_apply_patch and returns the generated next state artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-apply-patch-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const statePath = join(tempRoot, "workbook.json");
    const patchPath = join(tempRoot, "patch.editjson");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state apply-patch --state ' + args[3] + ' --in ' + args[5] + ' --out ' + args[7]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const state = JSON.parse(readFileSync(args[3], 'utf8'));",
        "const patch = JSON.parse(readFileSync(args[5], 'utf8'));",
        "mkdirSync(dirname(args[7]), { recursive: true });",
        "writeFileSync(args[7], JSON.stringify({ kind: 'mikuproject_workbook_json', patched: true, state, patch }, null, 2));"
      ].join("\n")
    );
    writeFileSync(statePath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Smoke" } }));
    writeFileSync(patchPath, JSON.stringify({ kind: "patch_json", operations: [{ op: "test" }] }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_state_apply_patch",
        arguments: {
          statePath,
          patchPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_state_apply_patch");
      assert.equal(parsed.artifacts[0].role, "workbook_state");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://state/next");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/state/next-workbook.json"));

      const nextState = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(nextState.kind, "mikuproject_workbook_json");
      assert.equal(nextState.patched, true);
      assert.equal(nextState.state.project.name, "Smoke");
      assert.equal(nextState.patch.operations.length, 1);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls state_diff and returns diff stdout", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-state-diff-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const beforePath = join(tempRoot, "workbook-before.json");
    const afterPath = join(tempRoot, "workbook-after.json");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { readFileSync } from 'node:fs';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state diff --before ' + args[3] + ' --after ' + args[5]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const before = JSON.parse(readFileSync(args[3], 'utf8'));",
        "const after = JSON.parse(readFileSync(args[5], 'utf8'));",
        "console.log(JSON.stringify({ kind: 'mikuproject_state_diff', before: before.project.name, after: after.project.name, changes: 1 }));"
      ].join("\n")
    );
    writeFileSync(beforePath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Before" } }));
    writeFileSync(afterPath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "After" } }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_state_diff",
        arguments: {
          beforePath,
          afterPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_state_diff");
      assert.equal(typeof parsed.operationId, "string");
      assert.equal(parsed.input.beforePath, beforePath);
      assert.equal(parsed.input.afterPath, afterPath);
      assert.equal(parsed.artifacts[0].role, "operation_summary");
      assert.equal(parsed.artifacts[0].uri, `mikuproject://summary/${parsed.operationId}`);
      assert.equal(parsed.artifacts[1].role, "diagnostics_log");
      assert.equal(parsed.artifacts[1].uri, `mikuproject://diagnostics/${parsed.operationId}`);

      const diff = JSON.parse(parsed.stdout);
      assert.equal(diff.kind, "mikuproject_state_diff");
      assert.equal(diff.before, "Before");
      assert.equal(diff.after, "After");
      assert.equal(diff.changes, 1);

      const summary = await fixture.client.readResource({
        uri: `mikuproject://summary/${parsed.operationId}`
      });
      const summaryContent = assertTextResourceContent(summary.contents);
      const summaryJson = JSON.parse(summaryContent[0].text);

      assert.equal(summaryJson.operationId, parsed.operationId);
      assert.equal(summaryJson.operation, "mikuproject_state_diff");
      assert.equal(summaryJson.diagnosticsCount, parsed.diagnostics.length);

      const diagnostics = await fixture.client.readResource({
        uri: `mikuproject://diagnostics/${parsed.operationId}`
      });
      const diagnosticsContent = assertTextResourceContent(diagnostics.contents);
      const diagnosticsJson = JSON.parse(diagnosticsContent[0].text);

      assert.equal(diagnosticsJson.operationId, parsed.operationId);
      assert.equal(diagnosticsJson.operation, "mikuproject_state_diff");
      assert.equal(diagnosticsJson.diagnostics[0].code, "configured_node_runtime");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls state_summarize and returns summary stdout", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-state-summarize-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workbookPath = join(tempRoot, "workbook.json");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    writeFileSync(
      runtimePath,
      [
        "import { readFileSync } from 'node:fs';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state summarize --in ' + args[3]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[3], 'utf8'));",
        "console.log(JSON.stringify({ kind: 'mikuproject_state_summary', project: workbook.project.name, taskCount: workbook.tasks.length }));"
      ].join("\n")
    );
    writeFileSync(
      workbookPath,
      JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Smoke" }, tasks: [{ uid: "1" }] })
    );

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_state_summarize",
        arguments: {
          workbookPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_state_summarize");
      assert.equal(parsed.input.workbookPath, workbookPath);

      const summary = JSON.parse(parsed.stdout);
      assert.equal(summary.kind, "mikuproject_state_summary");
      assert.equal(summary.project, "Smoke");
      assert.equal(summary.taskCount, 1);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("calls export_workbook_json and returns the exported workbook artifact", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-export-workbook-json-"));
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
        "if (args.join(' ') !== 'export workbook-json --in ' + args[3] + ' --out ' + args[5]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[3], 'utf8'));",
        "mkdirSync(dirname(args[5]), { recursive: true });",
        "writeFileSync(args[5], JSON.stringify({ kind: 'mikuproject_workbook_json', exported: true, project: workbook.project }, null, 2));"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Smoke" } }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const result = await fixture.client.callTool({
        name: "mikuproject_export_workbook_json",
        arguments: {
          workbookPath
        }
      });
      const content = assertTextToolContent(result.content);
      const parsed = JSON.parse(content[0].text);

      assert.equal(parsed.ok, true);
      assert.equal(parsed.operation, "mikuproject_export_workbook_json");
      assert.equal(parsed.artifacts[0].role, "mikuproject_workbook_json");
      assert.equal(parsed.artifacts[0].uri, "mikuproject://export/workbook-json");
      assert.equal(parsed.artifacts[0].path, join(workspacePath, "mikuproject/export/workbook.json"));

      const exported = JSON.parse(readFileSync(parsed.artifacts[0].path, "utf8"));
      assert.equal(exported.kind, "mikuproject_workbook_json");
      assert.equal(exported.exported, true);
      assert.equal(exported.project.name, "Smoke");
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("does not return a fixed resource URI for a custom outputPath", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-custom-output-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const workbookPath = join(tempRoot, "workbook.json");
    const customOutputPath = join(tempRoot, "custom", "workbook.json");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'export workbook-json --in ' + args[3] + ' --out ' + args[5]) {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const workbook = JSON.parse(readFileSync(args[3], 'utf8'));",
        "mkdirSync(dirname(args[5]), { recursive: true });",
        "writeFileSync(args[5], JSON.stringify({ kind: 'mikuproject_workbook_json', custom: true, project: workbook.project }, null, 2));"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Custom" } }));

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const parsed = await callJsonTool(fixture.client, "mikuproject_export_workbook_json", {
        workbookPath,
        outputPath: customOutputPath
      });

      assert.equal(parsed.ok, true);
      assert.equal(parsed.artifacts[0].role, "mikuproject_workbook_json");
      assert.equal(parsed.artifacts[0].path, customOutputPath);
      assert.equal(parsed.artifacts[0].uri, undefined);
      assert.equal(JSON.parse(readFileSync(customOutputPath, "utf8")).custom, true);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
    }
  });

  it("calls file import/export and report tools", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-file-report-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const workspacePath = join(tempRoot, "workspace");
    const workbookPath = join(tempRoot, "workbook.json");
    const xlsxPath = join(tempRoot, "project.xlsx");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;
    const previousWorkspace = process.env.MIKUPROJECT_MCP_WORKSPACE;

    writeFileSync(
      runtimePath,
      [
        "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
        "import { dirname } from 'node:path';",
        "const args = process.argv.slice(2);",
        "const joined = args.join(' ');",
        "function write(path, text) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }",
        "if (joined === 'export xml --in ' + args[3] + ' --out ' + args[5]) {",
        "  const workbook = JSON.parse(readFileSync(args[3], 'utf8'));",
        "  write(args[5], '<Project><Name>' + workbook.project.name + '</Name></Project>');",
        "  process.exit(0);",
        "}",
        "if (joined === 'export xlsx --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], 'xlsx:' + JSON.parse(readFileSync(args[3], 'utf8')).project.name);",
        "  process.exit(0);",
        "}",
        "if (joined === 'import xlsx --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], JSON.stringify({ kind: 'mikuproject_workbook_json', imported: readFileSync(args[3], 'utf8') }, null, 2));",
        "  process.exit(0);",
        "}",
        "if (joined === 'report wbs-xlsx --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], 'wbs-xlsx:' + JSON.parse(readFileSync(args[3], 'utf8')).project.name);",
        "  process.exit(0);",
        "}",
        "if (joined === 'report daily-svg --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], '<svg><text>daily ' + JSON.parse(readFileSync(args[3], 'utf8')).project.name + '</text></svg>');",
        "  process.exit(0);",
        "}",
        "if (joined === 'report weekly-svg --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], '<svg><text>weekly ' + JSON.parse(readFileSync(args[3], 'utf8')).project.name + '</text></svg>');",
        "  process.exit(0);",
        "}",
        "if (joined === 'report monthly-calendar-svg --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], 'monthly-zip:' + JSON.parse(readFileSync(args[3], 'utf8')).project.name);",
        "  process.exit(0);",
        "}",
        "if (joined === 'report all --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], 'report-bundle:' + JSON.parse(readFileSync(args[3], 'utf8')).project.name);",
        "  process.exit(0);",
        "}",
        "if (joined === 'report wbs-markdown --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], '# WBS\\n\\n- ' + JSON.parse(readFileSync(args[3], 'utf8')).project.name);",
        "  process.exit(0);",
        "}",
        "if (joined === 'report mermaid --in ' + args[3] + ' --out ' + args[5]) {",
        "  write(args[5], 'graph TD; A[' + JSON.parse(readFileSync(args[3], 'utf8')).project.name + '];');",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + joined);",
        "process.exit(2);"
      ].join("\n")
    );
    writeFileSync(workbookPath, JSON.stringify({ kind: "mikuproject_workbook_json", project: { name: "Smoke" } }));
    writeFileSync(xlsxPath, "source xlsx");

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;
    process.env.MIKUPROJECT_MCP_WORKSPACE = workspacePath;

    const fixture = await connectServer();

    try {
      const exportXml = await callJsonTool(fixture.client, "mikuproject_export_xml", { workbookPath });
      assert.equal(exportXml.ok, true);
      assert.equal(exportXml.artifacts[0].role, "ms_project_xml");
      assert.equal(exportXml.artifacts[0].path, join(workspacePath, "mikuproject/export/project.xml"));
      assert.match(readFileSync(exportXml.artifacts[0].path, "utf8"), /<Name>Smoke<\/Name>/);

      const exportXlsx = await callJsonTool(fixture.client, "mikuproject_export_xlsx", { workbookPath });
      assert.equal(exportXlsx.ok, true);
      assert.equal(exportXlsx.artifacts[0].role, "xlsx_workbook");
      assert.equal(readFileSync(exportXlsx.artifacts[0].path, "utf8"), "xlsx:Smoke");

      const importXlsx = await callJsonTool(fixture.client, "mikuproject_import_xlsx", { inputPath: xlsxPath });
      assert.equal(importXlsx.ok, true);
      assert.equal(importXlsx.artifacts[0].role, "workbook_state");
      assert.equal(JSON.parse(readFileSync(importXlsx.artifacts[0].path, "utf8")).imported, "source xlsx");

      const wbsXlsx = await callJsonTool(fixture.client, "mikuproject_report_wbs_xlsx", { workbookPath });
      assert.equal(wbsXlsx.ok, true);
      assert.equal(wbsXlsx.artifacts[0].role, "report_output");
      assert.equal(wbsXlsx.artifacts[0].uri, "mikuproject://report/wbs-xlsx");
      assert.equal(readFileSync(wbsXlsx.artifacts[0].path, "utf8"), "wbs-xlsx:Smoke");

      const dailySvg = await callJsonTool(fixture.client, "mikuproject_report_daily_svg", { workbookPath });
      assert.equal(dailySvg.ok, true);
      assert.equal(dailySvg.artifacts[0].role, "report_output");
      assert.equal(dailySvg.artifacts[0].uri, "mikuproject://report/daily-svg");
      assert.match(readFileSync(dailySvg.artifacts[0].path, "utf8"), /<svg>/);

      const weeklySvg = await callJsonTool(fixture.client, "mikuproject_report_weekly_svg", { workbookPath });
      assert.equal(weeklySvg.ok, true);
      assert.equal(weeklySvg.artifacts[0].role, "report_output");
      assert.equal(weeklySvg.artifacts[0].uri, "mikuproject://report/weekly-svg");
      assert.match(readFileSync(weeklySvg.artifacts[0].path, "utf8"), /weekly Smoke/);

      const monthlySvg = await callJsonTool(fixture.client, "mikuproject_report_monthly_calendar_svg", { workbookPath });
      assert.equal(monthlySvg.ok, true);
      assert.equal(monthlySvg.artifacts[0].role, "report_output");
      assert.equal(monthlySvg.artifacts[0].uri, "mikuproject://report/monthly-calendar-svg");
      assert.equal(readFileSync(monthlySvg.artifacts[0].path, "utf8"), "monthly-zip:Smoke");

      const reportAll = await callJsonTool(fixture.client, "mikuproject_report_all", { workbookPath });
      assert.equal(reportAll.ok, true);
      assert.equal(reportAll.artifacts[0].role, "report_output");
      assert.equal(reportAll.artifacts[0].uri, "mikuproject://report/all");
      assert.equal(readFileSync(reportAll.artifacts[0].path, "utf8"), "report-bundle:Smoke");

      const wbs = await callJsonTool(fixture.client, "mikuproject_report_wbs_markdown", { workbookPath });
      assert.equal(wbs.ok, true);
      assert.equal(wbs.artifacts[0].role, "report_output");
      assert.match(readFileSync(wbs.artifacts[0].path, "utf8"), /# WBS/);

      const mermaid = await callJsonTool(fixture.client, "mikuproject_report_mermaid", { workbookPath });
      assert.equal(mermaid.ok, true);
      assert.equal(mermaid.artifacts[0].role, "report_output");
      assert.match(readFileSync(mermaid.artifacts[0].path, "utf8"), /graph TD/);
    } finally {
      await fixture.close();
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
      restoreEnv("MIKUPROJECT_MCP_WORKSPACE", previousWorkspace);
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

async function callJsonTool(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({
    name,
    arguments: args
  });
  const content = assertTextToolContent(result.content);

  return JSON.parse(content[0].text);
}

function assertTextResourceContent(content: unknown): Array<{ uri: string; text: string }> {
  if (!Array.isArray(content)) {
    assert.fail("Expected resource content to be an array.");
  }

  assert.equal(content.length, 1);

  const first = content[0] as { uri?: unknown; text?: unknown };
  assert.equal(typeof first.uri, "string");
  assert.equal(typeof first.text, "string");

  return content as Array<{ uri: string; text: string }>;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
