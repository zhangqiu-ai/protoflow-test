import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { projectRoot } from './module-config.mjs';

for (const command of ['test:electron', 'verify:electron']) {
  test(`${command} forwards --engine through both npm commands`, () => {
    // A missing entry stops at realpath, before loading an SDK, building, or
    // launching Electron. Reaching it proves the actual public command passed
    // both the flag and its value to the module's argument parser.
    const entry = path.join(projectRoot, `.missing-sdk-${randomUUID()}.mjs`);
    const env = { ...process.env };
    delete env.PROTOFLOW_ENGINE_ENTRY;
    const result = spawnSync('npm', ['run', command, '--', '--engine', entry], {
      cwd: projectRoot, env, encoding: 'utf8', timeout: 15000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ENOENT.*realpath/);
    assert.ok(result.stderr.includes(entry), result.stderr);
    assert.doesNotMatch(result.stderr, /Expected --engine|Set PROTOFLOW_ENGINE_ENTRY/);
  });
}
