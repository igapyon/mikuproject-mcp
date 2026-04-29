import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { errorCategories } from "../results/errorCategories.js";
import { resolveRuntimeConfig } from "./runtimeConfig.js";

const execFileAsync = promisify(execFile);

export type RuntimeKind = "java" | "node";

const javaNetworkArgs = ["-Djava.net.preferIPv4Stack=true", "-Djava.net.preferIPv6Addresses=false"];

export type RuntimeOperation =
  | {
      name: "version";
    }
  | {
      name: "ai_spec";
    }
  | {
      name: "ai_detect_kind";
      inputPath: string;
    }
  | {
      name: "state_from_draft";
      draftPath: string;
      outputPath: string;
    }
  | {
      name: "ai_export_project_overview";
      workbookPath: string;
      outputPath: string;
    }
  | {
      name: "ai_export_bundle";
      workbookPath: string;
      outputPath: string;
    }
  | {
      name: "ai_export_task_edit";
      workbookPath: string;
      taskUid: string;
      outputPath: string;
    }
  | {
      name: "ai_export_phase_detail";
      workbookPath: string;
      phaseUid: string;
      mode?: "scoped" | "full";
      rootTaskUid?: string;
      maxDepth?: number;
      outputPath: string;
    }
  | {
      name: "ai_validate_patch";
      statePath: string;
      patchPath: string;
    }
  | {
      name: "state_apply_patch";
      statePath: string;
      patchPath: string;
      outputPath: string;
    }
  | {
      name: "state_diff";
      beforePath: string;
      afterPath: string;
    }
  | {
      name: "state_summarize";
      workbookPath: string;
    }
  | {
      name: "export_workbook_json";
      workbookPath: string;
      outputPath: string;
    }
  | {
      name: "export_xml" | "export_xlsx";
      workbookPath: string;
      outputPath: string;
    }
  | {
      name: "import_xlsx";
      inputPath: string;
      outputPath: string;
    }
  | {
      name:
        | "report_wbs_xlsx"
        | "report_daily_svg"
        | "report_weekly_svg"
        | "report_monthly_calendar_svg"
        | "report_all"
        | "report_wbs_markdown"
        | "report_mermaid";
      workbookPath: string;
      outputPath: string;
    };

export type RuntimeCommand = {
  kind: RuntimeKind;
  command: string;
  args: string[];
};

export type RuntimeExecutionResult = {
  ok: boolean;
  runtimeKind?: RuntimeKind;
  command?: string;
  args?: string[];
  stdout: string;
  stderr: string;
  exitCode?: number;
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};

