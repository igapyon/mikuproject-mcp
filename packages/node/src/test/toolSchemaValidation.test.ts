import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";
import { loadInitialToolInputSchemas, type ContractToolName } from "../contract/toolSchemas.js";

const validSamples: Record<ContractToolName, Record<string, unknown>> = {
  "mikuproject_version": {},
  "mikuproject_ai_spec": {},
  "mikuproject_ai_detect_kind": {
    path: "document.json"
  },
  "mikuproject_state_from_draft": {
    draftPath: "draft.editjson"
  },
  "mikuproject_ai_export_project_overview": {
    workbookPath: "workbook.json"
  },
  "mikuproject_ai_export_bundle": {
    workbookPath: "workbook.json"
  },
  "mikuproject_ai_export_task_edit": {
    workbookPath: "workbook.json",
    taskUid: "123"
  },
  "mikuproject_ai_export_phase_detail": {
    workbookPath: "workbook.json",
    phaseUid: "100",
    mode: "scoped",
    rootTaskUid: "123",
    maxDepth: 2
  },
  "mikuproject_ai_validate_patch": {
    statePath: "workbook.json",
    patchPath: "patch.editjson"
  },
  "mikuproject_state_apply_patch": {
    statePath: "workbook.json",
    patchPath: "patch.editjson"
  },
  "mikuproject_state_diff": {
    beforePath: "workbook-before.json",
    afterPath: "workbook-after.json"
  },
  "mikuproject_state_summarize": {
    workbookPath: "workbook.json"
  },
  "mikuproject_export_workbook_json": {
    workbookPath: "workbook.json"
  },
  "mikuproject_export_xml": {
    workbookPath: "workbook.json"
  },
  "mikuproject_export_xlsx": {
    workbookPath: "workbook.json"
  },
  "mikuproject_import_xlsx": {
    inputPath: "project.xlsx"
  },
  "mikuproject_report_wbs_xlsx": {
    workbookPath: "workbook.json"
  },
  "mikuproject_report_daily_svg": {
    workbookPath: "workbook.json"
  },
  "mikuproject_report_weekly_svg": {
    workbookPath: "workbook.json"
  },
  "mikuproject_report_monthly_calendar_svg": {
    workbookPath: "workbook.json"
  },
  "mikuproject_report_all": {
    workbookPath: "workbook.json"
  },
  "mikuproject_report_wbs_markdown": {
    workbookPath: "workbook.json"
  },
  "mikuproject_report_mermaid": {
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

  it("accepts inline content alternatives and rejects conflicting input modes", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const schemas = loadInitialToolInputSchemas();

    const draft = ajv.compile(schemas.mikuproject_state_from_draft);
    assert.equal(
      draft({
        draftContent: "{\"project\":{\"name\":\"inline\"}}",
        outputMode: "content"
      }),
      true,
      "draft content mode should be valid"
    );
    assert.equal(
      draft({
        draftPath: "draft.editjson",
        draftContent: "{\"project\":{\"name\":\"inline\"}}"
      }),
      false,
      "draft path and content should be mutually exclusive"
    );
    assert.equal(
      draft({
        draftContent: "{\"project\":{\"name\":\"inline\"}}",
        outputPath: "workbook.json",
        outputMode: "content"
      }),
      false,
      "content output mode should not accept outputPath"
    );

    const xlsxImport = ajv.compile(schemas.mikuproject_import_xlsx);
    assert.equal(
      xlsxImport({
        inputBase64: "UEsDBAo=",
        outputMode: "content"
      }),
      true,
      "XLSX Base64 input mode should be valid"
    );
    assert.equal(
      xlsxImport({
        inputPath: "project.xlsx",
        inputBase64: "UEsDBAo="
      }),
      false,
      "XLSX path and Base64 content should be mutually exclusive"
    );

    const xlsxExport = ajv.compile(schemas.mikuproject_export_xlsx);
    assert.equal(
      xlsxExport({
        workbookContent: "{\"project\":{\"name\":\"inline\"}}",
        outputMode: "base64"
      }),
      true,
      "binary Base64 output mode should be valid"
    );
    assert.equal(
      xlsxExport({
        workbookContent: "{\"project\":{\"name\":\"inline\"}}",
        outputPath: "project.xlsx",
        outputMode: "base64"
      }),
      false,
      "Base64 output mode should not accept outputPath"
    );

    const validatePatch = ajv.compile(schemas.mikuproject_ai_validate_patch);
    assert.equal(
      validatePatch({
        stateContent: "{\"kind\":\"mikuproject_workbook_json\"}",
        patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}"
      }),
      true,
      "inline state and patch content should be valid for validation"
    );
    assert.equal(
      validatePatch({
        statePath: "workbook.json",
        stateContent: "{\"kind\":\"mikuproject_workbook_json\"}",
        patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}"
      }),
      false,
      "state path and content should be mutually exclusive"
    );
    assert.equal(
      validatePatch({
        statePath: "workbook.json",
        patchPath: "patch.editjson",
        patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}"
      }),
      false,
      "patch path and content should be mutually exclusive"
    );

    const applyPatch = ajv.compile(schemas.mikuproject_state_apply_patch);
    assert.equal(
      applyPatch({
        stateContent: "{\"kind\":\"mikuproject_workbook_json\"}",
        patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}",
        outputMode: "content"
      }),
      true,
      "inline state, inline patch, and content output should be valid for apply"
    );
    assert.equal(
      applyPatch({
        stateContent: "{\"kind\":\"mikuproject_workbook_json\"}",
        patchContent: "{\"kind\":\"patch_json\",\"operations\":[]}",
        outputPath: "next-workbook.json",
        outputMode: "content"
      }),
      false,
      "apply content output mode should not accept outputPath"
    );
  });
});
