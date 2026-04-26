# TODO

This repository is the MCP server layer described in
`docs/miku-soft-50-mcp-design-v20260427.md`.

The semantic center remains upstream `mikuproject`. This repository owns the MCP
entrypoints, tool/resource/prompt definitions, schemas, transport handling,
workspace policy, storage policy, and runtime adapter code.

## Current Priority

- [ ] Establish the first local stdio MCP server MVP.
- [ ] Keep all first-version behavior aligned with `mikuproject` semantics and the
      `mikuproject-skills` operation map.
- [ ] Avoid MCP-local reimplementation of upstream conversion logic.

## Before Implementation

- [x] Keep `docs/miku-soft-50-mcp-design-v20260427.md` as the current MCP design
      document.
- [x] Fix initial implementation parameters:
  - [x] package manager: `npm`
  - [x] first implementation: `packages/node/`
  - [x] later Java implementation: `packages/java/`
  - [x] shared MCP contract: `contract/`
  - [x] bundled runtime artifact directory: `runtime/`
  - [x] local workspace directory: `workplace/`
  - [x] first transport: local stdio only
  - [x] first tools: `mikuproject.ai_spec`, `mikuproject.ai_detect_kind`,
        `mikuproject.state_from_draft`
- [x] Confirm the current official MCP TypeScript SDK package and Node.js engine
      requirements before installing dependencies.
- [x] Confirm available upstream runtime artifacts:
  - [x] `runtime/mikuproject-java/mikuproject.jar`
  - [x] `runtime/mikuproject-node/mikuproject.mjs`
- [x] Create the initial shared MCP contract before adding runtime-specific
      behavior.
- [x] Create repository skeleton before implementing product behavior.

## Repository Foundation

- [x] Add a user-facing `README.md` that explains the MCP server role, local stdio
      usage, runtime requirements, and relationship to upstream repositories.
- [x] Add monorepo layout for Node.js / TypeScript and Java MCP implementations.
- [x] Add shared MCP contract layout:
  - [x] `contract/tools/`
  - [x] `contract/results/`
  - [x] `contract/resources/`
  - [x] `contract/errors/`
- [x] Add Node.js / TypeScript implementation layout under `packages/node/`.
- [x] Add package/build metadata for the Node.js / TypeScript MCP server.
- [x] Add Node.js / TypeScript source layout for:
  - [x] core tool definitions
  - [x] core input/result schema loading
  - [x] runtime adapter interface
  - [x] local stdio entrypoint
  - [x] resource registry
  - [x] workspace/storage helpers
- [x] Reserve `packages/java/` for the later Java MCP server implementation.
- [x] Add `runtime/` as the bundled runtime artifact directory.
- [x] Add placeholder layout for:
  - [x] `runtime/mikuproject-java/.gitkeep`
  - [x] `runtime/mikuproject-node/.gitkeep`
- [x] Add `workplace/.gitkeep`.
- [x] Add `.gitignore` rules so `workplace/` contents stay untracked except for
      placeholder files.
- [x] Document optional local upstream checkout layout:
  - `workplace/upstream/mikuproject/`
  - `workplace/upstream/mikuproject-java/`
  - `workplace/upstream/mikuproject-skills/`

## Runtime Adapter

- [x] Create a Node.js / Java CLI mapping table before connecting MCP tools to
      runtime execution.
- [x] Derive MCP tool names from the canonical CLI command tree instead of
      inventing shorter operation names.
- [x] Limit core MCP tools to the CLI operation range supported by both Node.js
      and Java runtime paths.
- [x] Treat Java-only CLI operations as later optional capability-gated
      extensions.
- [x] Define runtime discovery order:
  - [x] explicit MCP server configuration
  - [x] bundled runtime artifacts under `runtime/`
  - [x] upstream public API / stable CLI
  - [x] MCP-local adapter helpers only where intended
- [x] Prefer Java runtime artifact when available.
- [x] Support Node.js CLI runtime fallback when Java is missing or lacks a needed
      operation.
- [x] Call runtimes through fixed argument arrays, not shell command strings.
- [x] Return runtime capability and compatibility diagnostics in structured form.
- [x] Keep `workplace/upstream/` as reference input, not as the installed runtime
      surface.
- [x] Use `runtime/` rather than `vendor/` for bundled execution artifacts.

## MCP Tools MVP

Implement product-prefixed tools with JSON Schema input and structured results.

