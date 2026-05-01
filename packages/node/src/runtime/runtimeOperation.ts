import { spawn } from "node:child_process";
import { errorCategories } from "../results/errorCategories.js";
import { resolveRuntimeConfig } from "./runtimeConfig.js";

export type RuntimeKind = "java" | "node";
export type RuntimeOutputMode = "path" | "content" | "base64";

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
      inputPath?: string;
      inputContent?: string;
    }
  | {
      name: "state_from_draft";
      draftPath?: string;
      draftContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "ai_export_project_overview";
      workbookPath?: string;
      workbookContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "ai_export_bundle";
      workbookPath?: string;
      workbookContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "ai_export_task_edit";
      workbookPath?: string;
      workbookContent?: string;
      taskUid: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "ai_export_phase_detail";
      workbookPath?: string;
      workbookContent?: string;
      phaseUid: string;
      mode?: "scoped" | "full";
      rootTaskUid?: string;
      maxDepth?: number;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "ai_validate_patch";
      statePath: string;
      patchPath?: string;
      patchContent?: string;
    }
  | {
      name: "state_apply_patch";
      statePath: string;
      patchPath?: string;
      patchContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "state_diff";
      beforePath: string;
      afterPath: string;
    }
  | {
      name: "state_summarize";
      workbookPath?: string;
      workbookContent?: string;
    }
  | {
      name: "export_workbook_json";
      workbookPath?: string;
      workbookContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "export_xml" | "export_xlsx";
      workbookPath?: string;
      workbookContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    }
  | {
      name: "import_xlsx";
      inputPath?: string;
      inputBase64?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
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
      workbookPath?: string;
      workbookContent?: string;
      outputPath?: string;
      outputMode?: RuntimeOutputMode;
    };

export type RuntimeCommand = {
  kind: RuntimeKind;
  command: string;
  args: string[];
  stdin?: string;
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
  return buildRuntimeInvocation(operation).args;
}

type RuntimeInvocation = {
  args: string[];
  stdin?: string;
};

