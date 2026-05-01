# mikuproject-skills MCP Client Manual Check

この文書は、`mikuproject-skills` を開いた MCP client から、
local checkout の `mikuproject-mcp` を動作確認するための手動手順です。

ここでの役割は次の通りです。

- `mikuproject-skills`: Agent Skill の workflow layer
- MCP client: VS Code Copilot Chat、Codex、Claude Desktop などの MCP host
- `mikuproject-mcp`: MCP server adapter

厳密には `mikuproject-skills` 自体は MCP client ではありません。
この手順では、MCP client で `mikuproject-skills` workspace を開き、
その workspace から `mikuproject-mcp` server を起動して確認します。

## 1. 前提

同じ親ディレクトリに次の checkout がある前提です。

```text
/Users/igapyon/Documents/git/
  mikuproject-skills/
  mikuproject-mcp/
```

`mikuproject-mcp` 側を先に build します。

```sh
cd /Users/igapyon/Documents/git/mikuproject-mcp
npm install
npm run build
```

HTTP E2E も確認する場合は次を実行します。

```sh
node --test --test-concurrency=1 packages/node/dist/test/httpE2e.test.js
```

この E2E は一時的に HTTP server を起動して終了します。
常駐 server を起動するコマンドではありません。

## 2. MCP Client Workspace

MCP client では `mikuproject-skills` を workspace として開きます。

```text
/Users/igapyon/Documents/git/mikuproject-skills
```

生成物確認用の作業ディレクトリを作ります。

```sh
cd /Users/igapyon/Documents/git/mikuproject-skills
mkdir -p workplace/mikuproject-mcp-client/input
mkdir -p workplace/mikuproject-mcp-client/state
mkdir -p workplace/mikuproject-mcp-client/report
```

## 3. VS Code MCP 設定例

VS Code / Copilot Chat で確認する場合は、
`mikuproject-skills` repository root に `.vscode/mcp.json` を置きます。

### stdio で接続する場合

```json
{
  "servers": {
    "mikuproject": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/igapyon/Documents/git/mikuproject-mcp/packages/node/dist/index.js"
      ],
      "env": {
        "MIKUPROJECT_MCP_WORKSPACE": "${workspaceFolder}/workplace/mikuproject-mcp-client"
      }
    }
  }
}
```

この設定は、built local checkout の stdio MCP server を起動します。
release tarball や HTTP endpoint は使いません。

### HTTP で接続する場合

HTTP transport で接続する場合は、MCP server を別プロセスで起動します。

```sh
cd /Users/igapyon/Documents/git/mikuproject-mcp
npm run build
MIKUPROJECT_MCP_HTTP_HOST=127.0.0.1 \
MIKUPROJECT_MCP_HTTP_PORT=3000 \
MIKUPROJECT_MCP_HTTP_ENDPOINT=/mcp \
node packages/node/dist/http.js
```

そのうえで、`mikuproject-skills` 側の `.vscode/mcp.json` を次の形にします。

```json
{
  "servers": {
    "mikuproject": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

この設定では、VS Code は HTTP endpoint へ接続するだけです。
server process の起動、停止、port 変更は別途管理します。

設定後、VS Code で次を実行します。

```text
Developer: Reload Window
```

その後、Command Palette で次を開きます。

```text
MCP: List Servers
```

期待:

- `mikuproject` server が見える
- state が running、または start / restart 可能
- stdio の場合、起動 command が `node .../mikuproject-mcp/packages/node/dist/index.js`
- stdio の場合、workspace が `workplace/mikuproject-mcp-client` を向いている
- HTTP の場合、接続先 URL が `http://127.0.0.1:3000/mcp`

## 4. Codex MCP 設定例

Codex で確認する場合は、Codex の MCP server 設定に次と同等の server を登録します。
既に古い `mikuproject` server 設定がある場合は、先に参照先を確認してください。

```toml
[mcp_servers.mikuproject]
command = "node"
args = ["/Users/igapyon/Documents/git/mikuproject-mcp/packages/node/dist/index.js"]

[mcp_servers.mikuproject.env]
MIKUPROJECT_MCP_WORKSPACE = "/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client"
```

古い release tarball を参照している設定が残っていると、tool list が古く見えます。
その場合は MCP client 側で server を restart するか、client を再起動します。

## 5. 最初の確認

MCP client の agent/chat で次を依頼します。

```text
mikuproject MCP server の tool list を確認して。使える mikuproject* tool 名を列挙して。
```

少なくとも次が見えることを確認します。

