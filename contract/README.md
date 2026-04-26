# MCP Contract

This directory contains the shared MCP contract for `mikuproject-mcp`.

Both the Node.js / TypeScript implementation and the later Java implementation
must preserve this contract:

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
TypeScript MCP server is the first implementation and the reference used to
validate local stdio behavior. The Java MCP server should be created only after
the Node implementation has been exercised and the shared tool, resource,
prompt, schema, result, diagnostics, workspace, and artifact-role contracts are
accepted as stable enough to port.
