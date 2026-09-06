import { readFileSync } from 'node:fs';
import { hydratePlan, validatePlan } from './check-story-plan.mjs';

/**
 * Routing policy, not an implementation contract: edit this table freely.
 * Design stories stay with one agent on purpose; three models settling the same
 * contract independently is how a specification acquires three readings.
 */
const AGENT_BY_MODULE = {
  contracts: 'claude', persistence: 'claude', identity: 'claude',
  character: 'codex', simulation: 'codex', memory: 'codex', context: 'codex', turns: 'codex', validation: 'codex',
  web: 'copilot', adapters: 'copilot', platform: 'copilot', tests: 'copilot',
  epic: 'owner', release: 'owner',
};
const DESIGN_AGENT = 'claude';
const GATE_AGENT = 'owner';
const LABEL_COLOR = { rce: '3E6D9C', agent: 'A6572E', module: '6E675E', milestone: '2A2724' };

/** Workflow states that represent work actually available for handoff (QUALITY.md). */
export const DISPATCHABLE_STATES = new Set(['Ready for Design', 'Ready for Development']);
/** The only state that means a story is finished. Trello owns delivery status (AGENTS.md). */
export const COMPLETE_STATE = 'Done';

const API = 'https://api.github.com';
const usage = `Usage: node scripts/dispatch-stories.mjs [--order] [--preview] [--create] [--limit N]
                                       [--module M] [--milestone M0] [--agent A] [--story RCE-061]
                                       [--repo owner/name] [--assume-done RCE-001,...] [--assignee login]
Dry run by default. --create needs GITHUB_TOKEN with issue write access.
Live Trello status is used when TRELLO_API_KEY, TRELLO_TOKEN and TRELLO_BOARD_ID are set;
otherwise the repository snapshot is used and the fallback is disclosed.`;

export function parseArgs(argv) {
  const opts = { assumeDone: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => { const v = argv[++i]; if (!v) throw new Error(`${arg} needs a value`); return v; };
    if (arg === '--order') opts.order = true;
    else if (arg === '--preview') opts.preview = true;
    else if (arg === '--create') opts.create = true;
    else if (arg === '--limit') opts.limit = Number(value());
    else if (arg === '--module') opts.module = value();
    else if (arg === '--milestone') opts.milestone = value();
    else if (arg === '--agent') opts.agent = value();
    else if (arg === '--story') opts.story = value();
    else if (arg === '--repo') opts.repo = value();
    else if (arg === '--assignee') opts.assignee = value();
    else if (arg === '--assume-done') opts.assumeDone = value().split(',').map(s => s.trim()).filter(Boolean);
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else throw new Error(`Unknown argument: ${arg}\n${usage}`);
  }
  if (opts.limit !== undefined && (!Number.isInteger(opts.limit) || opts.limit < 1)) throw new Error('--limit needs a positive integer');
  return opts;
}

export const agentFor = story => story.kind === 'release_gate' ? GATE_AGENT
  : story.kind === 'design' ? DESIGN_AGENT
  : AGENT_BY_MODULE[story.module] ?? 'unassigned';

const labelsFor = story => ['rce', `agent:${agentFor(story)}`, `module:${story.module}`, `milestone:${story.milestone}`];
const titleFor = story => `${story.id}: ${story.title}`;

/**
 * Decide what may be handed off. Two rules the reviewer was right to insist on:
 * dependency satisfaction alone is not readiness, and a closed issue is not completion.
 * Pure so it can be tested without a network or a repository.
 */
export function classify({ stories, statusOf, done, issues, dispatchable = DISPATCHABLE_STATES }) {
  const ready = [], blocked = [], unscheduled = [], dispatched = [];
  for (const story of stories) {
    if (story.kind === 'epic') continue;                       // AGENTS.md: never assign a whole epic
    if (done.has(story.id)) continue;
    if (issues.has(story.id)) { dispatched.push([story, issues.get(story.id)]); continue; }
    const blockedBy = story.depends_on.filter(d => !done.has(d));
    if (blockedBy.length) { blocked.push([story, blockedBy]); continue; }
    const status = statusOf(story);
    if (!dispatchable.has(status)) { unscheduled.push([story, status]); continue; }
    ready.push([story, []]);
  }
  return { ready, blocked, unscheduled, dispatched };
}

