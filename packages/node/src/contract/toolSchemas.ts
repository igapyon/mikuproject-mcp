import { contractPath } from "./contractPaths.js";
import { loadJsonFile } from "./loadJson.js";

export type JsonSchema = Record<string, unknown>;

const toolSchemaFiles = {
  "mikuproject_version": "mikuproject_version.input.schema.json",
  "mikuproject_ai_spec": "mikuproject_ai_spec.input.schema.json",
  "mikuproject_ai_detect_kind": "mikuproject_ai_detect_kind.input.schema.json",
  "mikuproject_state_from_draft": "mikuproject_state_from_draft.input.schema.json",
  "mikuproject_ai_export_project_overview": "mikuproject_ai_export_project_overview.input.schema.json",
  "mikuproject_ai_export_bundle": "mikuproject_ai_export_bundle.input.schema.json",
  "mikuproject_ai_export_task_edit": "mikuproject_ai_export_task_edit.input.schema.json",
  "mikuproject_ai_export_phase_detail": "mikuproject_ai_export_phase_detail.input.schema.json",
  "mikuproject_ai_validate_patch": "mikuproject_ai_validate_patch.input.schema.json",
  "mikuproject_state_apply_patch": "mikuproject_state_apply_patch.input.schema.json",
  "mikuproject_state_diff": "mikuproject_state_diff.input.schema.json",
  "mikuproject_state_summarize": "mikuproject_state_summarize.input.schema.json",
  "mikuproject_export_workbook_json": "mikuproject_export_workbook_json.input.schema.json",
  "mikuproject_export_xml": "mikuproject_export_xml.input.schema.json",
  "mikuproject_export_xlsx": "mikuproject_export_xlsx.input.schema.json",
  "mikuproject_import_xlsx": "mikuproject_import_xlsx.input.schema.json",
  "mikuproject_report_wbs_xlsx": "mikuproject_report_wbs_xlsx.input.schema.json",
  "mikuproject_report_daily_svg": "mikuproject_report_daily_svg.input.schema.json",
  "mikuproject_report_weekly_svg": "mikuproject_report_weekly_svg.input.schema.json",
  "mikuproject_report_monthly_calendar_svg": "mikuproject_report_monthly_calendar_svg.input.schema.json",
  "mikuproject_report_all": "mikuproject_report_all.input.schema.json",
  "mikuproject_report_wbs_markdown": "mikuproject_report_wbs_markdown.input.schema.json",
  "mikuproject_report_mermaid": "mikuproject_report_mermaid.input.schema.json"
} as const;

export type ContractToolName = keyof typeof toolSchemaFiles;

export function loadToolInputSchema(toolName: ContractToolName): JsonSchema {
  return loadJsonFile<JsonSchema>(contractPath("tools", toolSchemaFiles[toolName]));
}

export function loadInitialToolInputSchemas(): Record<ContractToolName, JsonSchema> {
  return {
    "mikuproject_version": loadToolInputSchema("mikuproject_version"),
    "mikuproject_ai_spec": loadToolInputSchema("mikuproject_ai_spec"),
    "mikuproject_ai_detect_kind": loadToolInputSchema("mikuproject_ai_detect_kind"),
    "mikuproject_state_from_draft": loadToolInputSchema("mikuproject_state_from_draft"),
    "mikuproject_ai_export_project_overview": loadToolInputSchema("mikuproject_ai_export_project_overview"),
    "mikuproject_ai_export_bundle": loadToolInputSchema("mikuproject_ai_export_bundle"),
    "mikuproject_ai_export_task_edit": loadToolInputSchema("mikuproject_ai_export_task_edit"),
    "mikuproject_ai_export_phase_detail": loadToolInputSchema("mikuproject_ai_export_phase_detail"),
    "mikuproject_ai_validate_patch": loadToolInputSchema("mikuproject_ai_validate_patch"),
    "mikuproject_state_apply_patch": loadToolInputSchema("mikuproject_state_apply_patch"),
    "mikuproject_state_diff": loadToolInputSchema("mikuproject_state_diff"),
    "mikuproject_state_summarize": loadToolInputSchema("mikuproject_state_summarize"),
    "mikuproject_export_workbook_json": loadToolInputSchema("mikuproject_export_workbook_json"),
    "mikuproject_export_xml": loadToolInputSchema("mikuproject_export_xml"),
    "mikuproject_export_xlsx": loadToolInputSchema("mikuproject_export_xlsx"),
    "mikuproject_import_xlsx": loadToolInputSchema("mikuproject_import_xlsx"),
    "mikuproject_report_wbs_xlsx": loadToolInputSchema("mikuproject_report_wbs_xlsx"),
    "mikuproject_report_daily_svg": loadToolInputSchema("mikuproject_report_daily_svg"),
    "mikuproject_report_weekly_svg": loadToolInputSchema("mikuproject_report_weekly_svg"),
    "mikuproject_report_monthly_calendar_svg": loadToolInputSchema("mikuproject_report_monthly_calendar_svg"),
    "mikuproject_report_all": loadToolInputSchema("mikuproject_report_all"),
    "mikuproject_report_wbs_markdown": loadToolInputSchema("mikuproject_report_wbs_markdown"),
    "mikuproject_report_mermaid": loadToolInputSchema("mikuproject_report_mermaid")
  };
}
