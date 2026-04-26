import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { errorCategories } from "../results/errorCategories.js";
import { runRuntimeOperation } from "../runtime/runtimeOperation.js";

describe("error categories", () => {
  it("uses the shared upstream runtime failure category when no runtime is configured", async () => {
    const previousJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    const previousNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    delete process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
    delete process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

    try {
      const result = await runRuntimeOperation(
        {
          name: "ai_spec"
        },
        "/tmp/mikuproject-mcp-no-runtime"
      );

      assert.equal(result.ok, false);
      assert.equal(result.diagnostics.at(-1)?.code, errorCategories.upstreamRuntimeFailure);
    } finally {
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_JAVA", previousJava);
      restoreEnv("MIKUPROJECT_MCP_RUNTIME_NODE", previousNode);
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
