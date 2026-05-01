# TODO

This repository is the MCP server layer described in
`docs/miku-soft-50-mcp-design-v20260501.md`.

The semantic center remains upstream `mikuproject`. This repository owns the MCP
entrypoints, tool/resource/prompt definitions, schemas, transport handling,
workspace policy, storage policy, and runtime adapter code.

## Current Priority

- [x] Establish the first local stdio MCP server MVP.
- [x] Keep all first-version behavior aligned with `mikuproject` semantics and the
      `mikuproject-skills` operation map.
- [x] Avoid MCP-local reimplementation of upstream conversion logic.
- [x] Keep the Node.js / TypeScript implementation as the MCP server.
- [x] Keep `packages/java/` as a placeholder only.

## Before Implementation

- [x] Keep `docs/miku-soft-50-mcp-design-v20260501.md` as the current MCP design
      document.
- [x] Fix initial implementation parameters:
  - [x] package manager: `npm`
  - [x] first implementation: `packages/node/`
  - [x] Java placeholder directory: `packages/java/`
  - [x] shared MCP contract: `contract/`
  - [x] bundled runtime artifact directory: `runtime/`
  - [x] local workspace directory: `workplace/`
  - [x] first transport: local stdio only
  - [x] first tools: `mikuproject_ai_spec`, `mikuproject_ai_detect_kind`,
        `mikuproject_state_from_draft`
- [x] Confirm the current official MCP TypeScript SDK package and Node.js engine
      requirements before installing dependencies.
- [x] Confirm available upstream runtime artifacts under `runtime/`.
- [x] Create the initial shared MCP contract before adding runtime-specific
      behavior.
- [x] Create repository skeleton before implementing product behavior.

## Repository Foundation

- [x] Add a user-facing `README.md` that explains the MCP server role, local stdio
      usage, runtime requirements, and relationship to upstream repositories.
- [x] Add monorepo layout for the Node.js / TypeScript MCP implementation and
      placeholder directories.
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
- [x] Reserve `packages/java/` as a placeholder only.
- [x] Do not implement a second MCP server unless a concrete future constraint
      justifies it.
- [x] Add `runtime/` as the bundled runtime artifact directory.
- [x] Add placeholder layout for:
  - [x] `runtime/mikuproject-java/.gitkeep`
  - [x] `runtime/mikuproject-node/.gitkeep`
- [x] Add `workplace/.gitkeep`.
- [x] Add `.gitignore` rules so `workplace/` contents stay untracked except for
      placeholder files.
- [x] Document optional local upstream checkout layout:
  - `workplace/upstream/mikuproject/`
  - `workplace/upstream/mikuproject-skills/`

## Runtime Adapter

- [x] Create a runtime CLI mapping table before connecting MCP tools to runtime
      execution.
- [x] Derive MCP tool names from the canonical CLI command tree instead of
      inventing shorter operation names.
- [x] Limit core MCP tools to the CLI operation range supported by the configured
      runtime paths.
- [x] Treat runtime-specific CLI operations as later optional capability-gated
      extensions.
- [x] Define runtime discovery order:
  - [x] explicit MCP server configuration
  - [x] bundled runtime artifacts under `runtime/`
  - [x] upstream public API / stable CLI
  - [x] MCP-local adapter helpers only where intended
- [x] Resolve configured or bundled runtime artifacts before broad repository
      search.
- [x] Support fallback among available runtime artifacts when one is missing or
      lacks a needed operation.
- [x] Call runtimes through fixed argument arrays, not shell command strings.
- [x] Return runtime capability and compatibility diagnostics in structured form.
- [x] Keep `workplace/upstream/` as reference input, not as the installed runtime
      surface.
- [x] Use `runtime/` rather than `vendor/` for bundled execution artifacts.

## MCP Tools MVP

Implement product-prefixed tools with JSON Schema input and structured results.

- [x] `mikuproject_ai_spec`
- [x] `mikuproject_ai_detect_kind`
- [x] `mikuproject_state_from_draft`
- [x] `mikuproject_ai_export_project_overview`
- [x] `mikuproject_ai_export_task_edit`
- [x] `mikuproject_ai_export_phase_detail`
- [x] `mikuproject_ai_validate_patch`
- [x] `mikuproject_state_apply_patch`
- [x] `mikuproject_state_diff`
- [x] `mikuproject_state_summarize`
- [x] `mikuproject_export_workbook_json`

File import/export and report generation should wait until the core state
workflow is stable.

## Phase C Report Tool Additions

