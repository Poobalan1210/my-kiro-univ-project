---
inclusion: fileMatch
fileMatchPattern: "src/mcp-server.js"
---

# MCP server rules

Loaded only when `src/mcp-server.js` is in context.

- stdout is the protocol stream. Never `console.log` in this file; write
  diagnostics with `process.stderr.write`, so that the client never receives a
  line that is not JSON-RPC.

  ```js
  // Good
  process.stderr.write(`active-days mcp: ${err.message}\n`);

  // Bad — the client fails to parse this line and drops the connection
  console.log('got request', msg);
  ```

- Bad tool arguments return `toolError(message)` (`isError: true`). Reserve
  JSON-RPC errors for unknown methods and unknown tool names.
- A new tool needs four things in the same change: an entry in `TOOLS`, a row in
  the MCP table in `design.md`, a test in `test/mcp.test.js`, and a line in
  `power-active-days/skills/active-days/SKILL.md`.
