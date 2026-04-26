import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asTextResult } from "../results/commonResult.js";
import { resolveRuntimeConfig } from "../runtime/runtimeConfig.js";
import { ensureWorkspace, resolveWorkspaceConfig } from "../workspace/workspace.js";

export function registerMikuprojectTools(server: McpServer): void {
  server.tool("mikuproject.ai_spec", {}, async () => {
    const runtime = resolveRuntimeConfig();

    return asTextResult({
      ok: true,
      operation: "mikuproject.ai_spec",
      diagnostics: [
        ...runtime.diagnostics,
        {
          level: "warning",
          code: "not_connected_to_upstream_runtime",
          message: "Initial MCP skeleton is not yet connected to the upstream mikuproject runtime."
        }
      ],
      artifacts: [
        {
          role: "ai_spec",
          uri: "mikuproject://spec/ai-json"
        }
      ]
    });
  });

  server.tool(
    "mikuproject.detect_kind",
    {
      path: z.string().min(1)
    },
    async ({ path }) => {
      const runtime = resolveRuntimeConfig();

      return asTextResult({
        ok: false,
        operation: "mikuproject.detect_kind",
        diagnostics: [
          ...runtime.diagnostics,
          {
            level: "error",
            code: "upstream_runtime_not_configured",
            message: "Document kind detection requires the upstream mikuproject runtime adapter."
          }
        ],
        input: {
          path
        }
      });
    }
  );

  server.tool(
    "mikuproject.state_from_draft",
    {
      draftPath: z.string().min(1),
      outputPath: z.string().min(1).optional()
    },
    async ({ draftPath, outputPath }) => {
      const runtime = resolveRuntimeConfig();
      const workspace = resolveWorkspaceConfig();
      ensureWorkspace(workspace);

      return asTextResult({
        ok: false,
        operation: "mikuproject.state_from_draft",
        diagnostics: [
          ...runtime.diagnostics,
          {
            level: "error",
            code: "upstream_runtime_not_configured",
            message: "State creation requires the upstream mikuproject runtime adapter."
          }
        ],
        input: {
          draftPath,
          outputPath
        },
        workspace: {
          root: workspace.root
        }
      });
    }
  );
}
