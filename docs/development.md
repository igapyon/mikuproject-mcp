# mikuproject-mcp Development Notes

This document contains developer-facing notes for `mikuproject-mcp`.

The user-facing entry point is `README.md`. Keep implementation details,
repository layout notes, contract discipline, and release sequencing here or in
the detailed design documents under `docs/`.

## Repository Shape

```text
mikuproject-mcp/
  contract/        shared MCP contract
  packages/node/   first TypeScript MCP server implementation
  packages/java/   placeholder only
  runtime/         configured or bundled upstream runtime artifacts
  workplace/       local scratch files and optional upstream checkouts
```

`contract/` is the shared MCP contract. It should stay explicit enough that the
MCP surface is not defined only by TypeScript implementation details.

`packages/node/` is the current implementation and the reference implementation
for the MCP adapter contract.

`packages/java/` is a placeholder only.

## Runtime Artifacts

Bundled or locally configured upstream runtime artifacts belong under
`runtime/`.

```text
runtime/
  product-runtime/
    runnable-artifact
    source-traceability-artifact
```

Keep paired source artifacts under `runtime/` next to the executable artifact
they describe. The MCP adapter executes only runnable artifacts, but source
artifacts are kept as traceability artifacts for the bundled upstream runtime.

`workplace/upstream/` may contain local upstream checkouts for development, but
it is not the installed runtime surface.

Suggested upstream checkout layout:

```text
workplace/upstream/mikuproject/
workplace/upstream/mikuproject-skills/
```

## Package Publishing

The Node package metadata is prepared in `packages/node/package.json` for
`@igapyon/mikuproject-mcp-node`.

The MCP package version should generally follow the bundled Node.js
`mikuproject` CLI runtime version. The package is a protocol adapter for that
runtime surface, so keeping the versions aligned makes release notes, Git tags,
runtime traceability, and downstream MCP client configuration easier to compare.
If Java and Node runtime artifacts have different patch versions, record both
runtime versions in release notes, but use the Node CLI version for the MCP npm
package unless the release is explicitly Java-runtime-only.

Before packaging, `prepack` builds the TypeScript output and copies the
repository-level `README.md`, `LICENSE`, `contract/`, and `runtime/` assets into
the package directory so that the published tarball is self-contained.

Dry-run the package contents before any publish:

```sh
npm --workspace packages/node pack --dry-run
```

Publish is gated on the Node release readiness checklist. When that gate is
cleared, use an explicit public publish command:

```sh
npm publish --workspace packages/node --access public
```

## MCP Inspector Verification

Verification date: 2026-04-27.

After `npm run build`, the server was checked with MCP Inspector CLI:

```sh
npx -y @modelcontextprotocol/inspector --cli node packages/node/dist/index.js --method tools/list
npx -y @modelcontextprotocol/inspector --cli node packages/node/dist/index.js --method resources/list
npx -y @modelcontextprotocol/inspector --cli node packages/node/dist/index.js --method prompts/list
npx -y @modelcontextprotocol/inspector --cli node packages/node/dist/index.js --method tools/call --tool-name mikuproject_ai_spec
```

Observed result: tool listing, resource listing, prompt listing, and the
`mikuproject_ai_spec` tool call completed successfully over stdio.

Compatibility note: the Inspector CLI run emitted npm warnings from transitive
dependencies, but they did not prevent MCP connection or method execution.

## Streamable HTTP Verification

Verification date: 2026-05-01.

After `npm run build`, the test suite starts `packages/node/dist/http.js` with
`MIKUPROJECT_MCP_HTTP_PORT=0` and checks Streamable HTTP client behavior over a
local ephemeral port.

Observed result: initialize, tool listing, resource reading, prompt listing, and
the `mikuproject_ai_detect_kind` tool call completed successfully over
Streamable HTTP. The HTTP E2E test also confirmed that an invalid non-local
`Origin` header is rejected with HTTP 403, oversized request bodies are rejected,
and request-scoped temporary HTTP workspaces are removed after tool responses.

## Implementation Order

The Node.js / TypeScript server is the current MCP server implementation.
`packages/java/` remains a placeholder.

The implementation order is:

1. Build the Node.js / TypeScript local stdio MCP server.
2. Add a localhost-oriented stateless Streamable HTTP entrypoint without
   changing the MCP tool/resource/prompt contract.
3. Release and operate the Node version.
4. Confirm stable local stdio and Streamable HTTP operation with real MCP clients and real project
   artifacts.

Stable Node operation means:

- the Node release can be installed and run by MCP clients through local stdio
- the HTTP entrypoint can be run explicitly for controlled local Streamable HTTP
  use
- documented runtime artifacts can be resolved
- core tools and resources work against real project artifacts
- diagnostics and generated resource links are understandable
- README and contract documents are sufficient for normal local use

Do not add another MCP server implementation unless a later requirement makes it
necessary.

## Verification

Primary verification commands:

```sh
npm run build
npm run test
```

Before release, also verify the built stdio server with an MCP client or MCP
Inspector and record any client-compatibility notes.

## Related Documents

- `docs/miku-soft-50-mcp-design-v20260501.md`
- `docs/http-transport-decision-v20260427.md`
- `contract/README.md`
- `contract/runtime-cli-mapping.md`
- `contract/results/artifact-roles.md`
- `contract/resources/resource-uris.md`