- [x] `mikuproject.ai_spec`
- [x] `mikuproject.ai_detect_kind`
- [x] `mikuproject.state_from_draft`
- [x] `mikuproject.ai_export_project_overview`
- [x] `mikuproject.ai_export_task_edit`
- [x] `mikuproject.ai_export_phase_detail`
- [x] `mikuproject.ai_validate_patch`
- [ ] `mikuproject.state_apply_patch`
- [ ] `mikuproject.state_diff`
- [ ] `mikuproject.state_summarize`
- [ ] `mikuproject.export_workbook_json`

File import/export and report generation should wait until the core state
workflow is stable.

## Schemas and Results

- [ ] Version control JSON Schemas for each tool input.
- [ ] Version control structured result schemas or TypeScript types.
- [ ] Use explicit argument names instead of positional tool arguments.
- [ ] Pass large input/output by file path, resource URI, upload ID, or resource
      link instead of chat-visible text.
- [ ] Preserve diagnostics, warnings, hard errors, generated paths, and artifact
      roles in every relevant result.
- [ ] Distinguish these artifact roles in names and docs:
  - [ ] MS Project XML semantic base / compatibility format
  - [ ] `mikuproject_workbook_json` MCP state handoff
  - [ ] draft document
  - [ ] patch document
  - [ ] projection
  - [ ] workbook state
  - [ ] report output
  - [ ] diagnostics output
  - [ ] temporary files

## MCP Resources

- [x] Define resource URI conventions.
- [x] Add resource support for AI-facing specifications.
- [ ] Add resource support for current workbook state.
- [ ] Add resource support for saved workbook states.
- [ ] Add resource support for operation summaries.
- [ ] Add resource support for diagnostics logs.
- [ ] Prefer product-specific URIs such as:
  - [ ] `mikuproject://spec/ai-json`
  - [ ] `mikuproject://state/current`
  - [ ] `mikuproject://state/{name}`
  - [ ] `mikuproject://diagnostics/{operationId}`
- [ ] Return `file://` resource links only when the client is expected to access
      the local file directly.

## Prompts

- [ ] Add only small product-specific prompts after tool/resource contracts are
      stable.
- [ ] Prefer exposing the upstream AI specification as a tool or resource instead
      of duplicating large schema text in prompts.
- [ ] Candidate prompts:
  - [ ] create a new project draft from user requirements
  - [ ] revise an existing state using a small projection and patch
  - [ ] review a product artifact using diagnostics

## Local Stdio Server

- [ ] Implement local stdio transport as the first server entrypoint.
- [ ] Avoid requiring a network listener for the MVP.
- [ ] Constrain file reads and writes to declared workspace/output roots where
      practical.
- [ ] Return generated artifacts as resources or resource links.
- [ ] Keep local stdio behavior aligned with any future HTTP deployment contracts.

## Error Handling

- [ ] Separate error categories for:
  - [ ] invalid tool arguments
  - [ ] unsupported document kind
  - [ ] missing base state
  - [ ] upstream runtime failure
  - [ ] upstream validation error
  - [ ] upstream warning
  - [ ] file access or storage policy error
  - [ ] transport or session error
- [ ] Make hard errors fail clearly for MCP clients.
- [ ] Return soft errors and upstream warnings in structured results when useful
      artifacts can still be produced.

## Tests

- [x] Add smoke test for server startup.
- [x] Add smoke test for one read-only tool.
- [x] Add smoke test for one state-changing tool using temporary files.
- [x] Add tests for runtime discovery and fallback diagnostics.
- [ ] Add tests for JSON Schema validation of tool inputs.
- [ ] Add tests that generated artifacts preserve role-specific naming.

## Out of Scope for First Version

- [ ] Do not add broad hosted multi-tenant operation.
- [ ] Do not add custom user management.
- [ ] Do not call external AI models.
- [ ] Do not manage model-provider API keys.
- [ ] Do not build a browser UI replacement.
- [ ] Do not implement full domain editing outside upstream-supported operations.
- [ ] Do not add automatic workflow planning beyond exposed tools and prompts.
- [ ] Do not expose broad filesystem browsing.
- [ ] Do not add a parallel implementation of upstream conversion logic.

## Later

- [ ] Add file import/export tools after the core state workflow is stable.
- [ ] Add report-generation tools after the core state workflow is stable.
- [ ] Consider HTTP transport only after session identity, workspace isolation,
      authentication, storage policy, upload lifecycle, artifact lifecycle, size
      limits, cleanup, audit, and runtime isolation are explicitly designed.
