import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type RuntimeConfig = {
  javaJarPath?: string;
  nodeCliPath?: string;
  diagnostics: Array<{
    level: "info" | "warning";
    code: string;
    message: string;
  }>;
};

export function resolveRuntimeConfig(cwd = process.cwd()): RuntimeConfig {
  const configuredJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
  const configuredNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

  const bundledJava = resolve(cwd, "runtime/mikuproject-java/mikuproject.jar");
  const bundledNode = resolve(cwd, "runtime/mikuproject-node/mikuproject.mjs");

  const javaJarPath = configuredJava || (existsSync(bundledJava) ? bundledJava : undefined);
  const nodeCliPath = configuredNode || (existsSync(bundledNode) ? bundledNode : undefined);

  const diagnostics: RuntimeConfig["diagnostics"] = [];

  if (configuredJava) {
    diagnostics.push({
      level: "info",
      code: "configured_java_runtime",
      message: "Using Java runtime path from MIKUPROJECT_MCP_RUNTIME_JAVA."
    });
  }

  if (configuredNode) {
    diagnostics.push({
      level: "info",
      code: "configured_node_runtime",
      message: "Using Node.js runtime path from MIKUPROJECT_MCP_RUNTIME_NODE."
    });
  }

  if (!javaJarPath && !nodeCliPath) {
    diagnostics.push({
      level: "warning",
      code: "runtime_artifact_not_found",
      message: "No mikuproject runtime artifact was found under runtime/ or environment configuration."
    });
  }

  return {
    javaJarPath,
    nodeCliPath,
    diagnostics
  };
}
