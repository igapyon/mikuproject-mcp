import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { loadToolInputSchema } from "../contract/toolSchemas.js";
import { asTextResult, type ArtifactRef, type CommonResult, type Diagnostic } from "../results/commonResult.js";
import { runRuntimeOperation } from "../runtime/runtimeOperation.js";
import { ensureParentDirectory, ensureWorkspace, resolveWorkspaceConfig } from "../workspace/workspace.js";

export function registerMikuprojectTools(server: McpServer): void {
  server.registerTool("mikuproject.ai_spec", {
    title: "Get mikuproject AI specification",
    description: "Returns the MCP-facing AI specification resource reference for mikuproject.",
    inputSchema: {},
    _meta: {
      contractInputSchema: loadToolInputSchema("mikuproject.ai_spec")
    }
  }, async () => {
    const runtimeResult = await runRuntimeOperation({
      name: "ai_spec"
    });

    return asPersistedTextResult({
      ok: runtimeResult.ok,
      operation: "mikuproject.ai_spec",
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
    "mikuproject.ai_detect_kind",
    {
      title: "Detect mikuproject document kind",
      description: "Detects the kind of a mikuproject-related input file.",
      inputSchema: {
        path: z.string().min(1)
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.ai_detect_kind")
      }
    },
    async ({ path }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "ai_detect_kind",
        inputPath: path
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.ai_detect_kind",
        diagnostics: runtimeResult.diagnostics,
        input: {
          path
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.state_from_draft",
    {
      title: "Create mikuproject state from draft",
      description: "Creates a mikuproject workbook JSON state from a draft document.",
      inputSchema: {
        draftPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.state_from_draft")
      }
    },
    async ({ draftPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const stateOutputPath = outputPath || `${workspace.root}/mikuproject/state/current-workbook.json`;
      ensureParentDirectory(stateOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "state_from_draft",
        draftPath,
        outputPath: stateOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.state_from_draft",
        diagnostics: runtimeResult.diagnostics,
        input: {
          draftPath,
          outputPath: stateOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "workbook_state",
                uri: "mikuproject://state/current",
                path: stateOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.ai_export_project_overview",
    {
      title: "Export mikuproject project overview",
      description: "Exports a project_overview_view projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.ai_export_project_overview")
      }
    },
    async ({ workbookPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const overviewOutputPath = outputPath || `${workspace.root}/mikuproject/projection/project-overview.editjson`;
      ensureParentDirectory(overviewOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_project_overview",
        workbookPath,
        outputPath: overviewOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.ai_export_project_overview",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          outputPath: overviewOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "projection",
                uri: "mikuproject://projection/project-overview",
                path: overviewOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.ai_export_task_edit",
    {
      title: "Export mikuproject task edit view",
      description: "Exports a task_edit_view projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        taskUid: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.ai_export_task_edit")
      }
    },
    async ({ workbookPath, taskUid, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const taskEditOutputPath = outputPath || `${workspace.root}/mikuproject/projection/task-${taskUid}.editjson`;
      ensureParentDirectory(taskEditOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_task_edit",
        workbookPath,
        taskUid,
        outputPath: taskEditOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.ai_export_task_edit",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          taskUid,
          outputPath: taskEditOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "projection",
                uri: `mikuproject://projection/task-edit/${taskUid}`,
                path: taskEditOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.ai_export_phase_detail",
    {
      title: "Export mikuproject phase detail view",
      description: "Exports a phase_detail_view projection from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        phaseUid: z.string().min(1),
        mode: z.enum(["scoped", "full"]).optional(),
        rootTaskUid: z.string().min(1).optional(),
        maxDepth: z.number().int().nonnegative().optional(),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.ai_export_phase_detail")
      }
    },
    async ({ workbookPath, phaseUid, mode, rootTaskUid, maxDepth, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const phaseDetailOutputPath = outputPath || `${workspace.root}/mikuproject/projection/phase-${phaseUid}.editjson`;
      ensureParentDirectory(phaseDetailOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "ai_export_phase_detail",
        workbookPath,
        phaseUid,
        mode,
        rootTaskUid,
        maxDepth,
        outputPath: phaseDetailOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.ai_export_phase_detail",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          phaseUid,
          mode,
          rootTaskUid,
          maxDepth,
          outputPath: phaseDetailOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "projection",
                uri: `mikuproject://projection/phase-detail/${phaseUid}`,
                path: phaseDetailOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.ai_validate_patch",
    {
      title: "Validate mikuproject patch",
      description: "Validates a mikuproject patch document against a workbook JSON state.",
      inputSchema: {
        statePath: z.string().min(1),
        patchPath: z.string().min(1)
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.ai_validate_patch")
      }
    },
    async ({ statePath, patchPath }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "ai_validate_patch",
        statePath,
        patchPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.ai_validate_patch",
        diagnostics: runtimeResult.diagnostics,
        input: {
          statePath,
          patchPath
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.state_apply_patch",
    {
      title: "Apply mikuproject patch",
      description: "Applies a mikuproject patch document to a workbook JSON state.",
      inputSchema: {
        statePath: z.string().min(1),
        patchPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.state_apply_patch")
      }
    },
    async ({ statePath, patchPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const stateOutputPath = outputPath || `${workspace.root}/mikuproject/state/next-workbook.json`;
      ensureParentDirectory(stateOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "state_apply_patch",
        statePath,
        patchPath,
        outputPath: stateOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.state_apply_patch",
        diagnostics: runtimeResult.diagnostics,
        input: {
          statePath,
          patchPath,
          outputPath: stateOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "workbook_state",
                uri: "mikuproject://state/next",
                path: stateOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.state_diff",
    {
      title: "Diff mikuproject states",
      description: "Compares two mikuproject workbook JSON states.",
      inputSchema: {
        beforePath: z.string().min(1),
        afterPath: z.string().min(1)
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.state_diff")
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
        operation: "mikuproject.state_diff",
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
    "mikuproject.state_summarize",
    {
      title: "Summarize mikuproject state",
      description: "Summarizes a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1)
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.state_summarize")
      }
    },
    async ({ workbookPath }) => {
      const runtimeResult = await runRuntimeOperation({
        name: "state_summarize",
        workbookPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.state_summarize",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath
        },
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.export_workbook_json",
    {
      title: "Export mikuproject workbook JSON",
      description: "Exports a mikuproject workbook JSON artifact from a workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.export_workbook_json")
      }
    },
    async ({ workbookPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const workbookOutputPath = outputPath || `${workspace.root}/mikuproject/export/workbook.json`;
      ensureParentDirectory(workbookOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "export_workbook_json",
        workbookPath,
        outputPath: workbookOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.export_workbook_json",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          outputPath: workbookOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "mikuproject_workbook_json",
                uri: "mikuproject://export/workbook-json",
                path: workbookOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.export_xml",
    {
      title: "Export mikuproject MS Project XML",
      description: "Exports an MS Project XML artifact from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.export_xml")
      }
    },
    async ({ workbookPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const xmlOutputPath = outputPath || `${workspace.root}/mikuproject/export/project.xml`;
      ensureParentDirectory(xmlOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "export_xml",
        workbookPath,
        outputPath: xmlOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.export_xml",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          outputPath: xmlOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "ms_project_xml",
                uri: "mikuproject://export/project-xml",
                path: xmlOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.export_xlsx",
    {
      title: "Export mikuproject XLSX",
      description: "Exports an XLSX artifact from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.export_xlsx")
      }
    },
    async ({ workbookPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const xlsxOutputPath = outputPath || `${workspace.root}/mikuproject/export/project.xlsx`;
      ensureParentDirectory(xlsxOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "export_xlsx",
        workbookPath,
        outputPath: xlsxOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.export_xlsx",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          outputPath: xlsxOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "xlsx_workbook",
                uri: "mikuproject://export/project-xlsx",
                path: xlsxOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.import_xlsx",
    {
      title: "Import mikuproject XLSX",
      description: "Imports an XLSX file into a mikuproject workbook JSON state.",
      inputSchema: {
        inputPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.import_xlsx")
      }
    },
    async ({ inputPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const stateOutputPath = outputPath || `${workspace.root}/mikuproject/state/imported-workbook.json`;
      ensureParentDirectory(stateOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "import_xlsx",
        inputPath,
        outputPath: stateOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.import_xlsx",
        diagnostics: runtimeResult.diagnostics,
        input: {
          inputPath,
          outputPath: stateOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "workbook_state",
                uri: "mikuproject://state/imported-workbook",
                path: stateOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.report_wbs_markdown",
    {
      title: "Generate mikuproject WBS Markdown report",
      description: "Generates a WBS Markdown report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.report_wbs_markdown")
      }
    },
    async ({ workbookPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const reportOutputPath = outputPath || `${workspace.root}/mikuproject/report/wbs.md`;
      ensureParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_wbs_markdown",
        workbookPath,
        outputPath: reportOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.report_wbs_markdown",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "report_output",
                uri: "mikuproject://report/wbs-markdown",
                path: reportOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );

  server.registerTool(
    "mikuproject.report_mermaid",
    {
      title: "Generate mikuproject Mermaid report",
      description: "Generates a Mermaid report from a mikuproject workbook JSON state.",
      inputSchema: {
        workbookPath: z.string().min(1),
        outputPath: z.string().min(1).optional()
      },
      _meta: {
        contractInputSchema: loadToolInputSchema("mikuproject.report_mermaid")
      }
    },
    async ({ workbookPath, outputPath }) => {
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);
      const reportOutputPath = outputPath || `${workspace.root}/mikuproject/report/project.mmd`;
      ensureParentDirectory(reportOutputPath);
      const runtimeResult = await runRuntimeOperation({
        name: "report_mermaid",
        workbookPath,
        outputPath: reportOutputPath
      });

      return asPersistedTextResult({
        ok: runtimeResult.ok,
        operation: "mikuproject.report_mermaid",
        diagnostics: runtimeResult.diagnostics,
        input: {
          workbookPath,
          outputPath: reportOutputPath
        },
        workspace: {
          root: workspace.root
        },
        artifacts: runtimeResult.ok
          ? [
              {
                role: "report_output",
                uri: "mikuproject://report/mermaid",
                path: reportOutputPath
              }
            ]
          : undefined,
        stdout: runtimeResult.stdout || undefined,
        stderr: runtimeResult.stderr || undefined,
        exitCode: runtimeResult.exitCode
      });
    }
  );
}

function asPersistedTextResult(result: CommonResult) {
  return asTextResult(persistOperationArtifacts(result));
}

function persistOperationArtifacts(result: CommonResult): CommonResult {
  const workspace = resolveWorkspaceConfig();
  ensureWorkspace(workspace);

  const operationId = randomUUID();
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

  const diagnostics = result.diagnostics as Diagnostic[];
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
