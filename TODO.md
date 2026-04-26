# TODO

This repository is the MCP server layer described in
`docs/miku-soft-50-mcp-design-v20260427.md`.

The semantic center remains upstream `mikuproject`. This repository owns the MCP
entrypoints, tool/resource/prompt definitions, schemas, transport handling,
workspace policy, storage policy, and runtime adapter code.

## Current Priority

- [x] Establish the first local stdio MCP server MVP.
- [x] Keep all first-version behavior aligned with `mikuproject` semantics and the
      `mikuproject-skills` operation map.
- [x] Avoid MCP-local reimplementation of upstream conversion logic.
- [x] Sequence implementation as Node.js / TypeScript first, then Java MCP only
      after the Node version has been validated in local stdio use.
- [x] Release and operate the Node MCP server first; start Java MCP only after
      stable Node release operation is observed.

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
- [x] Treat `packages/java/` as a later implementation target, not parallel MVP
      work. Start it only after the Node MCP server behavior is confirmed.
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
- [x] `mikuproject.state_apply_patch`
- [x] `mikuproject.state_diff`
- [x] `mikuproject.state_summarize`
- [x] `mikuproject.export_workbook_json`

File import/export and report generation should wait until the core state
workflow is stable.

## Resume Notes

- Current implementation checkpoint: the first draft-to-state, projection,
  validate-patch, and apply-patch tool path is implemented in the Node MCP
  server.
- Java MCP implementation is planned after Node MCP validation. Do not start the
  Java server until the Node server has been exercised enough to confirm the MCP
  contract and local stdio behavior.
- Java MCP implementation is gated on a released Node version with stable local
  stdio operation. Until then, Java MCP work is planning and contract review
  only.
- Continue with schema validation tests, artifact role naming tests, and resource
  support for current/saved workbook state.
- Runtime artifact policy is decided: keep paired `*-sources.*` traceability
  artifacts under `runtime/` next to the executable artifacts they describe.
- Java `phase-detail` compatibility was updated upstream and the MCP adapter now
  uses `--root-task-uid` plus the IPv4 JVM options from the Java upstream
  `.mvn/jvm.config`.
- Verification checkpoint command: `npm run build && npm run test`.

## Schemas and Results

- [x] Version control JSON Schemas for each tool input.
- [x] Version control structured result schemas or TypeScript types.
- [x] Use explicit argument names instead of positional tool arguments.
- [x] Pass large input/output by file path, resource URI, upload ID, or resource
      link instead of chat-visible text.
- [x] Preserve diagnostics, warnings, hard errors, generated paths, and artifact
      roles in every relevant result.
- [x] Distinguish these artifact roles in names and docs:
  - [x] MS Project XML semantic base / compatibility format
  - [x] `mikuproject_workbook_json` MCP state handoff
  - [x] draft document
  - [x] patch document
  - [x] projection
  - [x] workbook state
  - [x] report output
  - [x] diagnostics output
  - [x] temporary files

## MCP Resources

- [x] Define resource URI conventions.
- [x] Add resource support for AI-facing specifications.
- [x] Add resource support for current workbook state.
- [x] Add resource support for saved workbook states.
- [x] Add resource support for operation summaries.
- [x] Add resource support for diagnostics logs.
- [x] Prefer product-specific URIs such as:
  - [x] `mikuproject://spec/ai-json`
  - [x] `mikuproject://state/current`
  - [x] `mikuproject://state/{name}`
  - [x] `mikuproject://diagnostics/{operationId}`
- [x] Return `file://` resource links only when the client is expected to access
      the local file directly.

## Prompts

- [x] Add only small product-specific prompts after tool/resource contracts are
      stable.
- [x] Prefer exposing the upstream AI specification as a tool or resource instead
      of duplicating large schema text in prompts.
- [x] Candidate prompts:
  - [x] create a new project draft from user requirements
  - [x] revise an existing state using a small projection and patch
  - [x] review a product artifact using diagnostics

## Local Stdio Server

- [x] Implement local stdio transport as the first server entrypoint.
- [x] Avoid requiring a network listener for the MVP.
- [x] Constrain file reads and writes to declared workspace/output roots where
      practical.
- [x] Return generated artifacts as resources or resource links.
- [x] Keep local stdio behavior aligned with any future HTTP deployment contracts.

## Error Handling

- [x] Separate error categories for:
  - [x] invalid tool arguments
  - [x] unsupported document kind
  - [x] missing base state
  - [x] upstream runtime failure
  - [x] upstream validation error
  - [x] upstream warning
  - [x] file access or storage policy error
  - [x] transport or session error
- [x] Make hard errors fail clearly for MCP clients.
- [x] Return soft errors and upstream warnings in structured results when useful
      artifacts can still be produced.

## Tests

- [x] Add smoke test for server startup.
- [x] Add smoke test for one read-only tool.
- [x] Add smoke test for one state-changing tool using temporary files.
- [x] Add tests for runtime discovery and fallback diagnostics.
- [x] Add tests for JSON Schema validation of tool inputs.
- [x] Add tests that generated artifacts preserve role-specific naming.

## Out of Scope for First Version

- [x] Do not add broad hosted multi-tenant operation.
- [x] Do not add custom user management.
- [x] Do not call external AI models.
- [x] Do not manage model-provider API keys.
- [x] Do not build a browser UI replacement.
- [x] Do not implement full domain editing outside upstream-supported operations.
- [x] Do not add automatic workflow planning beyond exposed tools and prompts.
- [x] Do not expose broad filesystem browsing.
- [x] Do not add a parallel implementation of upstream conversion logic.

## Later

- [x] Add file import/export tools after the core state workflow is stable.
- [x] Add report-generation tools after the core state workflow is stable.
- [x] Consider HTTP transport only after session identity, workspace isolation,
      authentication, storage policy, upload lifecycle, artifact lifecycle, size
      limits, cleanup, audit, and runtime isolation are explicitly designed.

## Release Readiness

Before treating the Node.js MCP server as a releasable package:

- [x] Rewrite `README.md` to the level needed for real local use:
      installation, build, MCP client configuration, runtime artifact placement,
      environment variables, workspace/output behavior, tool/resource/prompt
      overview, diagnostics, security notes, and Java-after-Node release order.
- [x] Add a stdio E2E test that starts the built server process and exercises
      MCP initialize, tool listing, resource access, prompt listing, and at least
      one tool call over stdio.
- [x] Fix the consistency between custom `outputPath` values and returned
      resource URIs. A resource URI must either point to the generated artifact
      it names, or the result must return only a path/file artifact when the
      output location is custom.
- [x] Prepare package metadata for publishing:
      package name, version policy, `private` flag decision, `bin`, `files`,
      README linkage, license metadata, and publish command policy.
- [x] Verify the server with MCP Inspector after build and record the result,
      including any client-compatibility notes.