- `mikuproject_ai_spec`
- `mikuproject_ai_detect_kind`
- `mikuproject_state_from_draft`
- `mikuproject_state_apply_patch`
- `mikuproject_state_summarize`
- `mikuproject_export_workbook_json`
- `mikuproject_export_xml`
- `mikuproject_export_xlsx`
- `mikuproject_import_xlsx`
- `mikuproject_report_wbs_markdown`
- `mikuproject_report_mermaid`
- `mikuproject_report_wbs_xlsx`
- `mikuproject_report_daily_svg`
- `mikuproject_report_weekly_svg`
- `mikuproject_report_monthly_calendar_svg`
- `mikuproject_report_all`

次に prompt list を確認します。

```text
mikuproject MCP server の prompt list を確認して。使える mikuproject* prompt 名を列挙して。
```

期待:

- `mikuproject_create_project_draft`
- `mikuproject_revise_state_with_patch`
- `mikuproject_review_artifact_diagnostics`

## 6. Version と AI Spec

まず version を確認します。

```text
mikuproject_version を呼び出して、結果の ok / operation / stdout を短く確認して。
```

次に AI spec を確認します。

```text
mikuproject_ai_spec を呼び出して、結果の ok / operation / artifacts を短く確認して。
```

期待:

- hard error にならない
- `operation` が依頼した tool 名と一致する
- `mikuproject://spec/ai-json` または AI spec の内容を参照できる

## 7. Draft 入力を作る

次の JSON を
`/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/input/sample-draft.json`
に保存します。

```json
{
  "view_type": "project_draft_view",
  "project": {
    "name": "MCP Client Manual Test",
    "planned_start": "2026-05-01",
    "planned_finish": "2026-05-04",
    "schedule_from_start": true
  },
  "tasks": [
    {
      "uid": "draft-1",
      "name": "Planning",
      "parent_uid": null,
      "position": 0,
      "planned_start": "2026-05-01",
      "planned_finish": "2026-05-01"
    },
    {
      "uid": "draft-2",
      "name": "Implementation",
      "parent_uid": null,
      "position": 1,
      "planned_start": "2026-05-02",
      "planned_finish": "2026-05-03",
      "predecessor_uids": ["draft-1"]
    },
    {
      "uid": "draft-3",
      "name": "Review",
      "parent_uid": null,
      "position": 2,
      "planned_start": "2026-05-04",
      "planned_finish": "2026-05-04",
      "predecessor_uids": ["draft-2"]
    }
  ]
}
```

## 8. Draft から Workbook State を作る

MCP client で次を依頼します。

```text
mikuproject_state_from_draft を使って、
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/input/sample-draft.json
から workbook state を作って。
outputPath は
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
にして。
結果の ok / operation / artifacts を確認して。
```

期待:

- `operation` が `mikuproject_state_from_draft`
- `state/manual-workbook.json` が生成される
- artifact role が workbook state として扱われる

HTTP transport で確認する場合は、host path 引数を使わず、上記 JSON を
`draftContent` として渡し、`outputMode: "content"` を指定します。
この場合、生成 workbook JSON はファイルではなく response に含まれます。

HTTP content-mode の期待:

- `operation` が `mikuproject_state_from_draft`
- `ok` が `true`
- workbook JSON は parsed operation payload の top-level `text` ではなく、
  `artifacts[]` の `role === "workbook_state"` の `text` に入る
- `stdout` にも同じ text output が入ることがあるが、primary output は role で選ぶ
- `operation_summary` / `diagnostics_log` も `artifacts[]` に入るため、配列位置ではなく role で選ぶ

生成ファイルを shell でも確認します。

```sh
ls -lh /Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
```

HTTP content-mode の場合、この `ls` は該当しません。必要なら response から取得した
`workbook_state.text` を別途ファイル保存して確認します。

## 9. Report Tools を確認する

WBS Markdown report:

```text
mikuproject_report_wbs_markdown を使って、
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
から WBS Markdown report を作って。
outputPath は
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/report/manual-wbs.md
にして。
結果の ok / operation / artifacts を確認して。
```

WBS XLSX report:

```text
mikuproject_report_wbs_xlsx を使って、
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
から WBS XLSX report を作って。
outputPath は
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/report/manual-wbs.xlsx
にして。
結果の ok / operation / artifacts を確認して。
```

Daily SVG:

```text
mikuproject_report_daily_svg を使って、
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
から daily SVG を作って。
outputPath は
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/report/manual-daily.svg
にして。
```

Weekly SVG:

```text
mikuproject_report_weekly_svg を使って、
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
から weekly SVG を作って。
outputPath は
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/report/manual-weekly.svg
にして。
```

期待:

