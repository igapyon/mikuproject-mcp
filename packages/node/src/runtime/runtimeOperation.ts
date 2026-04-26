import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveRuntimeConfig } from "./runtimeConfig.js";

const execFileAsync = promisify(execFile);

export type RuntimeKind = "java" | "node";

const javaNetworkArgs = ["-Djava.net.preferIPv4Stack=true", "-Djava.net.preferIPv6Addresses=false"];

export type RuntimeOperation =
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
    case "ai_spec":
      return ["ai", "spec"];
    case "ai_detect_kind":
      return ["ai", "detect-kind", "--in", operation.inputPath];
    case "state_from_draft":
      return ["state", "from-draft", "--in", operation.draftPath, "--out", operation.outputPath];
    case "ai_export_project_overview":
      return ["ai", "export", "project-overview", "--in", operation.workbookPath, "--out", operation.outputPath];
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
          code: "upstream_runtime_not_configured",
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
          code: "upstream_runtime_failure",
          message: failed.message || "mikuproject runtime execution failed."
        }
      ]
    };
  }
}
