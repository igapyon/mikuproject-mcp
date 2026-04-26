# mikuproject-mcp

`mikuproject-mcp` is a local MCP server adapter for `mikuproject`.

It exposes `mikuproject` operations to MCP clients as tools, resources, and
prompts. The server is intended for local stdio use first. It does not call
external AI services, does not start a network listener, and does not replace
the upstream `mikuproject` product logic.

## Status

This repository is currently a Node.js / TypeScript MCP server implementation.
The Node package metadata is prepared for a future public package release, but
the current validation path is still to build and run it from a local checkout.

The Java MCP server is planned later, but only after the Node version has been
released and has shown stable local stdio operation. Java-side work is currently
limited to planning and contract review.

## Requirements

- Node.js 20 or later
- npm
- At least one `mikuproject` runtime artifact:
  - `runtime/mikuproject-java/mikuproject.jar`
  - `runtime/mikuproject-java/mikuproject-sources.jar`
  - `runtime/mikuproject-node/mikuproject.mjs`
  - `runtime/mikuproject-node/mikuproject-sources.tgz`

When both runtime artifacts are available, the adapter prefers the Java runtime
and can fall back to the Node.js runtime when needed.

`*-sources.*` artifacts are paired traceability artifacts. They are not executed
by the MCP adapter, but should be kept next to the runnable runtime artifact so
that the bundled runtime can be traced back to the upstream source snapshot.

## Build

```sh
npm install
npm run build
```

The MCP server entrypoint after build is:

```text
packages/node/dist/index.js
```

The package name prepared for the Node release is:

```text
@igapyon/mikuproject-mcp-node
```

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

## Runtime Configuration

By default, runtime artifacts are resolved from `runtime/`.

You can override them with environment variables:

```sh
MIKUPROJECT_MCP_RUNTIME_JAVA=/path/to/mikuproject.jar
MIKUPROJECT_MCP_RUNTIME_NODE=/path/to/mikuproject.mjs
MIKUPROJECT_MCP_WORKSPACE=/path/to/workspace
```

`MIKUPROJECT_MCP_WORKSPACE` controls where generated state, projections,
exports, reports, summaries, and diagnostics are written. If it is not set, the
server uses `workplace/` under this repository.

## Tools

The server exposes product-prefixed tools derived from the upstream CLI command
tree.

Core state and AI workflow tools:

- `mikuproject.ai_spec`
- `mikuproject.ai_detect_kind`
- `mikuproject.state_from_draft`
- `mikuproject.ai_export_project_overview`
- `mikuproject.ai_export_task_edit`
- `mikuproject.ai_export_phase_detail`
- `mikuproject.ai_validate_patch`
- `mikuproject.state_apply_patch`
- `mikuproject.state_diff`
- `mikuproject.state_summarize`

Import, export, and report tools:

- `mikuproject.export_workbook_json`
- `mikuproject.export_xml`
- `mikuproject.export_xlsx`
- `mikuproject.import_xlsx`
- `mikuproject.report_wbs_markdown`
- `mikuproject.report_mermaid`

## Resources

Common resource URIs include:

- `mikuproject://spec/ai-json`
- `mikuproject://state/current`
- `mikuproject://state/{name}`
- `mikuproject://export/workbook-json`
- `mikuproject://export/project-xml`
- `mikuproject://export/project-xlsx`
- `mikuproject://report/wbs-markdown`
- `mikuproject://report/mermaid`
- `mikuproject://summary/{operationId}`
- `mikuproject://diagnostics/{operationId}`

Tool results include generated artifact paths and, where applicable,
product-specific resource URIs.

## Prompts

The server provides small product-specific prompts:

- `mikuproject.create_project_draft`
- `mikuproject.revise_state_with_patch`
- `mikuproject.review_artifact_diagnostics`

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
in `docs/development.md` and `docs/miku-soft-50-mcp-design-v20260427.md`.
