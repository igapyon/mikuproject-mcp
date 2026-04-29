# Resource URI Conventions

Initial resource URI conventions:

- `mikuproject://spec/ai-json`
- `mikuproject://state/current`
- `mikuproject://state/{name}`
- `mikuproject://export/workbook-json`
- `mikuproject://export/project-xml`
- `mikuproject://export/project-xlsx`
- `mikuproject://projection/{name}`
- `mikuproject://projection/bundle`
- `mikuproject://report/wbs-xlsx`
- `mikuproject://report/daily-svg`
- `mikuproject://report/weekly-svg`
- `mikuproject://report/monthly-calendar-svg`
- `mikuproject://report/all`
- `mikuproject://report/wbs-markdown`
- `mikuproject://report/mermaid`
- `mikuproject://summary/{operationId}`
- `mikuproject://diagnostics/{operationId}`

Use product-specific resource URIs unless a client is expected to access a local
file directly.

Generated artifact resource URIs are returned only when the artifact is written
to the server-managed path backing that URI. When a tool receives a custom
`outputPath`, the result should return the generated file path without claiming
one of the fixed `mikuproject://` artifact URIs.
