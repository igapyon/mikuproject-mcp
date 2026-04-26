# HTTP Transport Decision v20260427

`mikuproject-mcp` does not add an HTTP transport in the current MVP.

The current implementation target is local stdio. This keeps file access,
workspace storage, runtime invocation, and MCP client authority local to the
user's machine.

HTTP transport should be reconsidered only after these boundaries are explicitly
designed:

- session identity
- workspace isolation
- authentication
- storage policy
- upload lifecycle
- artifact lifecycle
- size limits
- cleanup
- audit
- runtime isolation

An HTTP deployment must preserve the same core tool names, input schemas, result
shapes, resource URI roles, artifact roles, diagnostics, and error categories as
the local stdio server. HTTP-specific behavior should be limited to transport,
session-scoped resources, upload handling, authentication, and storage policy.

Until those boundaries are documented, adding a network listener is out of scope
for the first MCP server version.
