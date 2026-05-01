# mikuproject-mcp

`mikuproject-mcp` is an MCP server adapter for `mikuproject`.

It exposes `mikuproject` operations to MCP clients as tools, resources, and
prompts. The primary entrypoint is local stdio. A localhost-oriented Streamable
HTTP entrypoint is also available for clients that need HTTP transport. The
server does not call external AI services and does not replace the upstream
`mikuproject` product logic.

## Status

This repository is currently a Node.js / TypeScript MCP server implementation.
The Node package metadata is prepared for a future public package release, but
the current validation path is still to build and run it from a local checkout.

## Requirements

- Node.js 20 or later
- npm
- Bundled or configured `mikuproject` runtime artifacts

The checked-in runtime artifacts under `runtime/` are used by the MCP adapter
for local execution.

## Build

```sh
npm install
npm run build
```

The stdio MCP server entrypoint after build is:

```text
packages/node/dist/index.js
```

The Streamable HTTP entrypoint after build is:

```text
packages/node/dist/http.js
```

The package name prepared for the Node release is:

```text
@igapyon/mikuproject-mcp-node
```

## Version Policy

The MCP package version should generally match the bundled Node.js
`mikuproject` CLI runtime version.

If the bundled Java runtime has a different patch version, treat that as runtime
traceability information. Do not use the Java runtime patch version as the MCP
package version unless the release is intentionally based on a Java-only runtime
surface.

## MCP Client Configuration

Use the built stdio entrypoint from your MCP client configuration.

Example:

```json
{
  "mcpServers": {
    "mikuproject": {
      "command": "node",
      "args": ["packages/node/dist/index.js"]
    }
  }
}
```

If your MCP client runs from a different working directory, use paths that are
valid for that client environment.

## Streamable HTTP Usage

The HTTP entrypoint is intended for local or otherwise explicitly controlled
deployments. By default it binds to `127.0.0.1:3000` and exposes a single MCP
endpoint at `/mcp`.

```sh
node packages/node/dist/http.js
```

You can configure the listener with environment variables:

```sh
MIKUPROJECT_MCP_HTTP_HOST=127.0.0.1
MIKUPROJECT_MCP_HTTP_PORT=3000
MIKUPROJECT_MCP_HTTP_ENDPOINT=/mcp
MIKUPROJECT_MCP_HTTP_MAX_BODY_BYTES=52428800
MIKUPROJECT_MCP_HTTP_MAX_RESPONSE_BYTES=52428800
MIKUPROJECT_MCP_HTTP_ALLOWED_ORIGINS=http://localhost:3000
```

The current HTTP transport is stateless. It does not issue `Mcp-Session-Id`,
does not keep durable project state, and creates a fresh MCP server instance for
each HTTP request. HTTP tool calls do not accept client-provided host file path
arguments such as `statePath`, `workbookPath`, `inputPath`, or `outputPath`.
Use inline content fields such as `draftContent`, `workbookContent`,
`stateContent`, `patchContent`, `content`, or `inputBase64`, and use
`outputMode: "content"` or `outputMode: "base64"` when the result should be
returned directly.

The HTTP entrypoint still creates a request-scoped temporary workspace for
adapter-internal runtime files when the upstream CLI requires one input as a
path. For example, a request can send `stateContent` and `patchContent`; the
adapter may materialize `stateContent` as a temporary runtime input while
passing `patchContent` on stdin. This workspace is removed after the response
completes and is not a durable storage location. Hosted or remote profiles that
need downloadable artifacts should add an explicit upload, download, or
content-return policy.

HTTP request bodies are limited by `MIKUPROJECT_MCP_HTTP_MAX_BODY_BYTES`.
HTTP response bodies are limited by `MIKUPROJECT_MCP_HTTP_MAX_RESPONSE_BYTES`,
which defaults to the same 50 MiB limit. If a generated content-mode or Base64
response would exceed the response limit, the HTTP entrypoint returns HTTP 413
with a JSON-RPC error. Use a future retained-download policy for large generated
artifacts.

The HTTP server rejects non-local `Origin` headers unless they are listed in
`MIKUPROJECT_MCP_HTTP_ALLOWED_ORIGINS`. Do not bind it to a public interface
without a separate authentication, workspace isolation, upload, storage,
cleanup, audit, and runtime isolation design.

## Release Tarball Usage

GitHub Releases may provide an npm package tarball asset named like:

```text
igapyon-mikuproject-mcp-node-0.8.3.tgz
```

After downloading the tarball, install it globally:

```sh
npm install -g ./igapyon-mikuproject-mcp-node-0.8.3.tgz
```

Then configure your MCP client to run the installed command:

```json
{
  "mcpServers": {
    "mikuproject": {
      "command": "mikuproject-mcp"
    }
  }
}
```

You can also run the release tarball directly with `npm exec` without a global
install. Replace the version and URL with the release asset you want to use:

```sh
npm exec --yes --package=https://github.com/igapyon/mikuproject-mcp/releases/download/v0.8.3/igapyon-mikuproject-mcp-node-0.8.3.tgz -- mikuproject-mcp
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "mikuproject": {
      "command": "npm",
      "args": [
        "exec",
        "--yes",
        "--package=https://github.com/igapyon/mikuproject-mcp/releases/download/v0.8.3/igapyon-mikuproject-mcp-node-0.8.3.tgz",
        "--",
        "mikuproject-mcp"
      ]
    }
  }
}
```

