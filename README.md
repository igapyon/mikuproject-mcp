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

The MCP server entrypoint after build is:

```text
packages/node/dist/index.js
```

The package name prepared for the Node release is:

```text
@igapyon/mikuproject-mcp-node
```

## Version Policy

The MCP package version should generally match the bundled Node.js
`mikuproject` CLI runtime version. For the `0.8.1` MCP release, the bundled
Node.js CLI still reports `mikuproject 0.8.0`; this MCP patch release updates
the adapter contract for MCP client tool-name compatibility.

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

## Release Tarball Usage

GitHub Releases may provide an npm package tarball asset named like:

```text
igapyon-mikuproject-mcp-node-0.8.1.tgz
```

After downloading the tarball, install it globally:

```sh
npm install -g ./igapyon-mikuproject-mcp-node-0.8.1.tgz
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
npm exec --yes --package=https://github.com/igapyon/mikuproject-mcp/releases/download/v0.8.1/igapyon-mikuproject-mcp-node-0.8.1.tgz -- mikuproject-mcp
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
        "--package=https://github.com/igapyon/mikuproject-mcp/releases/download/v0.8.1/igapyon-mikuproject-mcp-node-0.8.1.tgz",
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
in `docs/development.md` and `docs/miku-soft-50-mcp-design-v20260429.md`.
