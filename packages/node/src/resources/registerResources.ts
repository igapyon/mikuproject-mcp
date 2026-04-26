import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadInitialToolInputSchemas } from "../contract/toolSchemas.js";
import { runRuntimeOperation } from "../runtime/runtimeOperation.js";

const aiSpecUri = "mikuproject://spec/ai-json";

export function registerMikuprojectResources(server: McpServer): void {
  server.registerResource(
    "mikuproject.ai_spec",
    aiSpecUri,
    {
      title: "mikuproject AI-facing specification",
      description: "Initial MCP-facing AI specification resource for mikuproject.",
      mimeType: "application/json"
    },
    async () => {
      const runtimeResult = await runRuntimeOperation({
        name: "ai_spec"
      });

      if (runtimeResult.ok && runtimeResult.stdout.trim().length > 0) {
        return {
          contents: [
            {
              uri: aiSpecUri,
              mimeType: "text/markdown",
              text: runtimeResult.stdout
            }
          ]
        };
      }

      const spec = {
        product: "mikuproject",
        artifactRoles: {
          semanticBase: "MS Project XML",
          mcpStateHandoff: "mikuproject_workbook_json"
        },
        coreTools: Object.keys(loadInitialToolInputSchemas()),
        diagnostics: runtimeResult.diagnostics,
        note: "Initial MCP skeleton resource. Upstream runtime AI specification is not connected yet."
      };

      return {
        contents: [
          {
            uri: aiSpecUri,
            mimeType: "application/json",
            text: JSON.stringify(spec, null, 2)
          }
        ]
      };
    }
  );
}