Add the report / presentation operations requested by `mikuproject-skills` so
CLI backend and MCP backend coverage can stay aligned for Phase C workflows.

Requested CLI-to-MCP mapping:

- [x] `report wbs-xlsx` -> `mikuproject_report_wbs_xlsx`
- [x] `report daily-svg` -> `mikuproject_report_daily_svg`
- [x] `report weekly-svg` -> `mikuproject_report_weekly_svg`
- [x] `report monthly-calendar-svg` ->
      `mikuproject_report_monthly_calendar_svg`
- [x] `report all` -> `mikuproject_report_all`

Implementation tasks:

- [x] Add input JSON Schemas under `contract/tools/` for the five new report
      tools.
- [x] Update `packages/node/src/contract/toolSchemas.ts` so schema loading and
      validation includes the new tool names.
- [x] Update the runtime CLI mapping and fixed-argument dispatch in
      `packages/node/src/runtime/runtimeOperation.ts`.
- [x] Register the MCP tools in `packages/node/src/tools/registerTools.ts` with
      default output paths under the configured workspace.
- [x] Add resource URIs and resource readers for default outputs where useful:
      WBS XLSX, daily SVG, weekly SVG, monthly calendar SVG archive, and report
      bundle.
- [x] Keep `mikuproject_report_wbs_xlsx` separate from
      `mikuproject_export_xlsx`; the former is WBS report XLSX, while the latter
      is structural workbook XLSX export.
- [x] Preserve report artifacts as `report_output` or another explicitly
      documented report artifact role, not as `xlsx_workbook`.
- [x] Update `contract/runtime-cli-mapping.md` with Java and Node CLI mappings
      and note whether each operation is core or capability-gated.
- [x] Confirm the bundled Java runtime and bundled Node runtime both support the
      five operations, or document any runtime-specific capability behavior.
- [x] Add runtime operation mapping tests.
- [x] Add JSON Schema validation samples.
- [x] Extend MCP server smoke tests for tool listing and representative report
      calls.
- [x] Update README tool/resource lists after implementation.

## VS Code / Copilot MCP Compatibility

Keep callable MCP names compatible with clients that reject dotted names or
cache package surfaces from release tarballs.

- [x] Rename MCP prompt registration names from dotted names to underscore names:
  - [x] `mikuproject.create_project_draft` ->
        `mikuproject_create_project_draft`
  - [x] `mikuproject.revise_state_with_patch` ->
        `mikuproject_revise_state_with_patch`
  - [x] `mikuproject.review_artifact_diagnostics` ->
        `mikuproject_review_artifact_diagnostics`
- [x] Do not change product resource URIs such as
      `mikuproject://spec/ai-json`, `mikuproject://state/current`, or
      `mikuproject://diagnostics/{operationId}`.
- [x] Update prompt-related smoke and stdio e2e expectations so prompt names
      follow the same compatibility regex as tool names.
- [x] Update README and packaged README prompt-name documentation.
- [x] Add release-package verification that starts the packed tarball and checks
      `tools/list` includes Phase C report tools.
- [x] Add release-package verification that starts the packed tarball and checks
      `prompts/list` exposes underscore prompt names and no dotted prompt names.
- [x] Verify with `npm run build`, `npm run test`, and package dry-run or packed
      package surface checks.

## Resume Notes

- Current implementation checkpoint: the first draft-to-state, projection,
  validate-patch, and apply-patch tool path is implemented in the Node MCP
  server.
- `packages/java/` is a placeholder only. The Node.js / TypeScript server is the
  current MCP server implementation.
- Continue with schema validation tests, artifact role naming tests, and resource
  support for current/saved workbook state.
- Runtime artifact policy is decided: keep paired `*-sources.*` traceability
  artifacts under `runtime/` next to the executable artifacts they describe.
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

## HTTP Transport Prerequisites

The first localhost-only stateless MCP Streamable HTTP entrypoint is
implemented while keeping the existing local stdio entrypoint supported. Do not
expand it into a remotely reachable or hosted deployment until the remaining
HTTP deployment boundaries are explicitly designed.

- [x] Set the HTTP data ownership policy: canonical WBS/workbook/project files
      are owned and persisted by the MCP client side.
- [x] Set the HTTP server role: an ephemeral execution adapter that receives
      explicit inputs, invokes the existing `mikuproject` runtime commands, and
      returns generated artifacts or updated state.
- [x] Do not make the HTTP server a durable project database or the source of
      truth for current project state.
