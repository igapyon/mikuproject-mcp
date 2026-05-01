import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { resolveRuntimeConfig } from "../runtime/runtimeConfig.js";
import { buildRuntimeArgs, buildRuntimeInvocation, runRuntimeOperation, selectRuntimeCommand } from "../runtime/runtimeOperation.js";

describe("runtime operation mapping", () => {
  it("builds fixed CLI args for initial core operations", () => {
    assert.deepEqual(buildRuntimeArgs({ name: "version" }), ["--version"]);
    assert.deepEqual(buildRuntimeArgs({ name: "ai_spec" }), ["ai", "spec"]);
    assert.deepEqual(buildRuntimeArgs({ name: "ai_detect_kind", inputPath: "document.json" }), [
      "ai",
      "detect-kind",
      "--in",
      "document.json"
    ]);
    assert.deepEqual(
      buildRuntimeArgs({
        name: "state_from_draft",
        draftPath: "draft.editjson",
        outputPath: "workbook.json"
      }),
      ["state", "from-draft", "--in", "draft.editjson", "--out", "workbook.json"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "ai_export_project_overview",
        workbookPath: "workbook.json",
        outputPath: "overview.editjson"
      }),
      ["ai", "export", "project-overview", "--in", "workbook.json", "--out", "overview.editjson"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "ai_export_bundle",
        workbookPath: "workbook.json",
        outputPath: "bundle.editjson"
      }),
      ["ai", "export", "bundle", "--in", "workbook.json", "--out", "bundle.editjson"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "ai_export_task_edit",
        workbookPath: "workbook.json",
        taskUid: "123",
        outputPath: "task.editjson"
      }),
      ["ai", "export", "task-edit", "--in", "workbook.json", "--task-uid", "123", "--out", "task.editjson"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "ai_export_phase_detail",
        workbookPath: "workbook.json",
        phaseUid: "100",
        mode: "full",
        rootTaskUid: "123",
        maxDepth: 2,
        outputPath: "phase.editjson"
      }),
      [
        "ai",
        "export",
        "phase-detail",
        "--in",
        "workbook.json",
        "--phase-uid",
        "100",
        "--mode",
        "full",
        "--root-task-uid",
        "123",
        "--max-depth",
        "2",
        "--out",
        "phase.editjson"
      ]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "ai_validate_patch",
        statePath: "workbook.json",
        patchPath: "patch.editjson"
      }),
      ["ai", "validate-patch", "--state", "workbook.json", "--in", "patch.editjson"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "state_apply_patch",
        statePath: "workbook.json",
        patchPath: "patch.editjson",
        outputPath: "next-workbook.json"
      }),
      ["state", "apply-patch", "--state", "workbook.json", "--in", "patch.editjson", "--out", "next-workbook.json"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "state_diff",
        beforePath: "workbook-before.json",
        afterPath: "workbook-after.json"
      }),
      ["state", "diff", "--before", "workbook-before.json", "--after", "workbook-after.json"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "state_summarize",
        workbookPath: "workbook.json"
      }),
      ["state", "summarize", "--in", "workbook.json"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "export_workbook_json",
        workbookPath: "workbook.json",
        outputPath: "workbook-export.json"
      }),
      ["export", "workbook-json", "--in", "workbook.json", "--out", "workbook-export.json"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "export_xml",
        workbookPath: "workbook.json",
        outputPath: "project.xml"
      }),
      ["export", "xml", "--in", "workbook.json", "--out", "project.xml"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "export_xlsx",
        workbookPath: "workbook.json",
        outputPath: "project.xlsx"
      }),
      ["export", "xlsx", "--in", "workbook.json", "--out", "project.xlsx"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "import_xlsx",
        inputPath: "project.xlsx",
        outputPath: "workbook.json"
      }),
      ["import", "xlsx", "--in", "project.xlsx", "--out", "workbook.json"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_wbs_xlsx",
        workbookPath: "workbook.json",
        outputPath: "wbs.xlsx"
      }),
      ["report", "wbs-xlsx", "--in", "workbook.json", "--out", "wbs.xlsx"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_daily_svg",
        workbookPath: "workbook.json",
        outputPath: "daily.svg"
      }),
      ["report", "daily-svg", "--in", "workbook.json", "--out", "daily.svg"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_weekly_svg",
        workbookPath: "workbook.json",
        outputPath: "weekly.svg"
      }),
      ["report", "weekly-svg", "--in", "workbook.json", "--out", "weekly.svg"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_monthly_calendar_svg",
        workbookPath: "workbook.json",
        outputPath: "monthly-calendar-svg.zip"
      }),
      ["report", "monthly-calendar-svg", "--in", "workbook.json", "--out", "monthly-calendar-svg.zip"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_all",
        workbookPath: "workbook.json",
        outputPath: "report-bundle.zip"
      }),
      ["report", "all", "--in", "workbook.json", "--out", "report-bundle.zip"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_wbs_markdown",
        workbookPath: "workbook.json",
        outputPath: "wbs.md"
      }),
      ["report", "wbs-markdown", "--in", "workbook.json", "--out", "wbs.md"]
    );
    assert.deepEqual(
      buildRuntimeArgs({
        name: "report_mermaid",
        workbookPath: "workbook.json",
        outputPath: "project.mmd"
      }),
      ["report", "mermaid", "--in", "workbook.json", "--out", "project.mmd"]
    );
  });

  it("prefers configured Java runtime over configured Node.js runtime", () => {
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    process.env.MIKUPROJECT_MCP_RUNTIME_JAVA = "/runtime/mikuproject.jar";
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = "/runtime/mikuproject.mjs";

    try {
      const command = selectRuntimeCommand({ name: "ai_spec" });
      assert.equal(command?.kind, "java");
      assert.equal(command?.command, "java");
      assert.deepEqual(command?.args, [
        "-Djava.net.preferIPv4Stack=true",
        "-Djava.net.preferIPv6Addresses=false",
        "-jar",
        "/runtime/mikuproject.jar",
        "ai",
        "spec"
      ]);
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("uses configured Node.js runtime when Java runtime is not configured", () => {
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = "/runtime/mikuproject.mjs";

    try {
      const command = selectRuntimeCommand({ name: "ai_spec" });
      assert.equal(command?.kind, "node");
      assert.equal(command?.command, "node");
      assert.deepEqual(command?.args, ["/runtime/mikuproject.mjs", "ai", "spec"]);
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("selects the latest versioned bundled runtime artifact", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-versioned-runtime-"));
    const javaDir = join(tempRoot, "runtime", "mikuproject-java");
    const nodeDir = join(tempRoot, "runtime", "mikuproject-node");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    mkdirSync(javaDir, { recursive: true });
    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(javaDir, "mikuproject-0.8.3.2.jar"), "");
    writeFileSync(join(javaDir, "mikuproject-0.8.3.10.jar"), "");
    writeFileSync(join(javaDir, "mikuproject.jar"), "");
    writeFileSync(join(nodeDir, "mikuproject-0.8.3.2.mjs"), "");
    writeFileSync(join(nodeDir, "mikuproject-0.8.3.10.mjs"), "");
    writeFileSync(join(nodeDir, "mikuproject.mjs"), "");

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    delete process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    try {
      const config = resolveRuntimeConfig(tempRoot);

      assert.equal(config.javaJarPath, join(javaDir, "mikuproject-0.8.3.10.jar"));
      assert.equal(config.nodeCliPath, join(nodeDir, "mikuproject-0.8.3.10.mjs"));
      assert.ok(config.diagnostics.some((diagnostic) => diagnostic.code === "bundled_java_runtime"));
      assert.ok(config.diagnostics.some((diagnostic) => diagnostic.code === "bundled_node_runtime"));
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("keeps legacy bundled runtime names as fallback", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-legacy-runtime-"));
    const nodeDir = join(tempRoot, "runtime", "mikuproject-node");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(nodeDir, "mikuproject.mjs"), "");

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    delete process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    try {
      const config = resolveRuntimeConfig(tempRoot);

      assert.equal(config.nodeCliPath, join(nodeDir, "mikuproject.mjs"));
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("maps text content mode to stdin and stdout", () => {
    const invocation = buildRuntimeInvocation({
      name: "state_from_draft",
      draftContent: "{\"project\":{\"name\":\"inline\"}}",
      outputMode: "content"
    });

    assert.deepEqual(invocation.args, ["state", "from-draft", "--in", "-", "--out", "-"]);
    assert.equal(invocation.stdin, "{\"project\":{\"name\":\"inline\"}}");

    const patchInvocation = buildRuntimeInvocation({
      name: "ai_validate_patch",
      statePath: "workbook.json",
      patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}"
    });

    assert.deepEqual(patchInvocation.args, ["ai", "validate-patch", "--state", "workbook.json", "--in", "-"]);
    assert.equal(patchInvocation.stdin, "{\"kind\":\"patch_json\",\"operations\":[]}");
  });

  it("maps binary content mode to Base64 stdin and stdout", () => {
    const invocation = buildRuntimeInvocation({
      name: "import_xlsx",
      inputBase64: "UEsDBAo=",
      outputMode: "content"
    });

    assert.deepEqual(invocation.args, ["import", "xlsx", "--in-base64", "-", "--out", "-"]);
    assert.equal(invocation.stdin, "UEsDBAo=");

    assert.deepEqual(
      buildRuntimeArgs({
        name: "export_xlsx",
        workbookContent: "{\"project\":{\"name\":\"inline\"}}",
        outputMode: "base64"
      }),
      ["export", "xlsx", "--in", "-", "--out-base64", "-"]
    );
  });

  it("prefers Node.js runtime for content-mode calls even when Java is configured", () => {
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    process.env.MIKUPROJECT_MCP_RUNTIME_JAVA = "/runtime/mikuproject.jar";
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = "/runtime/mikuproject.mjs";

    try {
      const command = selectRuntimeCommand({
        name: "state_summarize",
        workbookContent: "{\"project\":{\"name\":\"inline\"}}"
      });
      assert.equal(command?.kind, "node");
      assert.equal(command?.command, "node");
      assert.deepEqual(command?.args, ["/runtime/mikuproject.mjs", "state", "summarize", "--in", "-"]);
      assert.equal(command?.stdin, "{\"project\":{\"name\":\"inline\"}}");
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });

  it("rejects conflicting runtime content and path options", () => {
    assert.throws(
      () =>
        buildRuntimeArgs({
          name: "state_from_draft",
          draftPath: "draft.editjson",
          draftContent: "{\"project\":{\"name\":\"inline\"}}",
          outputMode: "content"
        }),
      /draftPath and draftContent are mutually exclusive/
    );
    assert.throws(
      () =>
        buildRuntimeArgs({
          name: "ai_validate_patch",
          statePath: "workbook.json",
          patchPath: "patch.editjson",
          patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}"
        }),
      /patchPath and patchContent are mutually exclusive/
    );
    assert.throws(
      () =>
        buildRuntimeArgs({
          name: "import_xlsx",
          inputPath: "project.xlsx",
          inputBase64: "UEsDBAo=",
          outputMode: "content"
        }),
      /inputPath and inputBase64 are mutually exclusive/
    );
    assert.throws(
      () =>
        buildRuntimeArgs({
          name: "export_xlsx",
          workbookContent: "{\"project\":{\"name\":\"inline\"}}",
          outputPath: "project.xlsx",
          outputMode: "base64"
        }),
      /outputPath cannot be used with base64 output mode/
    );
  });

  it("executes content-mode runtime calls with stdin and stdout", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-runtime-content-"));
    const runtimePath = join(tempRoot, "fake-mikuproject.mjs");
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    writeFileSync(
      runtimePath,
      [
        "let stdin = '';",
        "process.stdin.setEncoding('utf8');",
        "for await (const chunk of process.stdin) stdin += chunk;",
        "const args = process.argv.slice(2);",
        "if (args.join(' ') !== 'state apply-patch --state workbook.json --in - --out -') {",
        "  console.error('unexpected args: ' + args.join(' '));",
        "  process.exit(2);",
        "}",
        "const patch = JSON.parse(stdin);",
        "process.stdout.write(JSON.stringify({ kind: 'mikuproject_workbook_json', patched: patch.operations.length }) + '\\n');"
      ].join("\n")
    );

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    process.env.MIKUPROJECT_MCP_RUNTIME_NODE = runtimePath;

    try {
      const result = await runRuntimeOperation({
        name: "state_apply_patch",
        statePath: "workbook.json",
        patchContent: "{\"kind\":\"patch_json\",\"operations\":[{\"op\":\"test\"}]}",
        outputMode: "content"
      });

      assert.equal(result.ok, true);
      assert.equal(result.runtimeKind, "node");
      assert.match(result.stdout, /"patched":1/);
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
