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
