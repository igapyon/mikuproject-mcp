import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRuntimeArgs, selectRuntimeCommand } from "../runtime/runtimeOperation.js";

describe("runtime operation mapping", () => {
  it("builds fixed CLI args for initial core operations", () => {
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
