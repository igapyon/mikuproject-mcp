# mikuproject-mcp

`mikuproject-mcp` is the MCP server adapter for `mikuproject`.

The semantic center remains upstream `mikuproject`. This repository owns the MCP
tool, resource, prompt, schema, transport, workspace, storage, and runtime
adapter surfaces.

## Repository Shape

```text
mikuproject-mcp/
  contract/        shared MCP contract
  packages/node/   first TypeScript MCP server implementation
  packages/java/   reserved for the later Java MCP server implementation
  runtime/         configured or bundled upstream runtime artifacts
  workplace/       local scratch files and optional upstream checkouts
```

The first implementation target is a local stdio MCP server in
`packages/node/`. A later Java implementation should preserve the shared MCP
contract under `contract/`.

## Runtime Artifacts

Bundled or locally configured upstream runtime artifacts belong under
`runtime/`.

```text
runtime/
  mikuproject-java/mikuproject.jar
  mikuproject-node/mikuproject.mjs
```

`workplace/upstream/` may contain local upstream checkouts for development, but
it is not the installed runtime surface.