- [x] Define mutation-style HTTP semantics as input-to-output operations: given
      base state plus patch/edit input, return updated state, diff, summary, and
      diagnostics for the client to persist.
- [x] Decide the first HTTP deployment shape:
      localhost-only development server, remotely reachable server, or both.
- [x] Decide whether the HTTP transport is stateless or stateful.
- [x] Define session identity behavior, including `Mcp-Session-Id` handling if
      stateful sessions are enabled.
- [x] Use request-scoped temporary workspaces for stateless HTTP default outputs
      and remove them after each response.
- [x] Define workspace isolation for HTTP sessions so requests cannot read or
      write arbitrary host paths.
- [ ] Define authentication and authorization requirements for any non-localhost
      deployment.
- [x] Define `Origin` validation and localhost bind policy to reduce DNS
      rebinding risk.
- [ ] Define storage policy for session state, imported files, generated
      artifacts, summaries, and diagnostics.
- [ ] Define upload lifecycle, including accepted file types, upload IDs, maximum
      request sizes, and cleanup timing.
- [ ] Define generated artifact lifecycle, including retention, download/resource
      access, maximum output sizes, and cleanup timing.
- [ ] Define audit or trace policy for HTTP requests and runtime invocations.
- [ ] Define runtime isolation for upstream CLI/runtime execution triggered by
      HTTP requests.
- [x] Keep core tool names, input schemas, result shapes, resource URI roles,
      artifact roles, diagnostics, and error categories aligned with local
      stdio.
- [x] Prefer upload IDs, session-scoped resource URIs, or controlled
      workspace-relative paths over arbitrary host file paths in HTTP requests.
- [x] Add an HTTP entrypoint separately from the stdio entrypoint after the
      above boundaries are documented.
- [x] Add HTTP verification for current stateless HTTP behavior:
  - [x] initialize
  - [x] tools/list
  - [x] tools/call
  - [x] resources/list
  - [x] resources/read
  - [x] prompts/list
  - [x] prompts/get
  - [x] invalid origin
  - [x] oversized request body
  - [x] oversized response body
  - [x] host path / workspace escape attempts
  - [x] request-scoped temporary workspace cleanup
  - [x] invalid session is not applicable while `Mcp-Session-Id` is not issued
        by the stateless HTTP entrypoint.
- [x] After implementing and verifying HTTP support in `mikuproject-mcp`, update
      `docs/miku-soft-50-mcp-design-v20260501.md` with the concrete lessons
      learned so future miku MCP servers can follow tested guidance.

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

## GitHub Release Tarball Distribution

GitHub Release tarball distribution is separate from npm publication. It builds
and attaches a package tarball to a GitHub Release, but it does not publish the
package to the npm registry.

- [x] Add `.github/workflows/release-package.yml`.
- [x] Run the workflow on published GitHub Releases whose tag starts with `v`.
- [x] Allow manual `workflow_dispatch` with a `tag_name`.
- [x] Install dependencies, build, and test before packing.
- [x] Pack the Node package with:
      `npm --workspace packages/node pack`.
- [x] Verify the packed MCP surface with:
      `node packages/node/scripts/verify-package-surface.mjs`.
- [x] Upload `release-assets/*.tgz` to the GitHub Release.
- [x] Keep npm registry publication out of this workflow.

## Later: npm Publication

npm publication is desirable for public distribution, but it is intentionally
deferred. Do not publish to npm until the authentication model, release process,
runtime artifact policy, and post-publish verification flow are understood and
accepted.

When this work is resumed:

- [ ] Understand npm publishing authentication options:
      interactive 2FA, granular access tokens with bypass 2FA, and trusted
      publishing.
- [ ] Decide whether the first npm release should be manual or CI-based.
- [ ] Confirm the npm account can publish under the `@igapyon` scope.
- [x] Confirm the intended public package name in repository metadata:
      `@igapyon/mikuproject-mcp-node`.
      This is confirmed in `packages/node/package.json` and `README.md`.
- [ ] Confirm npm registry availability and scoped publish permission for:
      `@igapyon/mikuproject-mcp-node`.
- [x] Confirm the final package version in `packages/node/package.json`.
      Version policy: align the MCP package version with the bundled Node.js
      `mikuproject` CLI runtime version by default.
- [ ] Confirm that bundling runtime artifacts in the npm package is acceptable
      for license, size, update, and traceability policy.
- [x] Run the final local verification:
      `npm run build`
      `npm run test`
- [x] Review the package contents before publishing:
      `npm --workspace packages/node pack --dry-run`
