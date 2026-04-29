import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";
import { contractPath } from "../contract/contractPaths.js";
import { loadJsonFile } from "../contract/loadJson.js";
import type { CommonResult } from "../results/commonResult.js";

describe("common result JSON Schema", () => {
  it("accepts representative MCP tool results", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const schema = loadJsonFile<Record<string, unknown>>(contractPath("results", "common-result.schema.json"));
    const validate = ajv.compile(schema);
    const result: CommonResult = {
      ok: true,
      operation: "mikuproject_state_from_draft",
      diagnostics: [
        {
          level: "info",
          code: "runtime_operation_succeeded",
          message: "Executed mikuproject runtime."
        }
      ],
      artifacts: [
        {
          role: "workbook_state",
          uri: "mikuproject://state/current",
          path: "/tmp/workbook.json"
        }
      ],
      stdout: "",
      exitCode: 0
    };

    assert.equal(ajv.validateSchema(schema), true);
    assert.equal(validate(result), true, ajv.errorsText(validate.errors));
  });

  it("rejects results without diagnostics", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const schema = loadJsonFile<Record<string, unknown>>(contractPath("results", "common-result.schema.json"));
    const validate = ajv.compile(schema);

    assert.equal(
      validate({
        ok: true,
        operation: "mikuproject_ai_spec"
      }),
      false
    );
  });
});
