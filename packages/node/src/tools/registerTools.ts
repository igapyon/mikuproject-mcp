import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadToolInputSchema } from "../contract/toolSchemas.js";
import { asTextResult } from "../results/commonResult.js";
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

    return asTextResult({
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

      return asTextResult({
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

      return asTextResult({
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

      return asTextResult({
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

      return asTextResult({
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

      return asTextResult({
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

      return asTextResult({
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
}
