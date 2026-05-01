#!/usr/bin/env node
import { createServer, type IncomingMessage, type OutgoingHttpHeader, type OutgoingHttpHeaders, type ServerResponse } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMikuprojectServer } from "./server/createServer.js";
import { withInlineOperationArtifacts, withWorkspaceRoot } from "./workspace/workspace.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_ENDPOINT = "/mcp";
const DEFAULT_MAX_BODY_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = DEFAULT_MAX_BODY_BYTES;

const config = {
  host: process.env.MIKUPROJECT_MCP_HTTP_HOST ?? DEFAULT_HOST,
  port: parsePort(process.env.MIKUPROJECT_MCP_HTTP_PORT),
  endpoint: process.env.MIKUPROJECT_MCP_HTTP_ENDPOINT ?? DEFAULT_ENDPOINT,
  maxBodyBytes: parsePositiveInteger(
    process.env.MIKUPROJECT_MCP_HTTP_MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES
  ),
  maxResponseBytes: parsePositiveInteger(
    process.env.MIKUPROJECT_MCP_HTTP_MAX_RESPONSE_BYTES,
    DEFAULT_MAX_RESPONSE_BYTES
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
  applyResponseSizeLimit(response, config.maxResponseBytes);

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
  validateHttpToolRequest(parsedBody);
  const inlineOnlyRequest = isInlineOnlyToolRequest(parsedBody);
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
    if (workspaceRoot) {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  };

  response.on("finish", closeMcpRequest);
  response.on("close", closeMcpRequest);

  try {
    await mcpServer.connect(transport);
    await withWorkspaceRoot(workspaceRoot, () =>
      inlineOnlyRequest
        ? withInlineOperationArtifacts(() => transport.handleRequest(request, response, parsedBody))
        : transport.handleRequest(request, response, parsedBody)
    );
  } finally {
    if (response.writableEnded) {
      closeMcpRequest();
    }
  }
}

function isInlineOnlyToolRequest(body: unknown): boolean {
  if (!isJsonRpcRequestObject(body)) {
    return false;
  }

  if (body.method !== "tools/call") {
    return false;
  }

  const params = body.params;
  if (!isRecord(params)) {
    return false;
  }

  const args = params.arguments;
  if (!isRecord(args)) {
    return false;
  }

  if (typeof args.outputPath === "string" && args.outputPath.length > 0) {
    return false;
  }

  const outputMode = args.outputMode;
  if (outputMode === "content" || outputMode === "base64") {
    return true;
  }

  return (
    typeof args.content === "string" ||
    typeof args.patchContent === "string" ||
    typeof args.stateContent === "string" ||
    typeof args.draftContent === "string" ||
    typeof args.workbookContent === "string" ||
    typeof args.inputBase64 === "string"
  );
}

const HTTP_FORBIDDEN_PATH_ARGUMENTS = new Set([
  "path",
  "draftPath",
  "workbookPath",
  "statePath",
  "patchPath",
  "beforePath",
  "afterPath",
  "inputPath",
  "outputPath"
]);

function validateHttpToolRequest(body: unknown): void {
  if (!isJsonRpcRequestObject(body) || body.method !== "tools/call") {
    return;
  }

  const params = body.params;
  if (!isRecord(params)) {
    return;
  }

  const args = params.arguments;
  if (!isRecord(args)) {
    return;
  }

  for (const key of Object.keys(args)) {
    if (HTTP_FORBIDDEN_PATH_ARGUMENTS.has(key)) {
      throw new HttpRequestError(400, `HTTP tools/call does not accept host path argument: ${key}`);
    }
  }
}

function isJsonRpcRequestObject(value: unknown): value is { method?: unknown; params?: unknown } {
  return isRecord(value) && typeof value.method === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function applyResponseSizeLimit(response: ServerResponse, maxResponseBytes: number): void {
  const originalEnd = response.end.bind(response);
  const originalWriteHead = response.writeHead.bind(response);
  const chunks: Buffer[] = [];
  let bufferedBytes = 0;
  type WriteHeadHeaders = OutgoingHttpHeaders | OutgoingHttpHeader[];
  let pendingStatusCode: number | undefined;
  let exceededLimit = false;
  let ended = false;

  response.writeHead = ((statusCode: number, statusMessageOrHeaders?: string | WriteHeadHeaders, headers?: WriteHeadHeaders) => {
    pendingStatusCode = statusCode;
    if (typeof statusMessageOrHeaders === "string") {
      response.statusMessage = statusMessageOrHeaders;
      applyWriteHeadHeaders(response, headers);
    } else {
      applyWriteHeadHeaders(response, statusMessageOrHeaders);
    }
    response.statusCode = statusCode;
    return response;
  }) as ServerResponse["writeHead"];

  response.write = ((chunk: unknown, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) => {
    if (ended) {
      return false;
    }

    const buffer = toResponseBuffer(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : undefined);
    bufferedBytes += buffer.byteLength;
    if (bufferedBytes > maxResponseBytes) {
      exceededLimit = true;
      ended = true;
      sendResponseLimitError(response, originalWriteHead, originalEnd);
    } else {
      chunks.push(buffer);
    }

    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (done) {
      process.nextTick(done);
    }
    return !exceededLimit;
  }) as ServerResponse["write"];

  response.end = ((chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) => {
    if (ended) {
      return response;
    }
    ended = true;

    if (chunk !== undefined && chunk !== null) {
      const buffer = toResponseBuffer(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : undefined);
      bufferedBytes += buffer.byteLength;
      if (bufferedBytes > maxResponseBytes) {
        exceededLimit = true;
      } else {
        chunks.push(buffer);
      }
    }

    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (exceededLimit) {
      sendResponseLimitError(response, originalWriteHead, originalEnd, done);
      return response;
    }

    if (pendingStatusCode !== undefined) {
      originalWriteHead(pendingStatusCode);
    }
    originalEnd(Buffer.concat(chunks), done);
    return response;
  }) as ServerResponse["end"];
}

function sendResponseLimitError(
  response: ServerResponse,
  writeHead: ServerResponse["writeHead"],
  end: ServerResponse["end"],
  callback?: () => void
): void {
  if (response.headersSent) {
    end(callback);
    return;
  }

  response.statusCode = 413;
  response.removeHeader("content-length");
  response.setHeader("content-type", "application/json; charset=utf-8");
  writeHead(413);
  end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Response body exceeds configured limit"
    },
    id: null
  }), callback);
}

function applyWriteHeadHeaders(response: ServerResponse, headers: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): void {
  if (!headers) {
    return;
  }

  if (Array.isArray(headers)) {
    for (let index = 0; index < headers.length; index += 2) {
      const name = headers[index];
      const value = headers[index + 1];
      if (typeof name === "string" && value !== undefined) {
        response.setHeader(name, value);
      }
    }
    return;
  }

  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      response.setHeader(name, value);
    }
  }
}

function toResponseBuffer(chunk: unknown, encoding: BufferEncoding | undefined): Buffer {
  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }
  if (typeof chunk === "string") {
    return Buffer.from(chunk, encoding);
  }
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk);
  }
  return Buffer.from(String(chunk), encoding);
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
