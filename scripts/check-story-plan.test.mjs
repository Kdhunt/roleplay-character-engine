import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePlan, hydratePlan } from './check-story-plan.mjs';

const record = (id, deps = []) => ({ id, title: `Story ${id}`, source: `https://trello.com/c/Abcd${id.slice(-3)}X`, kind: 'story', milestone: 'M0', status: 'Backlog', depends_on: deps, module: 'domain', targets: 'packages/domain', contracts: ['docs/contract.md'], acceptance: 'Validate the positive and negative fixture.' });
const plan = () => ({ format: 'rce-story-plan', schema_version: 1, as_of: '2026-09-05', repository: 'Kdhunt/roleplay-character-engine', scope: 'Test fixture only', aliases: {}, stories: [record('RCE-001'), record('RCE-002', ['RCE-001'])] });
const has = (p, pattern, options) => assert.ok(validatePlan(p, options).errors.some(e => pattern.test(e)));

test('valid plan returns dependency-first ordering', () => {
  const p = plan(); p.stories.reverse();
  const result = validatePlan(p);
  assert.deepEqual(result.errors, []); assert.deepEqual(result.order, ['RCE-001', 'RCE-002']);
});
test('duplicate IDs are rejected', () => { const p = plan(); p.stories.push(record('RCE-001')); has(p, /Duplicate story ID/); });
test('normalized duplicate titles are rejected', () => { const p = plan(); p.stories[1].title = `  ${p.stories[0].title.toUpperCase()}  `; has(p, /duplicate title/); });
test('two stories cannot reference the same source card', () => { const p = plan(); p.stories[1].source = p.stories[0].source + '/renamed'; has(p, /duplicate source/); });
test('dangling dependency is rejected', () => { const p = plan(); p.stories[1].depends_on = ['RCE-999']; has(p, /missing\/archived dependency/); });
test('dependency cycle is rejected', () => { const p = plan(); p.stories[0].depends_on = ['RCE-002']; has(p, /Dependency cycle/); });
test('self dependency is rejected', () => { const p = plan(); p.stories[0].depends_on = ['RCE-001']; has(p, /Dependency cycle/); });
test('epics cannot substitute for bounded predecessors', () => { const p = plan(); p.stories[0].kind = 'epic'; has(p, /depends on an epic/); });
test('missing contracts are rejected', () => has(plan(), /missing contract file/, { fileExists: () => false }));
test('traversal paths are rejected', () => { const p = plan(); p.stories[0].contracts = ['../secret']; has(p, /unsafe contract/); });
test('invalid workflow state is rejected', () => { const p = plan(); p.stories[0].status = 'Probably done'; has(p, /invalid workflow/); });
test('empty acceptance is rejected', () => { const p = plan(); p.stories[0].acceptance = ''; has(p, /missing acceptance/); });
test('archived alias must not be active or target a missing story', () => { const p = plan(); p.aliases = { 'RCE-001': 'RCE-999' }; has(p, /Archived alias still active/); has(p, /Alias target missing/); });
test('valid archived redirect is accepted', () => { const p = plan(); p.aliases = { 'RCE-003': 'RCE-001' }; assert.deepEqual(validatePlan(p).errors, []); });
test('missing or duplicated narrative sections are rejected', () => { has(plan(), /expected exactly one/, { storyText: '### RCE-001: title\n### RCE-001: duplicate' }); });
test('malformed plan and dependency list fail cleanly', () => { has(null, /Invalid story-plan/); const p = plan(); p.stories[0].depends_on = 'RCE-002'; has(p, /invalid dependency list/); });
test('real repository snapshot is acyclic and has 89 matching story sections', () => {
  const p = hydratePlan(JSON.parse(readFileSync(new URL('../docs/implementation/story-plan.json', import.meta.url), 'utf8')));
  const storyText = readFileSync(new URL('../docs/implementation/STORIES.md', import.meta.url), 'utf8');
  const result = validatePlan(p, { storyText });
  assert.equal(p.stories.length, 89); assert.deepEqual(result.errors, []); assert.equal(result.order.length, 89);
  assert.equal(p.aliases['RCE-057'], 'RCE-010');
});
