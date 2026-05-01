# HTTP Transport Decision v20260427

The original 2026-04-27 decision was that `mikuproject-mcp` should not add HTTP
transport to the first local stdio MVP.

As of 2026-05-01, `mikuproject-mcp` has a first localhost-oriented stateless MCP
Streamable HTTP entrypoint in addition to the local stdio entrypoint. This HTTP
entrypoint is an execution adapter for controlled local use. It rejects
client-provided host file path arguments and uses request-scoped temporary files
only as adapter-internal runtime inputs when the upstream CLI requires a path.
It is not a hosted multi-user deployment and does not change the source-of-truth
policy for project data.

Hosted or remotely reachable HTTP transport should be reconsidered only after
these boundaries are explicitly designed:

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

The current HTTP entrypoint keeps `mikuproject-mcp` as an execution
adapter, not a durable project store. The canonical WBS, workbook, patch, and
related project files are owned and persisted by the MCP client side. The HTTP
server should receive explicit input data or uploaded artifacts, place them in a
temporary controlled workspace, invoke the configured `mikuproject` runtime
through the same fixed command adapter policy as stdio, and return generated
artifacts, diagnostics, summaries, diffs, or updated workbook/state data to the
client.

The HTTP server should not become the source of truth for "current project"
state. Mutation-style tools should treat the provided base data as input and
return updated state or artifacts for the client to persist. Any server-side
state should be session-scoped or request-scoped, short-lived, and disposable.

Returned server-local artifact paths from the stateless HTTP entrypoint are
diagnostic references, not durable storage handles. A hosted or remote HTTP
profile that needs clients to retrieve generated artifacts after a tool response
must add an explicit download, resource-retention, or content-return policy.

HTTP requests should not rely on arbitrary host filesystem paths. The current
entrypoint rejects host path arguments for `tools/call`; use inline JSON or
Base64 content fields instead. Future hosted profiles can add upload
identifiers, session-scoped resource URIs, or controlled workspace-relative
paths inside server-managed temporary workspaces.

An HTTP deployment must preserve the same core tool names, input schemas, result
shapes, resource URI roles, artifact roles, diagnostics, and error categories as
the local stdio server. HTTP-specific behavior should be limited to transport,
session-scoped resources, upload handling, authentication, and storage policy.

Until the hosted-deployment boundaries are documented, binding the HTTP server
to public interfaces or treating it as a hosted project-state service remains
out of scope.