export function buildRuntimeInvocation(operation: RuntimeOperation): RuntimeInvocation {
  switch (operation.name) {
    case "version":
      return { args: ["--version"] };
    case "ai_spec":
      return { args: ["ai", "spec"] };
    case "ai_detect_kind":
      return {
        args: ["ai", "detect-kind", "--in", textInputPath(operation.inputPath, operation.inputContent, "inputPath", "inputContent")],
        stdin: operation.inputContent
      };
    case "state_from_draft":
      return {
        args: [
          "state",
          "from-draft",
          "--in",
          textInputPath(operation.draftPath, operation.draftContent, "draftPath", "draftContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.draftContent
      };
    case "ai_export_project_overview":
      return {
        args: [
          "ai",
          "export",
          "project-overview",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "ai_export_bundle":
      return {
        args: [
          "ai",
          "export",
          "bundle",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "ai_export_task_edit":
      return {
        args: [
          "ai",
          "export",
          "task-edit",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          "--task-uid",
          operation.taskUid,
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "ai_export_phase_detail": {
      const args = [
        "ai",
        "export",
        "phase-detail",
        "--in",
        textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
        "--phase-uid",
        operation.phaseUid
      ];
      if (operation.mode) {
        args.push("--mode", operation.mode);
      }
      if (operation.rootTaskUid) {
        args.push("--root-task-uid", operation.rootTaskUid);
      }
      if (typeof operation.maxDepth === "number") {
        args.push("--max-depth", String(operation.maxDepth));
      }
      args.push(...textOutputArgs(operation.outputPath, operation.outputMode));
      return { args, stdin: operation.workbookContent };
    }
    case "ai_validate_patch":
      return {
        args: [
          "ai",
          "validate-patch",
          "--state",
          operation.statePath,
          "--in",
          textInputPath(operation.patchPath, operation.patchContent, "patchPath", "patchContent")
        ],
        stdin: operation.patchContent
      };
    case "state_apply_patch":
      return {
        args: [
          "state",
          "apply-patch",
          "--state",
          operation.statePath,
          "--in",
          textInputPath(operation.patchPath, operation.patchContent, "patchPath", "patchContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.patchContent
      };
    case "state_diff":
      return { args: ["state", "diff", "--before", operation.beforePath, "--after", operation.afterPath] };
    case "state_summarize":
      return {
        args: ["state", "summarize", "--in", textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent")],
        stdin: operation.workbookContent
      };
    case "export_workbook_json":
      return {
        args: [
          "export",
          "workbook-json",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "export_xml":
      return {
        args: [
          "export",
          "xml",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "export_xlsx":
      return {
        args: [
          "export",
          "xlsx",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...binaryOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "import_xlsx":
      return {
        args: [
          "import",
          "xlsx",
          ...binaryInputArgs(operation.inputPath, operation.inputBase64),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.inputBase64
      };
    case "report_wbs_xlsx":
      return {
        args: [
          "report",
          "wbs-xlsx",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...binaryOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "report_daily_svg":
      return {
        args: [
          "report",
          "daily-svg",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "report_weekly_svg":
      return {
        args: [
          "report",
          "weekly-svg",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "report_monthly_calendar_svg":
      return {
        args: [
          "report",
          "monthly-calendar-svg",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...binaryOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "report_all":
      return {
        args: [
          "report",
          "all",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...binaryOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "report_wbs_markdown":
      return {
        args: [
          "report",
          "wbs-markdown",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
    case "report_mermaid":
      return {
        args: [
          "report",
          "mermaid",
          "--in",
          textInputPath(operation.workbookPath, operation.workbookContent, "workbookPath", "workbookContent"),
          ...textOutputArgs(operation.outputPath, operation.outputMode)
        ],
        stdin: operation.workbookContent
      };
  }
}

export function selectRuntimeCommand(operation: RuntimeOperation, cwd = process.cwd()): RuntimeCommand | undefined {
  const config = resolveRuntimeConfig(cwd);
  const invocation = buildRuntimeInvocation(operation);
  const contentMode = usesContentIo(operation);

  if (contentMode && config.nodeCliPath) {
    return {
      kind: "node",
      command: "node",
      args: [config.nodeCliPath, ...invocation.args],
      stdin: invocation.stdin
    };
  }

  if (contentMode) {
    return undefined;
  }

  if (config.javaJarPath) {
    return {
      kind: "java",
      command: "java",
      args: [...javaNetworkArgs, "-jar", config.javaJarPath, ...invocation.args],
      stdin: invocation.stdin
    };
  }

  if (config.nodeCliPath) {
    return {
      kind: "node",
      command: "node",
      args: [config.nodeCliPath, ...invocation.args],
      stdin: invocation.stdin
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
    const contentMode = usesContentIo(operation);
    return {
      ok: false,
      stdout: "",
      stderr: "",
      diagnostics: [
        ...config.diagnostics,
        {
          level: "error",
          code: errorCategories.upstreamRuntimeFailure,
          message: contentMode
            ? "The requested content-mode operation requires a Node.js mikuproject runtime with stdin/stdout support."
            : "No configured or bundled mikuproject runtime artifact is available."
        }
      ]
    };
  }

  try {
    const result = await runCommand(selected.command, selected.args, selected.stdin, {
      cwd,
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

function textInputPath(
  path: string | undefined,
  content: string | undefined,
  pathFieldName: string,
  contentFieldName: string
): string {
  if (path && content !== undefined) {
    throw new Error(`${pathFieldName} and ${contentFieldName} are mutually exclusive.`);
  }
  if (content !== undefined) {
    return "-";
  }
  return requiredPath(path, pathFieldName);
}

function binaryInputArgs(inputPath: string | undefined, inputBase64: string | undefined): string[] {
  if (inputPath && inputBase64 !== undefined) {
    throw new Error("inputPath and inputBase64 are mutually exclusive.");
  }
  if (inputBase64 !== undefined) {
    return ["--in-base64", "-"];
  }
  return ["--in", requiredPath(inputPath, "inputPath")];
}

function requiredPath(path: string | undefined, fieldName: string): string {
  if (!path) {
    throw new Error(`${fieldName} is required for path-mode runtime execution.`);
  }
  return path;
}

function textOutputArgs(path: string | undefined, outputMode: RuntimeOutputMode | undefined): string[] {
  if (outputMode === "content") {
    if (path) {
      throw new Error("outputPath cannot be used with content output mode.");
    }
    return ["--out", "-"];
  }
  return ["--out", requiredPath(path, "outputPath")];
}

function binaryOutputArgs(path: string | undefined, outputMode: RuntimeOutputMode | undefined): string[] {
  if (outputMode === "base64") {
    if (path) {
      throw new Error("outputPath cannot be used with base64 output mode.");
    }
    return ["--out-base64", "-"];
  }
  return ["--out", requiredPath(path, "outputPath")];
}

function usesContentIo(operation: RuntimeOperation): boolean {
  if ("outputMode" in operation && (operation.outputMode === "content" || operation.outputMode === "base64")) {
    return true;
  }
  return (
    ("inputContent" in operation && operation.inputContent !== undefined) ||
    ("draftContent" in operation && operation.draftContent !== undefined) ||
    ("workbookContent" in operation && operation.workbookContent !== undefined) ||
    ("patchContent" in operation && operation.patchContent !== undefined) ||
    ("inputBase64" in operation && operation.inputBase64 !== undefined)
  );
}

function runCommand(
  command: string,
  args: string[],
  stdin: string | undefined,
  options: { cwd: string; maxBuffer: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes + stderrBytes > options.maxBuffer) {
        child.kill();
        reject(new Error("Runtime output exceeded maxBuffer."));
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stdoutBytes + stderrBytes > options.maxBuffer) {
        child.kill();
        reject(new Error("Runtime output exceeded maxBuffer."));
        return;
      }
      stderrChunks.push(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(`Command failed: ${command} ${args.join(" ")}`) as Error & {
        code?: number | null;
        stdout?: string;
        stderr?: string;
      };
      error.code = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    if (stdin !== undefined) {
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
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