function bodyFor(plan, story, source) {
  const deps = story.depends_on.length ? story.depends_on.map(d => `- ${d}`).join('\n') : '- none';
  return `**${story.id}** · ${story.kind} · ${story.milestone} · module \`${story.module}\`
Source card: ${story.source}
Delivery status: ${source}

## Dependencies
${deps}

## Targets
${story.targets}

## Required contracts
${story.contracts.map(c => `- \`${c}\``).join('\n')}

## Outcome and acceptance
${story.acceptance}

## Before coding
Read \`AGENTS.md\` and the required contracts above. Run \`node scripts/show-story.mjs ${story.id}\` for the
authoritative handoff. Use \`STORY_TEMPLATE.md\` to split contract/fixtures, implementation and
integration/verification into bounded tasks — do not implement the whole story as one undivided change.

The PR must follow \`.github/pull_request_template.md\`: actual executed command results, positive and
negative tests, migration and rollback impact. Readiness is not completion, and a specification is not
implemented software.`;
}

async function github(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'rce-dispatch-stories',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${detail.slice(0, 300)}`);
  }
  return response.status === 204 ? null : response.json();
}

/** Live delivery status keyed by Trello short link, or null when access is unavailable. */
export async function fetchTrelloStatus(env = process.env, fetchImpl = fetch) {
  const { TRELLO_API_KEY: key, TRELLO_TOKEN: token, TRELLO_BOARD_ID: board } = env;
  if (!key || !token || !board) return null;
  const headers = { authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"` };
  const get = async (path) => {
    const r = await fetchImpl(`https://api.trello.com/1/boards/${board}/${path}`, { headers });
    if (!r.ok) throw new Error(`Trello ${path} failed: ${r.status}`);
    return r.json();
  };
  const [lists, cards] = await Promise.all([get('lists'), get('cards?fields=shortLink,idList')]);
  const listName = new Map(lists.map(l => [l.id, l.name]));
  return new Map(cards.map(c => [c.shortLink, listName.get(c.idList)]));
}

/** Existing issues keyed by RCE id, so re-running never opens a duplicate. */
async function loadIssues(repo, token) {
  const byStory = new Map();
  for (let page = 1; page <= 20; page++) {
    const batch = await github(`/repos/${repo}/issues?state=all&per_page=100&page=${page}`, { token });
    for (const issue of batch) {
      if (issue.pull_request) continue;
      const id = /^(RCE-\d{3})\b/.exec(issue.title ?? '')?.[1];
      if (id && !byStory.has(id)) byStory.set(id, { number: issue.number, state: issue.state });
    }
    if (batch.length < 100) break;
  }
  return byStory;
}

