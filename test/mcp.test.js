const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { handleMessage } = require('../src/mcp-server');

const SERVER = path.join(__dirname, '..', 'src', 'mcp-server.js');

/** A throwaway repo with one commit either side of the IST midnight boundary. */
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'active-days-'));
  const git = (args, env = {}) =>
    execFileSync('git', args, { cwd: dir, env: { ...process.env, ...env }, stdio: 'ignore' });
  git(['init', '-q', '-b', 'main']);
  for (const when of ['2026-09-22T10:00:00Z', '2026-09-22T20:30:00Z']) {
    git(
      ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false',
        'commit', '-q', '--allow-empty', '-m', when],
      { GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when },
    );
  }
  return dir;
}

/** Minimal MCP client over the server's real stdio. */
function startServer(cwd) {
  const child = spawn(process.execPath, [SERVER], { cwd, stdio: ['pipe', 'pipe', 'inherit'] });
  const pending = new Map();
  // JSON.parse throws on any non-protocol line, which fails the test (5.1).
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    const msg = JSON.parse(line);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  let nextId = 1;
  const write = (obj) => child.stdin.write(`${JSON.stringify(obj)}\n`);
  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        write({ jsonrpc: '2.0', id, method, params });
      });
    },
    notify: (method, params) => write({ jsonrpc: '2.0', method, params }),
    close() {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.stdin.end();
      return exited;
    },
  };
}

test('stdio: handshake, tools/list, and both tools across the IST boundary', { timeout: 15_000 }, async () => {
  const repo = makeRepo();
  const server = startServer(repo);
  try {
    const init = await server.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    assert.equal(init.result.serverInfo.name, 'active-days');
    assert.ok(init.result.capabilities.tools);
    server.notify('notifications/initialized');

    const list = await server.request('tools/list', {});
    assert.deepEqual(list.result.tools.map((t) => t.name).sort(), ['active_days', 'default_branch']);

    // 5.2: same answer the CLI gives — 20:30Z is the next day in IST.
    const ist = await server.request('tools/call', { name: 'active_days', arguments: { tz: 'Asia/Kolkata' } });
    assert.deepEqual(ist.result.structuredContent.days, ['2026-09-22', '2026-09-23']);
    assert.equal(ist.result.structuredContent.commits, 2);
    assert.deepEqual(JSON.parse(ist.result.content[0].text), ist.result.structuredContent);

    const utc = await server.request('tools/call', { name: 'active_days', arguments: { tz: 'UTC' } });
    assert.deepEqual(utc.result.structuredContent.days, ['2026-09-22']);

    // 3.1 through MCP: only the 20:30Z commit is after 15:00Z.
    const since = await server.request('tools/call', {
      name: 'active_days',
      arguments: { tz: 'Asia/Kolkata', since: '2026-09-22 15:00:00 +0000' },
    });
    assert.deepEqual(since.result.structuredContent.days, ['2026-09-23']);

    // 5.3: no origin in a fresh repo, so the current branch is reported.
    const branch = await server.request('tools/call', { name: 'default_branch', arguments: {} });
    assert.deepEqual(branch.result.structuredContent, { branch: 'main', source: 'HEAD' });
  } finally {
    await server.close();
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('5.4: bad arguments are tool errors, not protocol errors', () => {
  const tz = handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'active_days', arguments: { tz: 'Mars/Olympus' } } });
  assert.equal(tz.result.isError, true);
  assert.match(tz.result.content[0].text, /unknown timezone: Mars\/Olympus/);

  const type = handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'active_days', arguments: { since: 20260921 } } });
  assert.equal(type.result.isError, true);
  assert.match(type.result.content[0].text, /since must be a string/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'not-a-repo-'));
  try {
    const repo = handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'active_days', arguments: { path: dir } } });
    assert.equal(repo.result.isError, true);
    assert.match(repo.result.content[0].text, /not a git repository/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('5.5: unknown tools and methods are JSON-RPC errors; notifications get no reply', () => {
  const tool = handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'rm_rf' } });
  assert.equal(tool.error.code, -32602);

  const method = handleMessage({ jsonrpc: '2.0', id: 2, method: 'resources/list' });
  assert.equal(method.error.code, -32601);

  assert.equal(handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
});

test('initialize falls back to the newest supported version for an unknown one', () => {
  const res = handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.equal(res.result.protocolVersion, '2025-11-25');
});
