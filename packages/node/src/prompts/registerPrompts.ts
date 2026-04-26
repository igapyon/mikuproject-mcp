import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMikuprojectPrompts(server: McpServer): void {
  server.registerPrompt(
    "mikuproject.create_project_draft",
    {
      title: "Create mikuproject draft",
      description: "Draft a mikuproject project_draft_view from user requirements.",
      argsSchema: {
        requirements: z.string().min(1)
      }
    },
    ({ requirements }) => ({
      description: "Create a mikuproject draft document using the AI specification resource.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Use mikuproject semantics to create a project draft document.",
              "Read mikuproject://spec/ai-json before choosing field names or artifact roles.",
              "Return a draft document suitable for mikuproject.state_from_draft.",
              "",
              "Requirements:",
              requirements
            ].join("\n")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "mikuproject.revise_state_with_patch",
    {
      title: "Revise mikuproject state",
      description: "Revise an existing workbook state through projection, patch, validation, and apply tools.",
      argsSchema: {
        stateUri: z.string().min(1),
        changeRequest: z.string().min(1)
      }
    },
    ({ stateUri, changeRequest }) => ({
      description: "Revise a mikuproject workbook state without editing the full state directly.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Use the mikuproject patch workflow for this change.",
              "Read mikuproject://spec/ai-json and the relevant state/projection resource first.",
              "Create a patch document, validate it with mikuproject.ai_validate_patch, then apply it with mikuproject.state_apply_patch.",
              "Preserve diagnostics and artifact roles in the result.",
              "",
              `State resource or path: ${stateUri}`,
              "",
              "Change request:",
              changeRequest
            ].join("\n")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "mikuproject.review_artifact_diagnostics",
    {
      title: "Review mikuproject diagnostics",
      description: "Review a mikuproject artifact using saved operation diagnostics.",
      argsSchema: {
        artifactUri: z.string().min(1),
        diagnosticsUri: z.string().min(1).optional()
      }
    },
    ({ artifactUri, diagnosticsUri }) => ({
      description: "Review a mikuproject artifact and summarize actionable diagnostics.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Review this mikuproject artifact using product diagnostics and artifact-role discipline.",
              "Read mikuproject://spec/ai-json before making product-specific claims.",
              "Report hard errors, warnings, generated artifacts, and any unsupported or ambiguous areas.",
              "",
              `Artifact resource or path: ${artifactUri}`,
              diagnosticsUri ? `Diagnostics resource: ${diagnosticsUri}` : "Diagnostics resource: use the relevant mikuproject://diagnostics/{operationId} resource when available."
            ].join("\n")
          }
        }
      ]
    })
  );
}