async function ensureLabels(repo, token, needed) {
  const existing = new Set();
  for (let page = 1; page <= 10; page++) {
    const batch = await github(`/repos/${repo}/labels?per_page=100&page=${page}`, { token });
    for (const label of batch) existing.add(label.name);
    if (batch.length < 100) break;
  }
  for (const name of needed) {
    if (existing.has(name)) continue;
    const color = LABEL_COLOR[name.split(':')[0]] ?? LABEL_COLOR.module;
    await github(`/repos/${repo}/labels`, { method: 'POST', token, body: { name, color, description: 'Story dispatch' } });
    console.log(`created label ${name}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage); return; }

  const plan = hydratePlan(JSON.parse(readFileSync(new URL('../docs/implementation/story-plan.json', import.meta.url), 'utf8')));
  const result = validatePlan(plan);
  if (result.errors.length) throw new Error(result.errors.join('\n'));

  const stories = new Map(plan.stories.map(s => [s.id, s]));
  const ordered = result.order.map(id => stories.get(id)).filter(Boolean);
  const matches = story => (!opts.module || story.module === opts.module)
    && (!opts.milestone || story.milestone === opts.milestone)
    && (!opts.agent || agentFor(story) === opts.agent)
    && (!opts.story || story.id === (plan.aliases[opts.story] ?? opts.story));

  if (opts.order) {
    for (const story of ordered.filter(matches)) {
      console.log(`${story.id}  ${story.milestone}  ${agentFor(story).padEnd(10)} ${story.module.padEnd(12)} ${story.title}`);
    }
    return;
  }

  const live = await fetchTrelloStatus().catch(err => { console.log(`Trello unavailable (${err.message}); using snapshot.`); return null; });
  const source = live ? 'live Trello' : `repository snapshot ${plan.as_of}`;
  console.log(`Delivery status source: ${source}.`);
  if (!live) console.log('No live Trello access: completion is taken only from --assume-done, never inferred.');

  const shortLink = story => story.source.split('/')[4];
  const statusOf = story => (live ? live.get(shortLink(story)) : story.status) ?? story.status;

  const repo = opts.repo ?? plan.repository;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`Cannot determine repository: ${repo}`);
  const token = process.env.GITHUB_TOKEN;
  if (opts.create && !token) throw new Error('--create needs GITHUB_TOKEN with issue write access');

  const issues = token ? await loadIssues(repo, token) : new Map();
  if (!token) console.log('No GITHUB_TOKEN: existing issues are not checked.');

  // Completion comes from delivery status or an explicit override. A closed issue is NOT completion:
  // closed can mean cancelled, duplicate or abandoned, and Trello owns delivery status (AGENTS.md).
  const done = new Set(opts.assumeDone);
  if (live) for (const story of ordered) if (statusOf(story) === COMPLETE_STATE) done.add(story.id);

  const { ready, blocked, unscheduled, dispatched } = classify({ stories: ordered, statusOf, done, issues });

  const closedButNotComplete = [...issues].filter(([id, i]) => i.state === 'closed' && !done.has(id));
  if (closedButNotComplete.length) {
    console.log(`\n${closedButNotComplete.length} issue(s) closed without a complete delivery status; not treated as done:`);
    for (const [id, i] of closedButNotComplete) console.log(`  ${id}  #${i.number}`);
  }

  const show = (label, rows, render) => {
    const filtered = rows.filter(([story]) => matches(story));
    console.log(`\n${label} (${filtered.length})`);
    for (const row of filtered) console.log(`  ${render(row)}`);
  };
  show('DISPATCHED', dispatched, ([s, i]) => `${s.id}  #${i.number}  ${agentFor(s).padEnd(10)} ${s.title}`);
  show('READY', ready, ([s]) => `${s.id}  ${s.milestone}  ${agentFor(s).padEnd(10)} ${s.module.padEnd(12)} ${s.title}`);
  show('NOT SCHEDULED', unscheduled, ([s, st]) => `${s.id}  status "${st}" is not dispatchable`);
  show('BLOCKED', blocked, ([s, b]) => `${s.id}  waiting on ${b.join(', ')}`);

  if (!opts.create) {
    if (opts.preview) for (const [story] of ready.filter(([s]) => matches(s))) {
      console.log(`\n${'='.repeat(72)}\n${titleFor(story)}\nlabels: ${labelsFor(story).join(', ')}\n${'-'.repeat(72)}\n${bodyFor(plan, story, source)}`);
    }
    console.log(`\nDry run. ${ready.filter(([s]) => matches(s)).length} story/stories would be opened as issues in ${repo}.`);
    console.log('Re-run with --create (and GITHUB_TOKEN) to open them.');
    return;
  }

  const queue = ready.filter(([story]) => matches(story)).slice(0, opts.limit ?? Infinity);
  if (!queue.length) { console.log('Nothing ready to dispatch.'); return; }

  await ensureLabels(repo, token, [...new Set(queue.flatMap(([story]) => labelsFor(story)))]);
  for (const [story] of queue) {
    const issue = await github(`/repos/${repo}/issues`, {
      method: 'POST', token,
      body: {
        title: titleFor(story),
        body: bodyFor(plan, story, source),
        labels: labelsFor(story),
        ...(opts.assignee ? { assignees: [opts.assignee] } : {}),
      },
    });
    console.log(`opened #${issue.number}  ${story.id}  -> ${agentFor(story)}`);
  }
  console.log(`\n${queue.length} issue(s) opened. Assignment to a specific assistant is per-vendor: labels only here.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
