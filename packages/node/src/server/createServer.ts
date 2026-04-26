import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMikuprojectResources } from "../resources/registerResources.js";
import { registerMikuprojectTools } from "../tools/registerTools.js";

export function createMikuprojectServer(): McpServer {
  const server = new McpServer({
    name: "mikuproject-mcp",
    version: "0.0.0"
  });

  registerMikuprojectResources(server);
  registerMikuprojectTools(server);

  return server;
}