- [ ] Publish the scoped package publicly only after the above items are clear:
      `npm publish --workspace packages/node --access public`
- [ ] Confirm the public npm package page is available:
      `https://www.npmjs.com/package/@igapyon/mikuproject-mcp-node`
- [ ] Verify install and execution after publishing:
      `npx -y @igapyon/mikuproject-mcp-node`
      `npm install -g @igapyon/mikuproject-mcp-node`
- [ ] Verify MCP client usage after publishing with an `npx` configuration:
      command `npx`, args `["-y", "@igapyon/mikuproject-mcp-node"]`.
- [ ] Verify MCP client usage after global install with command
      `mikuproject-mcp`.
- [ ] Create a Git tag for the published version.
- [ ] Create GitHub Release notes for the published version.
- [ ] Update README or docs if the package should be described as published
      rather than prepared for future release.

## MCP Runtime I/O Without Temporary Files

Context: bundled Node runtime `mikuproject 0.8.3.3` supports stdin/stdout and
Base64 binary I/O through `--in -`, `--out -`, `--in-base64 -`, and
`--out-base64 -`. The MCP adapter still exposes path-based tool inputs and writes
default outputs, operation summaries, and diagnostics under the workspace.

- [x] Decide the public MCP contract shape for content-based I/O.
      Text inputs should accept inline JSON/text content in addition to existing
      `*Path` fields.
- [x] Add binary content contracts.
      Binary inputs should accept Base64 content in addition to existing
      `inputPath` fields, and binary outputs should be able to return Base64
      content directly when `outputPath` is omitted or content mode is requested.
- [x] Keep path mode compatible.
      Existing path-based fields should remain supported for local stdio clients
      and workspace/resource workflows.
- [x] Update contract schemas under `contract/tools/`.
      Add content alternatives for workbook JSON, draft JSON, patch JSON, and
      XLSX inputs. Keep schemas clear enough that callers cannot provide
      conflicting path and inline content inputs.
- [x] Update `packages/node/src/runtime/runtimeOperation.ts`.
      Add runtime command support for stdin payloads. Map Node text content to
      `--in -` / `--out -`, and Node binary content to `--in-base64 -` /
      `--out-base64 -`.
- [x] Preserve Java path-mode behavior.
      Keep path-based execution for Java runtime until equivalent Java
      stdin/stdout and Base64 binary behavior is verified.
- [x] Update runtime selection and capability handling.
      Prefer Node runtime for content-mode calls when Java cannot support them,
      and return a clear diagnostic if a requested mode is unsupported.
- [x] Update `packages/node/src/tools/registerTools.ts`.
      Accept path or inline content inputs, return inline content artifacts when
      requested, and avoid creating default output files for content-mode calls.
- [x] Make summary and diagnostics persistence mode-aware.
      Content-mode HTTP calls should be able to return operation summary and
      diagnostics inline instead of always writing workspace files.
- [x] Update HTTP transport behavior.
      Reject client-provided host path arguments over HTTP. Use request-scoped
      temporary workspace files only as adapter-internal runtime inputs for
      inline multi-input operations.
- [x] Update artifact and resource handling.
      Keep resource URIs for persisted workspace artifacts, and add result-only
      artifact handling for inline text and Base64 binary outputs.
- [x] Define response-size policy.
      Ensure large binary results respect `MIKUPROJECT_MCP_HTTP_MAX_BODY_BYTES`
      or a dedicated response-size limit.
- [x] Add tests for content-mode runtime execution.
      Cover text stdin/stdout and Base64 XLSX import/export/report flows with
      the Node runtime.
- [x] Add MCP smoke and HTTP E2E tests.
      Prove content-mode tools work without default output files and that HTTP
      content-mode requests do not leave temporary workspace artifacts.
- [x] Keep existing path-mode tests passing.
- [x] Update documentation.
      Document path mode versus content mode in `README.md`, update
      `contract/runtime-cli-mapping.md`, and record that Node supports content
      mode as of `mikuproject 0.8.3.3` while Java support is separate unless
      verified.

Resume note: draft/workbook/state/patch text content and XLSX Base64 contracts are
wired through schemas, tool registration, runtime argument mapping, and
result-only artifacts. Patch content mode accepts `stateContent`; the adapter
materializes it as a request-local runtime input because the runtime accepts only
one stdin input per command. MCP smoke and HTTP E2E cover inline patch
validation, apply-with-content-output, inline operation summary/diagnostics, and
HTTP rejection of host path arguments.
