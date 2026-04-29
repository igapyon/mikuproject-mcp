import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRuntimeArgs, selectRuntimeCommand } from "../runtime/runtimeOperation.js";

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
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
