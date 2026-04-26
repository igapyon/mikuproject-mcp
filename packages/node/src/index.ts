#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMikuprojectServer } from "./server/createServer.js";

const server = createMikuprojectServer();
const transport = new StdioServerTransport();

await server.connect(transport);
