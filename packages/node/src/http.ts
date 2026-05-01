#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMikuprojectServer } from "./server/createServer.js";
import { withWorkspaceRoot } from "./workspace/workspace.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_ENDPOINT = "/mcp";
const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;

const config = {
  host: process.env.MIKUPROJECT_MCP_HTTP_HOST ?? DEFAULT_HOST,
  port: parsePort(process.env.MIKUPROJECT_MCP_HTTP_PORT),
  endpoint: process.env.MIKUPROJECT_MCP_HTTP_ENDPOINT ?? DEFAULT_ENDPOINT,
  maxBodyBytes: parsePositiveInteger(
    process.env.MIKUPROJECT_MCP_HTTP_MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES
  ),
  allowedOrigins: parseAllowedOrigins(process.env.MIKUPROJECT_MCP_HTTP_ALLOWED_ORIGINS)
};

const httpServer = createServer(async (request, response) => {
  try {
    await handleHttpRequest(request, response);
  } catch (error) {
    if (error instanceof HttpRequestError) {
      writeJsonRpcError(response, error.statusCode, -32000, error.message);
      return;
    }

    console.error("Unhandled HTTP MCP request error:", error);
    writeJsonRpcError(response, 500, -32603, "Internal server error");
  }
});

httpServer.on("error", (error) => {
  console.error("Failed to start mikuproject-mcp HTTP server:", error);
  process.exit(1);
});

httpServer.listen(config.port, config.host, () => {
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  console.error(`mikuproject-mcp HTTP server listening on http://${config.host}:${port}${config.endpoint}`);
});

process.on("SIGINT", () => {
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  httpServer.close(() => {
    process.exit(0);
  });
});

async function handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${config.host}:${config.port}`}`);

  if (url.pathname !== config.endpoint) {
    writeJson(response, 404, { error: "Not Found" });
    return;
  }

  if (!isAllowedOrigin(request)) {
    writeJsonRpcError(response, 403, -32000, "Forbidden: invalid Origin header");
    return;
  }

  if (request.method === "GET" || request.method === "DELETE") {
    response.setHeader("Allow", "POST");
    writeJsonRpcError(response, 405, -32000, "Method not allowed");
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    writeJsonRpcError(response, 405, -32000, "Method not allowed");
    return;
  }

  const parsedBody = await readJsonBody(request, config.maxBodyBytes);
  const workspaceRoot = mkdtempSync(join(tmpdir(), "mikuproject-mcp-http-"));
  const mcpServer = createMikuprojectServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });
  let closed = false;
  const closeMcpRequest = () => {
    if (closed) {
      return;
    }
    closed = true;
    void transport.close();
    void mcpServer.close();
    rmSync(workspaceRoot, { recursive: true, force: true });
  };

  response.on("finish", closeMcpRequest);
  response.on("close", closeMcpRequest);

  try {
    await mcpServer.connect(transport);
    await withWorkspaceRoot(workspaceRoot, () => transport.handleRequest(request, response, parsedBody));
  } finally {
    if (response.writableEnded) {
      closeMcpRequest();
    }
  }
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const originHeader = request.headers.origin;
  if (!originHeader) {
    return true;
  }

  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (!origin) {
    return true;
  }

  if (config.allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return isLocalHostname(parsed.hostname) && isLocalBindHost(config.host);
  } catch {
    return false;
  }
}

function isLocalBindHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost";
}

function readJsonBody(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let exceededLimit = false;

    request.on("data", (chunk: Buffer) => {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBodyBytes) {
        exceededLimit = true;
        return;
      }
      if (!exceededLimit) {
        chunks.push(chunk);
      }
    });

    request.on("end", () => {
      if (exceededLimit) {
        reject(new HttpRequestError(413, "Request body exceeds configured limit"));
        return;
      }

      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.trim().length === 0) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new HttpRequestError(400, "Invalid JSON request body"));
      }
    });

    request.on("error", reject);
  });
}

class HttpRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function writeJsonRpcError(
  response: ServerResponse,
  statusCode: number,
  code: number,
  message: string
): void {
  writeJson(response, statusCode, {
    jsonrpc: "2.0",
    error: {
      code,
      message
    },
    id: null
  });
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  if (response.headersSent) {
    return;
  }

  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  return parsePositiveInteger(value, DEFAULT_PORT, true);
}

function parsePositiveInteger(value: string | undefined, fallback: number, allowZero = false): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < (allowZero ? 0 : 1)) {
    return fallback;
  }

  return parsed;
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  );
}
