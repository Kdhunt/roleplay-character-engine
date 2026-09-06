import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, parseArgs, agentFor, fetchTrelloStatus, DISPATCHABLE_STATES, COMPLETE_STATE } from './dispatch-stories.mjs';

const story = (over = {}) => ({
  id: 'RCE-001', title: 'A story', kind: 'story', milestone: 'M0', module: 'contracts',
  status: 'Ready for Development', depends_on: [], source: 'https://trello.com/c/AAAAAAAA',
  targets: 'apps/api', contracts: ['docs/implementation/ARCHITECTURE.md'], acceptance: 'x', ...over,
});
const run = (stories, { done = [], issues = [] } = {}) => classify({
  stories,
  statusOf: s => s.status,
  done: new Set(done),
  issues: new Map(issues),
});
const ids = rows => rows.map(([s]) => s.id);

test('a dependency-free story in a non-dispatchable state is not ready', () => {
  const r = run([story({ id: 'RCE-054', status: 'Backlog' })]);
  assert.deepEqual(ids(r.ready), []);
  assert.deepEqual(ids(r.unscheduled), ['RCE-054']);
});

test('a dependency-free story in a dispatchable state is ready', () => {
  for (const status of DISPATCHABLE_STATES) {
    const r = run([story({ status })]);
    assert.deepEqual(ids(r.ready), ['RCE-001'], `expected ready in ${status}`);
  }
});

test('unmet dependencies block regardless of workflow state', () => {
  const r = run([story({ id: 'RCE-002', depends_on: ['RCE-001'] })]);
  assert.deepEqual(ids(r.blocked), ['RCE-002']);
  assert.deepEqual(r.blocked[0][1], ['RCE-001']);
});

test('a satisfied dependency unblocks', () => {
  const r = run([story({ id: 'RCE-002', depends_on: ['RCE-001'] })], { done: ['RCE-001'] });
  assert.deepEqual(ids(r.ready), ['RCE-002']);
});

test('workflow state is checked after dependencies, so a blocked story reports as blocked', () => {
  const r = run([story({ id: 'RCE-002', status: 'Backlog', depends_on: ['RCE-001'] })]);
  assert.deepEqual(ids(r.blocked), ['RCE-002']);
  assert.deepEqual(ids(r.unscheduled), []);
});

test('a closed issue does not mark a story done and does not unlock its dependents', () => {
  const stories = [story({ id: 'RCE-001' }), story({ id: 'RCE-002', depends_on: ['RCE-001'] })];
  const r = run(stories, { issues: [['RCE-001', { number: 7, state: 'closed' }]] });
  assert.deepEqual(ids(r.dispatched), ['RCE-001'], 'the closed issue still counts as dispatched');
  assert.deepEqual(ids(r.ready), [], 'RCE-002 must not become ready');
  assert.deepEqual(ids(r.blocked), ['RCE-002']);
});

test('an explicit completion override does unlock dependents', () => {
  const stories = [story({ id: 'RCE-001' }), story({ id: 'RCE-002', depends_on: ['RCE-001'] })];
  const r = run(stories, { done: ['RCE-001'] });
  assert.deepEqual(ids(r.ready), ['RCE-002']);
});

test('an open issue means dispatched, not ready', () => {
  const r = run([story()], { issues: [['RCE-001', { number: 3, state: 'open' }]] });
  assert.deepEqual(ids(r.dispatched), ['RCE-001']);
  assert.deepEqual(ids(r.ready), []);
});

test('epics are never dispatched', () => {
  const r = run([story({ id: 'RCE-044', kind: 'epic', module: 'epic' })]);
  assert.deepEqual([...ids(r.ready), ...ids(r.blocked), ...ids(r.unscheduled), ...ids(r.dispatched)], []);
});

test('live status overrides the snapshot in both directions', () => {
  const s = story({ status: 'Backlog' });
  const live = classify({ stories: [s], statusOf: () => 'Ready for Design', done: new Set(), issues: new Map() });
  assert.deepEqual(ids(live.ready), ['RCE-001'], 'live readiness beats a stale Backlog snapshot');
  const stale = classify({
    stories: [story({ status: 'Ready for Development' })],
    statusOf: () => 'In Development', done: new Set(), issues: new Map(),
  });
  assert.deepEqual(ids(stale.ready), [], 'live In Development beats a stale Ready snapshot');
});

test('Done is the only completion state', () => {
  assert.equal(COMPLETE_STATE, 'Done');
  assert.ok(!DISPATCHABLE_STATES.has('Done'));
  assert.ok(!DISPATCHABLE_STATES.has('Backlog'));
  assert.ok(!DISPATCHABLE_STATES.has('In Development'));
});

test('fetchTrelloStatus returns null without credentials rather than guessing', async () => {
  assert.equal(await fetchTrelloStatus({}), null);
  assert.equal(await fetchTrelloStatus({ TRELLO_API_KEY: 'k' }), null);
  assert.equal(await fetchTrelloStatus({ TRELLO_API_KEY: 'k', TRELLO_TOKEN: 't' }), null);
});

test('fetchTrelloStatus maps short links to list names and keeps the token out of the URL', async () => {
  const seen = [];
  const fake = async (url, init) => {
    seen.push({ url, auth: init.headers.authorization });
    const body = url.endsWith('/lists')
      ? [{ id: 'L1', name: 'Ready for Design' }, { id: 'L2', name: 'Done' }]
      : [{ shortLink: 'AAAAAAAA', idList: 'L1' }, { shortLink: 'BBBBBBBB', idList: 'L2' }];
    return { ok: true, json: async () => body };
  };
  const map = await fetchTrelloStatus(
    { TRELLO_API_KEY: 'k', TRELLO_TOKEN: 'secret', TRELLO_BOARD_ID: 'b' }, fake);
  assert.equal(map.get('AAAAAAAA'), 'Ready for Design');
  assert.equal(map.get('BBBBBBBB'), 'Done');
  for (const { url, auth } of seen) {
    assert.ok(!url.includes('secret'), 'credentials must not appear in the URL');
    assert.match(auth, /oauth_token="secret"/);
  }
});

test('parseArgs rejects unknown flags and bad limits', () => {
  assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);
  assert.throws(() => parseArgs(['--limit', '0']), /positive integer/);
  assert.throws(() => parseArgs(['--module']), /needs a value/);
  assert.deepEqual(parseArgs(['--limit', '3']).limit, 3);
});

test('release gates and epics route to the owner, design work to one agent', () => {
  assert.equal(agentFor(story({ kind: 'release_gate', module: 'release' })), 'owner');
  assert.equal(agentFor(story({ kind: 'design', module: 'web' })), 'claude');
  assert.equal(agentFor(story({ kind: 'story', module: 'web' })), 'copilot');
  assert.equal(agentFor(story({ kind: 'story', module: 'nonexistent' })), 'unassigned');
});
