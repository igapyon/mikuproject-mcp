# MCP Contract

This directory contains the shared MCP contract for `mikuproject-mcp`.

The Node.js / TypeScript implementation must preserve this contract:

- tool names
- input schemas
- result shapes
- resource URI conventions
- prompt names and intent
- artifact roles
- diagnostics and error categories

The contract should not live only as implicit TypeScript code.

Current artifact role names are documented in
`contract/results/artifact-roles.md`.

Implementation order is part of the contract discipline. The Node.js /
TypeScript MCP server is the current implementation and the reference used to
validate local stdio behavior.

`packages/java/` is a placeholder only. Do not add another MCP server
implementation unless a concrete future requirement justifies maintaining it.
