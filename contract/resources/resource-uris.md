# Resource URI Conventions

Initial resource URI conventions:

- `mikuproject://spec/ai-json`
- `mikuproject://state/current`
- `mikuproject://state/{name}`
- `mikuproject://export/workbook-json`
- `mikuproject://export/project-xml`
- `mikuproject://export/project-xlsx`
- `mikuproject://projection/{name}`
- `mikuproject://report/wbs-markdown`
- `mikuproject://report/mermaid`
- `mikuproject://summary/{operationId}`
- `mikuproject://diagnostics/{operationId}`

Use product-specific resource URIs unless a client is expected to access a local
file directly.
