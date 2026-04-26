import { contractPath } from "./contractPaths.js";
import { loadJsonFile } from "./loadJson.js";

export type JsonSchema = Record<string, unknown>;

const toolSchemaFiles = {
  "mikuproject.ai_spec": "mikuproject.ai_spec.input.schema.json",
  "mikuproject.ai_detect_kind": "mikuproject.ai_detect_kind.input.schema.json",
  "mikuproject.state_from_draft": "mikuproject.state_from_draft.input.schema.json",
  "mikuproject.ai_export_project_overview": "mikuproject.ai_export_project_overview.input.schema.json",
  "mikuproject.ai_export_task_edit": "mikuproject.ai_export_task_edit.input.schema.json",
  "mikuproject.ai_export_phase_detail": "mikuproject.ai_export_phase_detail.input.schema.json",
  "mikuproject.ai_validate_patch": "mikuproject.ai_validate_patch.input.schema.json",
  "mikuproject.state_apply_patch": "mikuproject.state_apply_patch.input.schema.json"
} as const;

export type ContractToolName = keyof typeof toolSchemaFiles;

export function loadToolInputSchema(toolName: ContractToolName): JsonSchema {
  return loadJsonFile<JsonSchema>(contractPath("tools", toolSchemaFiles[toolName]));
}

export function loadInitialToolInputSchemas(): Record<ContractToolName, JsonSchema> {
  return {
    "mikuproject.ai_spec": loadToolInputSchema("mikuproject.ai_spec"),
    "mikuproject.ai_detect_kind": loadToolInputSchema("mikuproject.ai_detect_kind"),
    "mikuproject.state_from_draft": loadToolInputSchema("mikuproject.state_from_draft"),
    "mikuproject.ai_export_project_overview": loadToolInputSchema("mikuproject.ai_export_project_overview"),
    "mikuproject.ai_export_task_edit": loadToolInputSchema("mikuproject.ai_export_task_edit"),
    "mikuproject.ai_export_phase_detail": loadToolInputSchema("mikuproject.ai_export_phase_detail"),
    "mikuproject.ai_validate_patch": loadToolInputSchema("mikuproject.ai_validate_patch"),
    "mikuproject.state_apply_patch": loadToolInputSchema("mikuproject.state_apply_patch")
  };
}
