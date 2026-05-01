import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { loadToolInputSchema } from "../contract/toolSchemas.js";
import { asTextResult, type ArtifactRef, type CommonResult, type Diagnostic } from "../results/commonResult.js";
import { runRuntimeOperation, type RuntimeOutputMode } from "../runtime/runtimeOperation.js";
import {
  ensureParentDirectory,
  ensureWorkspace,
  resolveWorkspaceConfig,
  shouldInlineOperationArtifacts
} from "../workspace/workspace.js";

const textOutputModeSchema = z.enum(["path", "content"]).optional();
const binaryOutputModeSchema = z.enum(["path", "base64"]).optional();

export function registerMikuprojectTools(server: McpServer): void {
  server.registerTool(
    "mikuproject_version",
    {
      title: "Get mikuproject runtime version",
      description: "Returns the configured mikuproject runtime version.",
      inputSchema: {},
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_version")
      }
    },
    async () => {
      const runtimeResult = await runRuntimeOperation({
        name: "version"
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_version",
        diagnostics: runtimeResult.diagnostics,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool("mikuproject_ai_spec", {
    title: "Get mikuproject AI specification",
    description: "Returns the MCP-facing AI specification resource reference for mikuproject.",
    inputSchema: {},
    _meta: {
      contractInputSchema: loadToolInputSchema("mikuproject_ai_spec")
    }
  }, async () => {
    const runtimeResult = await runRuntimeOperation({
      name: "ai_spec"
    });

    return asPersistedTextResult({
      ok: runtimeResult.ok,
      operation: "mikuproject_ai_spec",
      diagnostics: [
        ...runtimeResult.diagnostics,
        {
          level: "info",
          code: "resource_available",
          message: "Read mikuproject://spec/ai-json for the AI-facing specification."
        }
      ],
      artifacts: [
        {
          role: "ai_spec",
          uri: "mikuproject://spec/ai-json"
        }
      ],
      stdout: runtimeResult.stdout || undefined,
      stderr: runtimeResult.stderr || undefined
    });
  });

  server.registerTool(
    "mikuproject_ai_detect_kind",
    {
      title: "Detect mikuproject document kind",
      description: "Detects the kind of a mikuproject-related input file.",
      inputSchema: {
        path: z.string().min(1).optional(),
        content: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_ai_detect_kind")
      }
    },
    async ({ path, content }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "ai_detect_kind",
        inputPath: path,
        inputContent: content
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_ai_detect_kind",
        diagnostics: runtimeResult.diagnostics,
        input: {
          path,
          content: content === undefined ? undefined : "[inline]"
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_state_from_draft",
    {
      title: "Create mikuproject state from draft",
      description: "Creates a mikuproject workbook JSON state from a draft document.",
      inputSchema: {
        draftPath: z.string().min(1).optional(),
        draftContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_state_from_draft")
      }
    },
    async ({ draftPath, draftContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultStateOutputPath = `${workspace.root}/mikuproject/state/current-workbook.json`;
      const stateOutputPath = resolveOutputPath(outputPath, defaultStateOutputPath, outputMode);
      ensureOutputParentDirectory(stateOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "state_from_draft",
        draftPath,
        draftContent,
        outputPath: stateOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_state_from_draft",
        diagnostics: runtimeResult.diagnostics,
        input: {
          draftPath,
          draftContent: draftContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: stateOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("workbook_state", stateOutputPath, defaultStateOutputPath, "mikuproject://state/current", outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_ai_export_project_overview",
    {
      title: "Export mikuproject project overview",
      description: "Exports a project_overview_view projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_ai_export_project_overview")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultOverviewOutputPath = `${workspace.root}/mikuproject/projection/project-overview.editjson`;
      const overviewOutputPath = resolveOutputPath(outputPath, defaultOverviewOutputPath, outputMode);
      ensureOutputParentDirectory(overviewOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_project_overview",
        workbookPath,
        workbookContent,
        outputPath: overviewOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_ai_export_project_overview",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: overviewOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("projection", overviewOutputPath, defaultOverviewOutputPath, "mikuproject://projection/project-overview", outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_ai_export_bundle",
    {
      title: "Export mikuproject AI bundle",
      description: "Exports an AI-facing bundle projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_ai_export_bundle")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultBundleOutputPath = `${workspace.root}/mikuproject/projection/bundle.editjson`;
      const bundleOutputPath = resolveOutputPath(outputPath, defaultBundleOutputPath, outputMode);
      ensureOutputParentDirectory(bundleOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_bundle",
        workbookPath,
        workbookContent,
        outputPath: bundleOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_ai_export_bundle",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: bundleOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("projection", bundleOutputPath, defaultBundleOutputPath, "mikuproject://projection/bundle", outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_ai_export_task_edit",
    {
      title: "Export mikuproject task edit view",
      description: "Exports a task_edit_view projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        taskUid: z.string().min(1),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_ai_export_task_edit")
      }
    },
    async ({ workbookPath, workbookContent, taskUid, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultTaskEditOutputPath = `${workspace.root}/mikuproject/projection/task-${taskUid}.editjson`;
      const taskEditOutputPath = resolveOutputPath(outputPath, defaultTaskEditOutputPath, outputMode);
      ensureOutputParentDirectory(taskEditOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_task_edit",
        workbookPath,
        workbookContent,
        taskUid,
        outputPath: taskEditOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_ai_export_task_edit",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          taskUid,
          outputMode,
          outputPath: taskEditOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("projection", taskEditOutputPath, defaultTaskEditOutputPath, `mikuproject://projection/task-edit/${taskUid}`, outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_ai_export_phase_detail",
    {
      title: "Export mikuproject phase detail view",
      description: "Exports a phase_detail_view projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        phaseUid: z.string().min(1),
        mode: z.enum(["scoped", "full"]).optional(),
        rootTaskUid: z.string().min(1).optional(),
        maxDepth: z.number().int().nonnegative().optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_ai_export_phase_detail")
      }
    },
    async ({ workbookPath, workbookContent, phaseUid, mode, rootTaskUid, maxDepth, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultPhaseDetailOutputPath = `${workspace.root}/mikuproject/projection/phase-${phaseUid}.editjson`;
      const phaseDetailOutputPath = resolveOutputPath(outputPath, defaultPhaseDetailOutputPath, outputMode);
      ensureOutputParentDirectory(phaseDetailOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_phase_detail",
        workbookPath,
        workbookContent,
        phaseUid,
        mode,
        rootTaskUid,
        maxDepth,
        outputPath: phaseDetailOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_ai_export_phase_detail",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          phaseUid,
          mode,
          rootTaskUid,
          maxDepth,
          outputMode,
          outputPath: phaseDetailOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("projection", phaseDetailOutputPath, defaultPhaseDetailOutputPath, `mikuproject://projection/phase-detail/${phaseUid}`, outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_ai_validate_patch",
    {
      title: "Validate mikuproject patch",
      description: "Validates a mikuproject patch document against a workbook JSON state.",
      inputSchema: {
        statePath: z.string().min(1),
        patchPath: z.string().min(1).optional(),
        patchContent: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_ai_validate_patch")
      }
    },
    async ({ statePath, patchPath, patchContent }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "ai_validate_patch",
        statePath,
        patchPath,
        patchContent
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_ai_validate_patch",
        diagnostics: runtimeResult.diagnostics,
        input: {
          statePath,
          patchPath,
          patchContent: patchContent === undefined ? undefined : "[inline]"
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_state_apply_patch",
    {
      title: "Apply mikuproject patch",
      description: "Applies a mikuproject patch document to a workbook JSON state.",
      inputSchema: {
        statePath: z.string().min(1),
        patchPath: z.string().min(1).optional(),
        patchContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_state_apply_patch")
      }
    },
    async ({ statePath, patchPath, patchContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultStateOutputPath = `${workspace.root}/mikuproject/state/next-workbook.json`;
      const stateOutputPath = resolveOutputPath(outputPath, defaultStateOutputPath, outputMode);
      ensureOutputParentDirectory(stateOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "state_apply_patch",
        statePath,
        patchPath,
        patchContent,
        outputPath: stateOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_state_apply_patch",
        diagnostics: runtimeResult.diagnostics,
        input: {
          statePath,
          patchPath,
          patchContent: patchContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: stateOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("workbook_state", stateOutputPath, defaultStateOutputPath, "mikuproject://state/next", outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_state_diff",
    {
      title: "Diff mikuproject states",
      description: "Compares two mikuproject workbook JSON states.",
      inputSchema: {
        beforePath: z.string().min(1),
        afterPath: z.string().min(1)
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_state_diff")
      }
    },
    async ({ beforePath, afterPath }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "state_diff",
        beforePath,
        afterPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_state_diff",
        diagnostics: runtimeResult.diagnostics,
        input: {
          beforePath,
          afterPath
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_state_summarize",
    {
      title: "Summarize mikuproject state",
      description: "Summarizes a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_state_summarize")
      }
    },
    async ({ workbookPath, workbookContent }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "state_summarize",
        workbookPath,
        workbookContent
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_state_summarize",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]"
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_export_workbook_json",
    {
      title: "Export mikuproject workbook JSON",
      description: "Exports a mikuproject workbook JSON artifact from a workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_export_workbook_json")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultWorkbookOutputPath = `${workspace.root}/mikuproject/export/workbook.json`;
      const workbookOutputPath = resolveOutputPath(outputPath, defaultWorkbookOutputPath, outputMode);
      ensureOutputParentDirectory(workbookOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "export_workbook_json",
        workbookPath,
        workbookContent,
        outputPath: workbookOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_export_workbook_json",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: workbookOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("mikuproject_workbook_json", workbookOutputPath, defaultWorkbookOutputPath, "mikuproject://export/workbook-json", outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_export_xml",
    {
      title: "Export mikuproject MS Project XML",
      description: "Exports an MS Project XML artifact from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_export_xml")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultXmlOutputPath = `${workspace.root}/mikuproject/export/project.xml`;
      const xmlOutputPath = resolveOutputPath(outputPath, defaultXmlOutputPath, outputMode);
      ensureOutputParentDirectory(xmlOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "export_xml",
        workbookPath,
        workbookContent,
        outputPath: xmlOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_export_xml",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: xmlOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("ms_project_xml", xmlOutputPath, defaultXmlOutputPath, "mikuproject://export/project-xml", outputMode, runtimeResult.stdout, "application/xml")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_export_xlsx",
    {
      title: "Export mikuproject XLSX",
      description: "Exports an XLSX artifact from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: binaryOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_export_xlsx")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultXlsxOutputPath = `${workspace.root}/mikuproject/export/project.xlsx`;
      const xlsxOutputPath = resolveOutputPath(outputPath, defaultXlsxOutputPath, outputMode);
      ensureOutputParentDirectory(xlsxOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "export_xlsx",
        workbookPath,
        workbookContent,
        outputPath: xlsxOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_export_xlsx",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: xlsxOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("xlsx_workbook", xlsxOutputPath, defaultXlsxOutputPath, "mikuproject://export/project-xlsx", outputMode, runtimeResult.stdout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_import_xlsx",
    {
      title: "Import mikuproject XLSX",
      description: "Imports an XLSX file into a mikuproject workbook JSON state.",
      inputSchema: {
        inputPath: z.string().min(1).optional(),
        inputBase64: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_import_xlsx")
      }
    },
    async ({ inputPath, inputBase64, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultStateOutputPath = `${workspace.root}/mikuproject/state/imported-workbook.json`;
      const stateOutputPath = resolveOutputPath(outputPath, defaultStateOutputPath, outputMode);
      ensureOutputParentDirectory(stateOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "import_xlsx",
        inputPath,
        inputBase64,
        outputPath: stateOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_import_xlsx",
        diagnostics: runtimeResult.diagnostics,
        input: {
          inputPath,
          inputBase64: inputBase64 === undefined ? undefined : "[inline-base64]",
          outputMode,
          outputPath: stateOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("workbook_state", stateOutputPath, defaultStateOutputPath, "mikuproject://state/imported-workbook", outputMode, runtimeResult.stdout, "application/json")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_wbs_xlsx",
    {
      title: "Generate mikuproject WBS XLSX report",
      description: "Generates a WBS XLSX report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: binaryOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_wbs_xlsx")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/wbs.xlsx`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_wbs_xlsx",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_wbs_xlsx",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/wbs-xlsx", outputMode, runtimeResult.stdout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_daily_svg",
    {
      title: "Generate mikuproject daily SVG report",
      description: "Generates a daily SVG report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_daily_svg")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/daily.svg`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_daily_svg",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_daily_svg",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/daily-svg", outputMode, runtimeResult.stdout, "image/svg+xml")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_weekly_svg",
    {
      title: "Generate mikuproject weekly SVG report",
      description: "Generates a weekly SVG report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_weekly_svg")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/weekly.svg`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_weekly_svg",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_weekly_svg",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/weekly-svg", outputMode, runtimeResult.stdout, "image/svg+xml")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_monthly_calendar_svg",
    {
      title: "Generate mikuproject monthly calendar SVG archive",
      description: "Generates a monthly calendar SVG archive from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: binaryOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_monthly_calendar_svg")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/monthly-calendar-svg.zip`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_monthly_calendar_svg",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_monthly_calendar_svg",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/monthly-calendar-svg", outputMode, runtimeResult.stdout, "application/zip")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_all",
    {
      title: "Generate mikuproject report bundle",
      description: "Generates a report bundle from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: binaryOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_all")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/report-bundle.zip`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_all",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_all",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/all", outputMode, runtimeResult.stdout, "application/zip")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_wbs_markdown",
    {
      title: "Generate mikuproject WBS Markdown report",
      description: "Generates a WBS Markdown report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_wbs_markdown")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/wbs.md`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_wbs_markdown",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_wbs_markdown",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/wbs-markdown", outputMode, runtimeResult.stdout, "text/markdown")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject_report_mermaid",
    {
      title: "Generate mikuproject Mermaid report",
      description: "Generates a Mermaid report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1).optional(),
        workbookContent: z.string().min(1).optional(),
        outputPath: z.string().min(1).optional(),
        outputMode: textOutputModeSchema
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject_report_mermaid")
      }
    },
    async ({ workbookPath, workbookContent, outputPath, outputMode }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const defaultReportOutputPath = `${workspace.root}/mikuproject/report/project.mmd`;
      const reportOutputPath = resolveOutputPath(outputPath, defaultReportOutputPath, outputMode);
      ensureOutputParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_mermaid",
        workbookPath,
        workbookContent,
        outputPath: reportOutputPath,
        outputMode
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject_report_mermaid",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          workbookContent: workbookContent === undefined ? undefined : "[inline]",
          outputMode,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              outputArtifactRef("report_output", reportOutputPath, defaultReportOutputPath, "mikuproject://report/mermaid", outputMode, runtimeResult.stdout, "text/vnd.mermaid")
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );
}

function artifactRef(role: string, path: string, uriBackedPath: string, uri: string): ArtifactRef {
  return path === uriBackedPath ? { role, uri, path } : { role, path };
}

function outputArtifactRef(
  role: string,
  path: string | undefined,
  uriBackedPath: string,
  uri: string,
  outputMode: RuntimeOutputMode | undefined,
  stdout: string,
  mimeType: string
): ArtifactRef {
  if (outputMode === "content") {
    return { role, text: stdout, mimeType };
  }
  if (outputMode === "base64") {
    return { role, base64: stdout, mimeType };
  }
  if (!path) {
    return { role };
  }
  return artifactRef(role, path, uriBackedPath, uri);
}

function resolveOutputPath(
  outputPath: string | undefined,
  defaultOutputPath: string,
  outputMode: RuntimeOutputMode | undefined
): string | undefined {
  if (outputMode === "content" || outputMode === "base64") {
    if (outputPath) {
      throw new Error("outputPath cannot be used with content or base64 output mode.");
    }
    return undefined;
  }
  return outputPath || defaultOutputPath;
}

function ensureOutputParentDirectory(outputPath: string | undefined): void {
  if (outputPath) {
    ensureParentDirectory(outputPath);
  }
}

function asPersistedTextResult(result: CommonResult) {
  return asTextResult(persistOperationArtifacts(result));
}

function persistOperationArtifacts(result: CommonResult): CommonResult {
  const workspace = resolveWorkspaceConfig();

  const operationId = randomUUID();
  const diagnostics = result.diagnostics as Diagnostic[];
  if (shouldInlineOperationArtifacts()) {
    const summary = {
      operationId,
      ok: result.ok,
      operation: result.operation,
      input: result.input,
      exitCode: result.exitCode,
      artifactCount: (result.artifacts?.length || 0) + 2,
      diagnosticsCount: diagnostics.length
    };
    const diagnosticsLog = {
      operationId,
      ok: result.ok,
      operation: result.operation,
      diagnostics,
      stderr: result.stderr
    };
    return {
      ...result,
      operationId,
      workspace:
        typeof result.workspace === "object" && result.workspace !== null
          ? result.workspace
          : {
              root: workspace.root
            },
      artifacts: [
        ...(result.artifacts || []),
        {
          role: "operation_summary",
          text: JSON.stringify(summary, null, 2),
          mimeType: "application/json"
        },
        {
          role: "diagnostics_log",
          text: JSON.stringify(diagnosticsLog, null, 2),
          mimeType: "application/json"
        }
      ]
    };
  }

  ensureWorkspace(workspace);

  const summaryPath = `${workspace.root}/mikuproject/summary/${operationId}.json`;
  const diagnosticsPath = `${workspace.root}/mikuproject/diagnostics/${operationId}.json`;
  const existingArtifacts = result.artifacts || [];
  const operationArtifacts: ArtifactRef[] = [
    {
      role: "operation_summary",
      uri: `mikuproject://summary/${operationId}`,
      path: summaryPath
    },
    {
      role: "diagnostics_log",
      uri: `mikuproject://diagnostics/${operationId}`,
      path: diagnosticsPath
    }
  ];
  const persistedResult: CommonResult = {
    ...result,
    operationId,
    workspace:
      typeof result.workspace === "object" && result.workspace !== null
        ? result.workspace
        : {
            root: workspace.root
          },
    artifacts: [...existingArtifacts, ...operationArtifacts]
  };

  ensureParentDirectory(summaryPath);
  ensureParentDirectory(diagnosticsPath);
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        operationId,
        ok: result.ok,
        operation: result.operation,
        input: result.input,
        exitCode: result.exitCode,
        artifactCount: persistedResult.artifacts?.length || 0,
        diagnosticsCount: diagnostics.length
      },
      null,
      2
    )
  );
  writeFileSync(
    diagnosticsPath,
    JSON.stringify(
      {
        operationId,
        ok: result.ok,
        operation: result.operation,
        diagnostics,
        stderr: result.stderr
      },
      null,
      2
    )
  );

  return persistedResult;
}
