# Runtime CLI Mapping

This table maps the initial MCP core tools to the Node.js and Java runtime CLI
surfaces.

Core MCP tools should stay within the operation range supported by both runtime
paths. Java-only operations are later optional extensions.

## Tool Naming Rule

MCP tool names are derived from the canonical CLI command tree.

Use `mikuproject.<cli command tokens joined by "_">`, omitting only the runtime
launcher (`node mikuproject.mjs` or `java -jar mikuproject.jar`). Hyphenated CLI
tokens become snake_case.

Examples:

- `ai spec` -> `mikuproject.ai_spec`
- `ai detect-kind` -> `mikuproject.ai_detect_kind`
- `state from-draft` -> `mikuproject.state_from_draft`
- `ai export project-overview` -> `mikuproject.ai_export_project_overview`
- `state apply-patch` -> `mikuproject.state_apply_patch`
- `export workbook-json` -> `mikuproject.export_workbook_json`

Do not invent shorter MCP tool names that hide the CLI command group. The group
name is part of the upstream operation vocabulary and keeps MCP, Node.js CLI,
Java CLI, tests, diagnostics, and Agent Skills documentation traceable.

## Initial Core Tools

| MCP tool | Node.js CLI | Java CLI | Core |
| --- | --- | --- | --- |
| `mikuproject.ai_spec` | `node mikuproject.mjs ai spec` | `java -jar mikuproject.jar ai spec` | yes |
| `mikuproject.ai_detect_kind` | `node mikuproject.mjs ai detect-kind --in <path>` | `java -jar mikuproject.jar ai detect-kind --in <path>` | yes |
| `mikuproject.state_from_draft` | `node mikuproject.mjs state from-draft --in <draft> --out <workbook>` | `java -jar mikuproject.jar state from-draft --in <draft> --out <workbook>` | yes |
| `mikuproject.ai_export_project_overview` | `node mikuproject.mjs ai export project-overview --in <workbook> --out <overview>` | `java -jar mikuproject.jar ai export project-overview --in <workbook> --out <overview>` | yes |
| `mikuproject.ai_export_task_edit` | `node mikuproject.mjs ai export task-edit --in <workbook> --task-uid <uid> --out <view>` | `java -jar mikuproject.jar ai export task-edit --in <workbook> --task-uid <uid> --out <view>` | yes |
| `mikuproject.ai_export_phase_detail` | `node mikuproject.mjs ai export phase-detail --in <workbook> --phase-uid <uid> --mode <scoped\|full> --root-task-uid <uid> --max-depth <n> --out <view>` | `java -jar mikuproject.jar ai export phase-detail --in <workbook> --phase-uid <uid> --mode <scoped\|full> --root-task-uid <uid> --max-depth <n> --out <view>` | yes |
| `mikuproject.ai_validate_patch` | `node mikuproject.mjs ai validate-patch --state <workbook> --in <patch> --diagnostics json` | `java -jar mikuproject.jar ai validate-patch --state <workbook> --in <patch>` | yes |
| `mikuproject.state_apply_patch` | `node mikuproject.mjs state apply-patch --state <workbook> --in <patch> --out <next>` | `java -jar mikuproject.jar state apply-patch --state <workbook> --in <patch> --out <next>` | yes |
| `mikuproject.state_diff` | `node mikuproject.mjs state diff --before <before> --after <after> --diagnostics json` | `java -jar mikuproject.jar state diff --before <before> --after <after>` | yes |
| `mikuproject.state_summarize` | `node mikuproject.mjs state summarize --in <workbook> --diagnostics json` | `java -jar mikuproject.jar state summarize --in <workbook>` | yes |
| `mikuproject.export_workbook_json` | `node mikuproject.mjs export workbook-json --in <workbook> --out <workbook-json>` | `java -jar mikuproject.jar export workbook-json --in <workbook> --out <workbook-json>` | yes |
| `mikuproject.export_xml` | `node mikuproject.mjs export xml --in <workbook> --out <project.xml>` | `java -jar mikuproject.jar export xml --in <workbook> --out <project.xml>` | yes |
| `mikuproject.export_xlsx` | `node mikuproject.mjs export xlsx --in <workbook> --out <project.xlsx>` | `java -jar mikuproject.jar export xlsx --in <workbook> --out <project.xlsx>` | yes |
| `mikuproject.import_xlsx` | `node mikuproject.mjs import xlsx --in <project.xlsx> --out <workbook>` | `java -jar mikuproject.jar import xlsx --in <project.xlsx> --out <workbook>` | yes |
| `mikuproject.report_wbs_markdown` | `node mikuproject.mjs report wbs-markdown --in <workbook> --out <report.md>` | `java -jar mikuproject.jar report wbs-markdown --in <workbook> --out <report.md>` | yes |
| `mikuproject.report_mermaid` | `node mikuproject.mjs report mermaid --in <workbook> --out <report.mmd>` | `java -jar mikuproject.jar report mermaid --in <workbook> --out <report.mmd>` | yes |

## Runtime Artifacts

The MCP server resolves runtime artifacts in this order:

1. `MIKUPROJECT_MCP_RUNTIME_JAVA`
2. `MIKUPROJECT_MCP_RUNTIME_NODE`
3. `runtime/mikuproject-java/mikuproject.jar`
4. `runtime/mikuproject-node/mikuproject.mjs`

Java is preferred when both runtimes are available. Node.js is the fallback for
core tools.

## Sources Checked

- `workplace/upstream/mikuproject/README.md`
- `workplace/upstream/mikuproject/docs/core-api-import-export-notes.md`
- `workplace/upstream/mikuproject-java/docs/runtime-java-cli.md`
- `workplace/upstream/mikuproject-skills/docs/upstream-mikuproject-java-cli-request.md`
- `workplace/upstream/mikuproject-skills/tests/mikuproject-core-api-smoke.test.js`
- `workplace/upstream/mikuproject-skills/tests/mikuproject-phase-b-smoke.test.js`
