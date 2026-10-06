#!/usr/bin/env node
/**
 * MCP server over stdio, standard library only.
 *
 * One JSON-RPC 2.0 message per line in, one per line out (the MCP stdio
 * transport). stdout carries protocol messages and nothing else — a stray
 * console.log here corrupts the stream — so diagnostics go to stderr.
 *
 * Reuses git.js and days.js, so the tools cannot disagree with the CLI and
 * git.js stays the only module that spawns a process.
 */
const path = require('node:path');
const readline = require('node:readline');
const { readCommitDates, readDefaultBranch } = require('./git');
const { bucketDays, offsetFor, ZONES } = require('./days');

const SERVER_INFO = { name: 'active-days', version: '1.0.0' };

// Newest first. Everything used here (initialize, tools/list, tools/call with
// text content) is unchanged across these versions.
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const PATH_ARG = {
  type: 'string',
  description: 'Repository path. Defaults to the directory the server was started in.',
};
const DATE_ARG = {
  type: 'string',
  description: 'Anything git accepts for --since/--until, e.g. 2026-09-21.',
};

const TOOLS = [
  {
    name: 'active_days',
    title: 'Active days',
    description:
      'Distinct calendar days a git repository was committed to, bucketed in the given timezone. ' +
      'Use this rather than counting commits when the question is about consistency or streaks.',
    inputSchema: {
      type: 'object',
      properties: {
        path: PATH_ARG,
        tz: {
          type: 'string',
          enum: Object.keys(ZONES),
          description: 'Timezone used to bucket days. Defaults to Asia/Kolkata.',
        },
        since: DATE_ARG,
        until: DATE_ARG,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'default_branch',
    title: 'Default branch',
    description:
      'The branch origin/HEAD points at, falling back to the current branch when origin/HEAD is not set. ' +
      '`source` says which was used.',
    inputSchema: {
      type: 'object',
      properties: { path: PATH_ARG },
      additionalProperties: false,
    },
  },
];

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

/** Serialized JSON as text for older clients, plus structuredContent. */
const toolResult = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
  structuredContent: data,
});

/** A tool error is a normal result the agent can read and correct, not a protocol error. */
const toolError = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

/** @returns {string|null} a message naming the first non-string argument */
function nonString(args, names) {
  for (const n of names) {
    if (args[n] !== undefined && typeof args[n] !== 'string') return `${n} must be a string`;
  }
  return null;
}

function activeDays(args, cwd) {
  const bad = nonString(args, ['path', 'tz', 'since', 'until']);
  if (bad) return toolError(bad);

  const tz = args.tz ?? 'Asia/Kolkata';
  const offset = offsetFor(tz);
  if (offset === null) {
    return toolError(`unknown timezone: ${tz} (known: ${Object.keys(ZONES).join(', ')})`);
  }

  const repo = path.resolve(cwd, args.path ?? '.');
  const dates = readCommitDates(repo, { since: args.since, until: args.until });
  if (dates === null) return toolError(`not a git repository: ${repo}`);

  const days = bucketDays(dates, offset);
  return toolResult({ repo, tz, activeDays: days.length, commits: dates.length, days });
}

function defaultBranch(args, cwd) {
  const bad = nonString(args, ['path']);
  if (bad) return toolError(bad);

  const repo = path.resolve(cwd, args.path ?? '.');
  const found = readDefaultBranch(repo);
  if (found === null) return toolError(`no branch found (not a repository, or detached HEAD): ${repo}`);
  return toolResult(found);
}

const HANDLERS = { active_days: activeDays, default_branch: defaultBranch };

function initialize(params) {
  const requested = params && params.protocolVersion;
  return {
    protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
    capabilities: { tools: { listChanged: false } },
    serverInfo: SERVER_INFO,
    instructions:
      'Use active_days for "how many days did I work on this repo" questions. ' +
      'Days are bucketed in Asia/Kolkata unless tz is given; only UTC and Asia/Kolkata are supported.',
  };
}

function callTool(id, params, cwd) {
  const name = params && params.name;
  if (!Object.prototype.hasOwnProperty.call(HANDLERS, name)) {
    return rpcError(id, -32602, `unknown tool: ${name}`);
  }
  const args = params.arguments === undefined ? {} : params.arguments;
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return rpcResult(id, toolError('arguments must be an object'));
  }
  return rpcResult(id, HANDLERS[name](args, cwd));
}

/**
 * Pure request -> response. Kept separate from the stdio loop so the protocol
 * can be tested without spawning a process.
 *
 * @returns {object|null} the response, or null for notifications and for
 *   messages that are not requests (we never send requests, so a response
 *   from the client has nothing to match)
 */
function handleMessage(msg, cwd = process.cwd()) {
  if (Array.isArray(msg)) return rpcError(null, -32600, 'batch requests are not supported');
  if (msg === null || typeof msg !== 'object' || typeof msg.method !== 'string') return null;
  if (!('id' in msg)) return null; // notifications/initialized, notifications/cancelled, ...

  switch (msg.method) {
    case 'initialize':
      return rpcResult(msg.id, initialize(msg.params));
    case 'ping':
      return rpcResult(msg.id, {});
    case 'tools/list':
      return rpcResult(msg.id, { tools: TOOLS });
    case 'tools/call':
      return callTool(msg.id, msg.params, cwd);
    default:
      return rpcError(msg.id, -32601, `method not found: ${msg.method}`);
  }
}

function serve({ input = process.stdin, output = process.stdout, cwd = process.cwd() } = {}) {
  const send = (obj) => output.write(`${JSON.stringify(obj)}\n`);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  rl.on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send(rpcError(null, -32700, 'parse error'));
      return;
    }
    let res;
    try {
      res = handleMessage(msg, cwd);
    } catch (err) {
      // Last resort so one bad request cannot take the server down.
      process.stderr.write(`active-days mcp: ${err && err.stack ? err.stack : err}\n`);
      res = msg && 'id' in msg ? rpcError(msg.id, -32603, 'internal error') : null;
    }
    if (res) send(res);
  });
  return rl;
}

if (require.main === module) {
  const i = process.argv.indexOf('--repo');
  serve({ cwd: i > -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : process.cwd() });
}

module.exports = { handleMessage, serve, TOOLS, PROTOCOL_VERSIONS };
