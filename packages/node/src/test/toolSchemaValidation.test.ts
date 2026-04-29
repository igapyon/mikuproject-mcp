import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";
import { loadInitialToolInputSchemas, type ContractToolName } from "../contract/toolSchemas.js";

const validSamples: Record<ContractToolName, Record<string, unknown>> = {
  "mikuproject.version": {},
  "mikuproject.ai_spec": {},
  "mikuproject.ai_detect_kind": {
    path: "document.json"
  },
  "mikuproject.state_from_draft": {
    draftPath: "draft.editjson"
  },
  "mikuproject.ai_export_project_overview": {
    workbookPath: "workbook.json"
  },
  "mikuproject.ai_export_bundle": {
    workbookPath: "workbook.json"
  },
  "mikuproject.ai_export_task_edit": {
    workbookPath: "workbook.json",
    taskUid: "123"
  },
  "mikuproject.ai_export_phase_detail": {
    workbookPath: "workbook.json",
    phaseUid: "100",
    mode: "scoped",
    rootTaskUid: "123",
    maxDepth: 2
  },
  "mikuproject.ai_validate_patch": {
    statePath: "workbook.json",
    patchPath: "patch.editjson"
  },
  "mikuproject.state_apply_patch": {
    statePath: "workbook.json",
    patchPath: "patch.editjson"
  },
  "mikuproject.state_diff": {
    beforePath: "workbook-before.json",
    afterPath: "workbook-after.json"
  },
  "mikuproject.state_summarize": {
    workbookPath: "workbook.json"
  },
  "mikuproject.export_workbook_json": {
    workbookPath: "workbook.json"
  },
  "mikuproject.export_xml": {
    workbookPath: "workbook.json"
  },
  "mikuproject.export_xlsx": {
    workbookPath: "workbook.json"
  },
  "mikuproject.import_xlsx": {
    inputPath: "project.xlsx"
  },
  "mikuproject.report_wbs_xlsx": {
    workbookPath: "workbook.json"
  },
  "mikuproject.report_daily_svg": {
    workbookPath: "workbook.json"
  },
  "mikuproject.report_weekly_svg": {
    workbookPath: "workbook.json"
  },
  "mikuproject.report_monthly_calendar_svg": {
    workbookPath: "workbook.json"
  },
  "mikuproject.report_all": {
    workbookPath: "workbook.json"
  },
  "mikuproject.report_wbs_markdown": {
    workbookPath: "workbook.json"
  },
  "mikuproject.report_mermaid": {
    workbookPath: "workbook.json"
  }
};

describe("tool input JSON Schemas", () => {
  it("are valid JSON Schema documents and accept representative inputs", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const schemas = loadInitialToolInputSchemas();

    for (const [toolName, schema] of Object.entries(schemas) as Array<[ContractToolName, Record<string, unknown>]>) {
      assert.equal(ajv.validateSchema(schema), true, `${toolName} schema should be valid`);

      const validate = ajv.compile(schema);
      assert.equal(validate(validSamples[toolName]), true, `${toolName} should accept its representative input`);
    }
  });

  it("rejects undeclared properties for every tool input", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const schemas = loadInitialToolInputSchemas();

    for (const [toolName, schema] of Object.entries(schemas) as Array<[ContractToolName, Record<string, unknown>]>) {
      const validate = ajv.compile(schema);
      const input = {
        ...validSamples[toolName],
        unexpectedProperty: true
      };

      assert.equal(validate(input), false, `${toolName} should reject additional properties`);
    }
  });
});
