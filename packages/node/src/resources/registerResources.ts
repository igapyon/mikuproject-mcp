import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadInitialToolInputSchemas } from "../contract/toolSchemas.js";
import { runRuntimeOperation } from "../runtime/runtimeOperation.js";
import { resolveWorkspaceConfig } from "../workspace/workspace.js";

const aiSpecUri = "mikuproject://spec/ai-json";
const currentStateUri = "mikuproject://state/current";

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

  server.registerResource(
    "mikuproject.state_current",
    currentStateUri,
    {
      title: "Current mikuproject workbook state",
      description: "Current workbook JSON state in the configured mikuproject MCP workspace.",
      mimeType: "application/json"
    },
    async () => readStateResource(currentStateUri, currentStatePath())
  );

  server.registerResource(
    "mikuproject.state_saved",
    new ResourceTemplate("mikuproject://state/{name}", { list: undefined }),
    {
      title: "Saved mikuproject workbook state",
      description: "Saved workbook JSON state in the configured mikuproject MCP workspace.",
      mimeType: "application/json"
    },
    async (uri, variables) => {
      const name = String(variables.name || "");
      const statePath = savedStatePath(name);

      if (!statePath) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  ok: false,
                  diagnostics: [
                    {
                      level: "error",
                      code: "invalid_state_resource_name",
                      message: "State resource names may contain only letters, numbers, dots, underscores, and hyphens."
                    }
                  ]
                },
                null,
                2
              )
            }
          ]
        };
      }

      return readStateResource(uri.href, statePath);
    }
  );

  server.registerResource(
    "mikuproject.export_workbook_json",
    "mikuproject://export/workbook-json",
    {
      title: "Exported mikuproject workbook JSON",
      description: "Exported workbook JSON artifact in the configured mikuproject MCP workspace.",
      mimeType: "application/json"
    },
    async () => readJsonResource("mikuproject://export/workbook-json", exportPath("workbook.json"), "export_artifact_not_found", "export artifact")
  );

  server.registerResource(
    "mikuproject.export_project_xml",
    "mikuproject://export/project-xml",
    {
      title: "Exported mikuproject MS Project XML",
      description: "Exported MS Project XML artifact in the configured mikuproject MCP workspace.",
      mimeType: "application/xml"
    },
    async () => readJsonResource("mikuproject://export/project-xml", exportPath("project.xml"), "export_artifact_not_found", "export artifact")
  );

  server.registerResource(
    "mikuproject.export_project_xlsx",
    "mikuproject://export/project-xlsx",
    {
      title: "Exported mikuproject XLSX",
      description: "Exported XLSX artifact in the configured mikuproject MCP workspace.",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    },
    async () => readBlobResource("mikuproject://export/project-xlsx", exportPath("project.xlsx"), "export_artifact_not_found", "export artifact")
  );

  server.registerResource(
    "mikuproject.report_wbs_markdown",
    "mikuproject://report/wbs-markdown",
    {
      title: "mikuproject WBS Markdown report",
      description: "Generated WBS Markdown report in the configured mikuproject MCP workspace.",
      mimeType: "text/markdown"
    },
    async () => readJsonResource("mikuproject://report/wbs-markdown", reportPath("wbs.md"), "report_artifact_not_found", "report artifact")
  );

  server.registerResource(
    "mikuproject.report_mermaid",
    "mikuproject://report/mermaid",
    {
      title: "mikuproject Mermaid report",
      description: "Generated Mermaid report in the configured mikuproject MCP workspace.",
      mimeType: "text/plain"
    },
    async () => readJsonResource("mikuproject://report/mermaid", reportPath("project.mmd"), "report_artifact_not_found", "report artifact")
  );

  server.registerResource(
    "mikuproject.operation_summary",
    new ResourceTemplate("mikuproject://summary/{operationId}", { list: undefined }),
    {
      title: "mikuproject operation summary",
      description: "Saved operation summary in the configured mikuproject MCP workspace.",
      mimeType: "application/json"
    },
    async (uri, variables) => {
      const operationId = String(variables.operationId || "");
      const summaryPath = operationArtifactPath("summary", operationId);

      if (!summaryPath) {
        return invalidOperationResourceName(uri.href);
      }

      return readJsonResource(uri.href, summaryPath, "operation_summary_not_found", "operation summary");
    }
  );

  server.registerResource(
    "mikuproject.diagnostics",
    new ResourceTemplate("mikuproject://diagnostics/{operationId}", { list: undefined }),
    {
      title: "mikuproject diagnostics log",
      description: "Saved diagnostics log in the configured mikuproject MCP workspace.",
      mimeType: "application/json"
    },
    async (uri, variables) => {
      const operationId = String(variables.operationId || "");
      const diagnosticsPath = operationArtifactPath("diagnostics", operationId);

      if (!diagnosticsPath) {
        return invalidOperationResourceName(uri.href);
      }

      return readJsonResource(uri.href, diagnosticsPath, "diagnostics_log_not_found", "diagnostics log");
    }
  );
}

function currentStatePath(): string {
  return join(resolveWorkspaceConfig().root, "mikuproject", "state", "current-workbook.json");
}

function savedStatePath(name: string): string | undefined {
  if (!isSafeResourceName(name)) {
    return undefined;
  }

  const fileName = name.endsWith(".json") ? name : `${name}.json`;
  return join(resolveWorkspaceConfig().root, "mikuproject", "state", fileName);
}

function readStateResource(uri: string, path: string) {
  return readJsonResource(uri, path, "state_resource_not_found", "mikuproject workbook state");
}

function exportPath(fileName: string): string {
  return join(resolveWorkspaceConfig().root, "mikuproject", "export", fileName);
}

function reportPath(fileName: string): string {
  return join(resolveWorkspaceConfig().root, "mikuproject", "report", fileName);
}

function operationArtifactPath(kind: "summary" | "diagnostics", operationId: string): string | undefined {
  if (!isSafeResourceName(operationId)) {
    return undefined;
  }

  const fileName = operationId.endsWith(".json") ? operationId : `${operationId}.json`;
  return join(resolveWorkspaceConfig().root, "mikuproject", kind, fileName);
}

function isSafeResourceName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name);
}

function invalidOperationResourceName(uri: string) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            ok: false,
            diagnostics: [
              {
                level: "error",
                code: "invalid_operation_resource_name",
                message: "Operation resource names may contain only letters, numbers, dots, underscores, and hyphens."
              }
            ]
          },
          null,
          2
        )
      }
    ]
  };
}

function readJsonResource(uri: string, path: string, notFoundCode: string, artifactLabel: string) {
  if (!existsSync(path)) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              ok: false,
              diagnostics: [
                {
                  level: "error",
                  code: notFoundCode,
                  message: `No mikuproject ${artifactLabel} exists at ${path}.`
                }
              ]
            },
            null,
            2
          )
        }
      ]
    };
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: readFileSync(path, "utf8")
      }
    ]
  };
}

function readBlobResource(uri: string, path: string, notFoundCode: string, artifactLabel: string) {
  if (!existsSync(path)) {
    return readJsonResource(uri, path, notFoundCode, artifactLabel);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/octet-stream",
        blob: readFileSync(path).toString("base64")
      }
    ]
  };
}