- 各 tool が hard error なく完了する
- 指定した `outputPath` に成果物が生成される
- `WBS XLSX report` と `mikuproject_export_xlsx` は別物として扱う

HTTP transport で report tools を確認する場合は、`workbookPath` ではなく
`workbookContent` を使います。

- WBS Markdown / Mermaid / SVG などの text output は `outputMode: "content"` を指定し、
  `artifacts[]` の `role === "report_output"` の `text` を読む
- WBS XLSX / ZIP bundle などの binary output は `outputMode: "base64"` を指定し、
  `artifacts[]` の `role === "report_output"` の `base64` を読む
- `payload.text` は期待しない

生成ファイルを shell でも確認します。

```sh
ls -lh /Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/report
```

## 10. mikuproject-skills 側の policy 確認

`mikuproject-skills` の会話では、MCP backend を明示したい場合に
`mcp-only` または `mcp-preferred` を指定します。

例:

```text
mikuproject、mcp-only で
/Users/igapyon/Documents/git/mikuproject-skills/workplace/mikuproject-mcp-client/state/manual-workbook.json
を要約して。
```

期待:

- MCP 対応済み operation は `mikuproject-mcp` の tool を使う
- `mcp-only` では CLI backend に自動 fallback しない
- MCP 未対応 operation は未対応として扱われる

## 11. HTTP 版を手動確認する場合

HTTP entrypoint を直接確認したい場合は、`mikuproject-mcp` 側で起動します。

```sh
cd /Users/igapyon/Documents/git/mikuproject-mcp
npm run build
MIKUPROJECT_MCP_HTTP_HOST=127.0.0.1 \
MIKUPROJECT_MCP_HTTP_PORT=3000 \
node packages/node/dist/http.js
```

別 terminal から initialize を送ります。

```sh
curl -i -X POST http://127.0.0.1:3000/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0.0.0"}}}'
```

initialized notification を送ります。

```sh
curl -i -X POST http://127.0.0.1:3000/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}'
```

tool list:

```sh
curl -i -X POST http://127.0.0.1:3000/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'mcp-protocol-version: 2025-06-18' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

HTTP tools/call では host path 引数を使えません。
`statePath`、`workbookPath`、`inputPath`、`outputPath` ではなく、
`stateContent`、`workbookContent`、`draftContent`、`inputBase64` などの inline content と
`outputMode: "content"` または `outputMode: "base64"` を使います。

`mikuproject_state_from_draft` の HTTP content-mode response は次の形になります。

```json
{
  "ok": true,
  "operation": "mikuproject_state_from_draft",
  "artifacts": [
    {
      "role": "workbook_state",
      "text": "{...mikuproject_workbook_json...}",
      "mimeType": "application/json"
    },
    {
      "role": "operation_summary",
      "text": "{...}",
      "mimeType": "application/json"
    },
    {
      "role": "diagnostics_log",
      "text": "{...}",
      "mimeType": "application/json"
    }
  ],
  "stdout": "{...mikuproject_workbook_json...}"
}
```

WBS Markdown などの report では primary artifact role は `report_output` です。
配列位置ではなく role で primary output を選びます。

## 12. 完了条件

次を確認できたら完了です。

- MCP client から `mikuproject` server が見える
- stdio の場合、server が local checkout の `packages/node/dist/index.js` から起動している
- HTTP の場合、server が `http://127.0.0.1:3000/mcp` で応答している
- `mikuproject_version` が通る
- `mikuproject_ai_spec` が通る
- tool list に `mikuproject_report_wbs_markdown` と `mikuproject_report_wbs_xlsx` が見える
- prompt list に `mikuproject_create_project_draft` が見える
- `mikuproject_state_from_draft` で workbook state が生成される
- stdio/path-mode の場合、report tools で `workplace/mikuproject-mcp-client/report/` 以下に成果物が生成される
- HTTP/content-mode の場合、primary output を `workbook_state.text` / `report_output.text` / `report_output.base64` から取得できる

## 13. トラブルシュート

古い tool list が見える:

- MCP client が古い release tarball を起動している可能性があります
- Codex の user config に古い `[mcp_servers.mikuproject]` が残っていないか確認します
- MCP server を stop / restart し、必要なら MCP client を再起動します

`packages/node/dist/index.js` が見つからない:

- `mikuproject-mcp` 側で `npm run build` を実行します

HTTP E2E が `listen EPERM` で失敗する:

- 実行環境が local port bind を制限しています
- sandbox 外、または local network bind が許可された環境で実行します

HTTP tools/call で path 引数が拒否される:

- 現行 HTTP transport は stateless です
- host path 引数は拒否されます
- inline content と content/base64 output mode を使います