## Runtime Configuration

By default, runtime artifacts are resolved from `runtime/`.

You can override them with environment variables:

```sh
MIKUPROJECT_MCP_RUNTIME_NODE=/path/to/mikuproject.mjs
MIKUPROJECT_MCP_WORKSPACE=/path/to/workspace
```

`MIKUPROJECT_MCP_WORKSPACE` controls where generated state, projections,
exports, reports, summaries, and diagnostics are written. If it is not set, the
server uses `workplace/` under this repository.

Bundled runtime discovery accepts versioned artifact names such as
`runtime/mikuproject-node/mikuproject-0.8.3.3.mjs` and
`runtime/mikuproject-java/mikuproject-0.8.3.3.jar`. When multiple versioned
artifacts are present, the newest numeric version is selected. Legacy names
(`mikuproject.mjs` and `mikuproject.jar`) remain supported as fallback names.

## Path and Content I/O

Path mode remains the default. Tools accept existing `*Path` fields and write
default outputs under `MIKUPROJECT_MCP_WORKSPACE` when `outputPath` is omitted.

The bundled Node.js `mikuproject 0.8.3.3` runtime also supports content mode for
operations whose schemas expose inline fields. Text inputs can use
`draftContent`, `workbookContent`, `stateContent`, `patchContent`, or
`content`; XLSX imports can use `inputBase64`. When the upstream runtime accepts
only one stdin input for a multi-input operation, the adapter can materialize
one inline input as an adapter-owned temporary file while keeping host file paths
out of the HTTP contract. Text outputs can set `outputMode` to `content`; binary
outputs can set `outputMode` to `base64`. In those modes, the generated artifact
is returned in the tool result as `text` or `base64` with a `mimeType`, and no
default output file is created for that artifact.

Java runtime execution remains path-mode only until equivalent stdin/stdout and
Base64 behavior is verified. When content mode is requested, the adapter selects
the Node.js runtime and reports a runtime diagnostic if no compatible Node.js
runtime is available.

## Tools

The server exposes product-prefixed tools derived from the upstream CLI command
tree.

Core state and AI workflow tools:

- `mikuproject_version`
- `mikuproject_ai_spec`
- `mikuproject_ai_detect_kind`
- `mikuproject_state_from_draft`
- `mikuproject_ai_export_project_overview`
- `mikuproject_ai_export_bundle`
- `mikuproject_ai_export_task_edit`
- `mikuproject_ai_export_phase_detail`
- `mikuproject_ai_validate_patch`
- `mikuproject_state_apply_patch`
- `mikuproject_state_diff`
- `mikuproject_state_summarize`

Import, export, and report tools:

- `mikuproject_export_workbook_json`
- `mikuproject_export_xml`
- `mikuproject_export_xlsx`
- `mikuproject_import_xlsx`
- `mikuproject_report_wbs_xlsx`
- `mikuproject_report_daily_svg`
- `mikuproject_report_weekly_svg`
- `mikuproject_report_monthly_calendar_svg`
- `mikuproject_report_all`
- `mikuproject_report_wbs_markdown`
- `mikuproject_report_mermaid`

## Resources

Common resource URIs include:

- `mikuproject://spec/ai-json`
- `mikuproject://state/current`
- `mikuproject://state/{name}`
- `mikuproject://export/workbook-json`
- `mikuproject://export/project-xml`
- `mikuproject://export/project-xlsx`
- `mikuproject://report/wbs-xlsx`
- `mikuproject://report/daily-svg`
- `mikuproject://report/weekly-svg`
- `mikuproject://report/monthly-calendar-svg`
- `mikuproject://report/all`
- `mikuproject://report/wbs-markdown`
- `mikuproject://report/mermaid`
- `mikuproject://summary/{operationId}`
- `mikuproject://diagnostics/{operationId}`

Tool results include generated artifact paths and, where applicable,
product-specific resource URIs. Content-mode results can instead include
result-only artifact fields such as `text`, `base64`, and `mimeType`.

## Prompts

The server provides small product-specific prompts:

- `mikuproject_create_project_draft`
- `mikuproject_revise_state_with_patch`
- `mikuproject_review_artifact_diagnostics`

Prompt text refers to the AI specification resource instead of duplicating the
full product specification.

## Diagnostics and Outputs

Tool results are JSON text results with:

- `ok`
- `operation`
- `operationId`
- `diagnostics`
- generated artifact references

Operation summaries and diagnostics are saved under the workspace and can be
read through:

- `mikuproject://summary/{operationId}`
- `mikuproject://diagnostics/{operationId}`

## Security Notes

This server is intended for trusted local use. It invokes local runtime
artifacts and reads or writes local files based on tool arguments and workspace
configuration.

Do not configure it with untrusted runtime artifacts or expose it as a hosted
network service without a separate design for authentication, workspace
isolation, upload handling, storage policy, cleanup, audit, and runtime
isolation.

## Developer Documentation

Developer-facing repository layout, implementation order, and contract notes are
in `docs/development.md` and `docs/miku-soft-50-mcp-design-v20260501.md`.
