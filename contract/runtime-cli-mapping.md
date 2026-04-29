# Runtime CLI Mapping

This table maps the initial MCP core tools to the Node.js and Java runtime CLI
surfaces.

Core MCP tools should stay within the operation range supported by both runtime
paths. Java-only operations are later optional extensions.

## Tool Naming Rule

MCP tool names are derived from the canonical CLI command tree.

Use `mikuproject_<cli command tokens joined by "_">`, omitting only the runtime
launcher (`node mikuproject.mjs` or `java -jar mikuproject.jar`). Hyphenated CLI
tokens become snake_case.

Examples:

- `--version` -> `mikuproject_version`
- `ai spec` -> `mikuproject_ai_spec`
- `ai detect-kind` -> `mikuproject_ai_detect_kind`
- `state from-draft` -> `mikuproject_state_from_draft`
- `ai export project-overview` -> `mikuproject_ai_export_project_overview`
- `state apply-patch` -> `mikuproject_state_apply_patch`
- `export workbook-json` -> `mikuproject_export_workbook_json`

Do not invent shorter MCP tool names that hide the CLI command group. The group
name is part of the upstream operation vocabulary and keeps MCP, Node.js CLI,
Java CLI, tests, diagnostics, and Agent Skills documentation traceable.

## Initial Core Tools

| MCP tool | Node.js CLI | Java CLI | Core |
| --- | --- | --- | --- |
| `mikuproject_version` | `node mikuproject.mjs --version` | `java -jar mikuproject.jar --version` | yes |
| `mikuproject_ai_spec` | `node mikuproject.mjs ai spec` | `java -jar mikuproject.jar ai spec` | yes |
| `mikuproject_ai_detect_kind` | `node mikuproject.mjs ai detect-kind --in <path>` | `java -jar mikuproject.jar ai detect-kind --in <path>` | yes |
| `mikuproject_state_from_draft` | `node mikuproject.mjs state from-draft --in <draft> --out <workbook>` | `java -jar mikuproject.jar state from-draft --in <draft> --out <workbook>` | yes |
| `mikuproject_ai_export_project_overview` | `node mikuproject.mjs ai export project-overview --in <workbook> --out <overview>` | `java -jar mikuproject.jar ai export project-overview --in <workbook> --out <overview>` | yes |
| `mikuproject_ai_export_bundle` | `node mikuproject.mjs ai export bundle --in <workbook> --out <bundle>` | `java -jar mikuproject.jar ai export bundle --in <workbook> --out <bundle>` | yes |
| `mikuproject_ai_export_task_edit` | `node mikuproject.mjs ai export task-edit --in <workbook> --task-uid <uid> --out <view>` | `java -jar mikuproject.jar ai export task-edit --in <workbook> --task-uid <uid> --out <view>` | yes |
| `mikuproject_ai_export_phase_detail` | `node mikuproject.mjs ai export phase-detail --in <workbook> --phase-uid <uid> --mode <scoped\|full> --root-task-uid <uid> --max-depth <n> --out <view>` | `java -jar mikuproject.jar ai export phase-detail --in <workbook> --phase-uid <uid> --mode <scoped\|full> --root-task-uid <uid> --max-depth <n> --out <view>` | yes |
| `mikuproject_ai_validate_patch` | `node mikuproject.mjs ai validate-patch --state <workbook> --in <patch> --diagnostics json` | `java -jar mikuproject.jar ai validate-patch --state <workbook> --in <patch>` | yes |
| `mikuproject_state_apply_patch` | `node mikuproject.mjs state apply-patch --state <workbook> --in <patch> --out <next>` | `java -jar mikuproject.jar state apply-patch --state <workbook> --in <patch> --out <next>` | yes |
| `mikuproject_state_diff` | `node mikuproject.mjs state diff --before <before> --after <after> --diagnostics json` | `java -jar mikuproject.jar state diff --before <before> --after <after>` | yes |
| `mikuproject_state_summarize` | `node mikuproject.mjs state summarize --in <workbook> --diagnostics json` | `java -jar mikuproject.jar state summarize --in <workbook>` | yes |
| `mikuproject_export_workbook_json` | `node mikuproject.mjs export workbook-json --in <workbook> --out <workbook-json>` | `java -jar mikuproject.jar export workbook-json --in <workbook> --out <workbook-json>` | yes |
| `mikuproject_export_xml` | `node mikuproject.mjs export xml --in <workbook> --out <project.xml>` | `java -jar mikuproject.jar export xml --in <workbook> --out <project.xml>` | yes |
| `mikuproject_export_xlsx` | `node mikuproject.mjs export xlsx --in <workbook> --out <project.xlsx>` | `java -jar mikuproject.jar export xlsx --in <workbook> --out <project.xlsx>` | yes |
| `mikuproject_import_xlsx` | `node mikuproject.mjs import xlsx --in <project.xlsx> --out <workbook>` | `java -jar mikuproject.jar import xlsx --in <project.xlsx> --out <workbook>` | yes |
| `mikuproject_report_wbs_xlsx` | `node mikuproject.mjs report wbs-xlsx --in <workbook> --out <report.xlsx>` | `java -jar mikuproject.jar report wbs-xlsx --in <workbook> --out <report.xlsx>` | yes |
| `mikuproject_report_daily_svg` | `node mikuproject.mjs report daily-svg --in <workbook> --out <report.svg>` | `java -jar mikuproject.jar report daily-svg --in <workbook> --out <report.svg>` | yes |
| `mikuproject_report_weekly_svg` | `node mikuproject.mjs report weekly-svg --in <workbook> --out <report.svg>` | `java -jar mikuproject.jar report weekly-svg --in <workbook> --out <report.svg>` | yes |
| `mikuproject_report_monthly_calendar_svg` | `node mikuproject.mjs report monthly-calendar-svg --in <workbook> --out <report.zip>` | `java -jar mikuproject.jar report monthly-calendar-svg --in <workbook> --out <report.zip>` | yes |
| `mikuproject_report_all` | `node mikuproject.mjs report all --in <workbook> --out <report-bundle.zip>` | `java -jar mikuproject.jar report all --in <workbook> --out <report-bundle.zip>` | yes |
| `mikuproject_report_wbs_markdown` | `node mikuproject.mjs report wbs-markdown --in <workbook> --out <report.md>` | `java -jar mikuproject.jar report wbs-markdown --in <workbook> --out <report.md>` | yes |
| `mikuproject_report_mermaid` | `node mikuproject.mjs report mermaid --in <workbook> --out <report.mmd>` | `java -jar mikuproject.jar report mermaid --in <workbook> --out <report.mmd>` | yes |

The report operations are core MCP tools when the configured runtime advertises
the corresponding CLI commands. The bundled Java and Node runtime artifacts were
checked with `--help` on 2026-04-29 and both list `report wbs-xlsx`, `report
daily-svg`, `report weekly-svg`, `report monthly-calendar-svg`, and `report all`.

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