export function buildRuntimeArgs(operation: RuntimeOperation): string[] {
  switch (operation.name) {
    case "version":
      return ["--version"];
    case "ai_spec":
      return ["ai", "spec"];
    case "ai_detect_kind":
      return ["ai", "detect-kind", "--in", operation.inputPath];
    case "state_from_draft":
      return ["state", "from-draft", "--in", operation.draftPath, "--out", operation.outputPath];
    case "ai_export_project_overview":
      return ["ai", "export", "project-overview", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "ai_export_bundle":
      return ["ai", "export", "bundle", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "ai_export_task_edit":
      return [
        "ai",
        "export",
        "task-edit",
        "--in",
        operation.workbookPath,
        "--task-uid",
        operation.taskUid,
        "--out",
        operation.outputPath
      ];
    case "ai_export_phase_detail": {
      const args = ["ai", "export", "phase-detail", "--in", operation.workbookPath, "--phase-uid", operation.phaseUid];
      if (operation.mode) {
        args.push("--mode", operation.mode);
      }
      if (operation.rootTaskUid) {
        args.push("--root-task-uid", operation.rootTaskUid);
      }
      if (typeof operation.maxDepth === "number") {
        args.push("--max-depth", String(operation.maxDepth));
      }
      args.push("--out", operation.outputPath);
      return args;
    }
    case "ai_validate_patch":
      return ["ai", "validate-patch", "--state", operation.statePath, "--in", operation.patchPath];
    case "state_apply_patch":
      return ["state", "apply-patch", "--state", operation.statePath, "--in", operation.patchPath, "--out", operation.outputPath];
    case "state_diff":
      return ["state", "diff", "--before", operation.beforePath, "--after", operation.afterPath];
    case "state_summarize":
      return ["state", "summarize", "--in", operation.workbookPath];
    case "export_workbook_json":
      return ["export", "workbook-json", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "export_xml":
      return ["export", "xml", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "export_xlsx":
      return ["export", "xlsx", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "import_xlsx":
      return ["import", "xlsx", "--in", operation.inputPath, "--out", operation.outputPath];
    case "report_wbs_xlsx":
      return ["report", "wbs-xlsx", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "report_daily_svg":
      return ["report", "daily-svg", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "report_weekly_svg":
      return ["report", "weekly-svg", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "report_monthly_calendar_svg":
      return ["report", "monthly-calendar-svg", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "report_all":
      return ["report", "all", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "report_wbs_markdown":
      return ["report", "wbs-markdown", "--in", operation.workbookPath, "--out", operation.outputPath];
    case "report_mermaid":
      return ["report", "mermaid", "--in", operation.workbookPath, "--out", operation.outputPath];
  }
}

export function selectRuntimeCommand(operation: RuntimeOperation, cwd = process.cwd()): RuntimeCommand | undefined {
  const config = resolveRuntimeConfig(cwd);
  const runtimeArgs = buildRuntimeArgs(operation);

  if (config.javaJarPath) {
    return {
      kind: "java",
      command: "java",
      args: [...javaNetworkArgs, "-jar", config.javaJarPath, ...runtimeArgs]
    };
  }

  if (config.nodeCliPath) {
    return {
      kind: "node",
      command: "node",
      args: [config.nodeCliPath, ...runtimeArgs]
    };
  }

  return undefined;
}

export async function runRuntimeOperation(
  operation: RuntimeOperation,
  cwd = process.cwd()
): Promise<RuntimeExecutionResult> {
  const config = resolveRuntimeConfig(cwd);
  const selected = selectRuntimeCommand(operation, cwd);

  if (!selected) {
    return {
      ok: false,
      stdout: "",
      stderr: "",
      diagnostics: [
        ...config.diagnostics,
        {
          level: "error",
          code: errorCategories.upstreamRuntimeFailure,
          message: "No configured or bundled mikuproject runtime artifact is available."
        }
      ]
    };
  }

  try {
    const result = await execFileAsync(selected.command, selected.args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      ok: true,
      runtimeKind: selected.kind,
      command: selected.command,
      args: selected.args,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      diagnostics: [
        ...config.diagnostics,
        {
          level: "info",
          code: "runtime_operation_succeeded",
          message: `Executed mikuproject ${selected.kind} runtime.`
        }
      ]
    };
  } catch (error) {
    const failed = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };

    return {
      ok: false,
      runtimeKind: selected.kind,
      command: selected.command,
      args: selected.args,
      stdout: failed.stdout || "",
      stderr: failed.stderr || "",
      exitCode: typeof failed.code === "number" ? failed.code : undefined,
      diagnostics: [
        ...config.diagnostics,
        {
          level: "error",
          code: classifyRuntimeFailure(failed.stderr || failed.stdout || failed.message || ""),
          message: failed.message || "mikuproject runtime execution failed."
        }
      ]
    };
  }
}

function classifyRuntimeFailure(output: string) {
  const lower = output.toLowerCase();

  if (lower.includes("validation") || lower.includes("invalid patch") || lower.includes("schema")) {
    return errorCategories.upstreamValidationError;
  }

  if (lower.includes("unsupported") || lower.includes("unknown document kind")) {
    return errorCategories.unsupportedDocumentKind;
  }

  if (lower.includes("missing") && (lower.includes("state") || lower.includes("base"))) {
    return errorCategories.missingBaseState;
  }

  return errorCategories.upstreamRuntimeFailure;
}
