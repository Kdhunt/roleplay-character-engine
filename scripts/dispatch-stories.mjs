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

const API = 'https://api.github.com';
const usage = `Usage: node scripts/dispatch-stories.mjs [--order] [--preview] [--create] [--limit N]
                                       [--module M] [--milestone M0] [--agent A] [--story RCE-061]
                                       [--repo owner/name] [--assume-done RCE-001,...] [--assignee login]
Dry run by default. --create needs GITHUB_TOKEN with issue write access.`;

function parseArgs(argv) {
  const opts = { assumeDone: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => { const v = argv[++i]; if (!v) throw new Error(`${arg} needs a value`); return v; };
    if (arg === '--order') opts.order = true;
    else if (arg === '--preview') opts.preview = true;
    else if (arg === '--create') opts.create = true;
    else if (arg === '--ensure-labels') opts.ensureLabels = true;
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

const agentFor = story => story.kind === 'release_gate' ? GATE_AGENT
  : story.kind === 'design' ? DESIGN_AGENT
  : AGENT_BY_MODULE[story.module] ?? 'unassigned';

const labelsFor = story => ['rce', `agent:${agentFor(story)}`, `module:${story.module}`, `milestone:${story.milestone}`];
const titleFor = story => `${story.id}: ${story.title}`;

function bodyFor(plan, story, blockedBy) {
  const deps = story.depends_on.length
    ? story.depends_on.map(d => `- ${d}${blockedBy.includes(d) ? ' — NOT yet done' : ' — done'}`).join('\n')
    : '- none';
  return `**${story.id}** · ${story.kind} · ${story.milestone} · module \`${story.module}\`
Source card: ${story.source}
Repository snapshot: ${plan.as_of} (Trello is delivery status; this issue reflects the snapshot)

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

try {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage); process.exit(0); }

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
    process.exit(0);
  }

  const repo = opts.repo ?? plan.repository;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`Cannot determine repository: ${repo}`);
  const token = process.env.GITHUB_TOKEN;
  const online = Boolean(token);
  if (opts.create && !token) throw new Error('--create needs GITHUB_TOKEN with issue write access');

  const issues = online ? await loadIssues(repo, token) : new Map();
  if (!online) console.log('No GITHUB_TOKEN: reporting dependency readiness from the plan alone.\n');

  const done = new Set(opts.assumeDone);
  for (const [id, issue] of issues) if (issue.state === 'closed') done.add(id);

  const ready = [], blocked = [], dispatched = [];
  for (const story of ordered) {
    if (story.kind === 'epic') continue;                       // AGENTS.md: never assign a whole epic
    if (done.has(story.id)) continue;
    if (issues.has(story.id)) { dispatched.push([story, issues.get(story.id)]); continue; }
    const blockedBy = story.depends_on.filter(d => !done.has(d));
    (blockedBy.length ? blocked : ready).push([story, blockedBy]);
  }

  const show = (label, rows, render) => {
    const filtered = rows.filter(([story]) => matches(story));
    console.log(`${label} (${filtered.length})`);
    for (const row of filtered) console.log(`  ${render(row)}`);
    console.log('');
  };
  show('DISPATCHED', dispatched, ([s, i]) => `${s.id}  #${i.number}  ${agentFor(s).padEnd(10)} ${s.title}`);
  show('READY', ready, ([s]) => `${s.id}  ${s.milestone}  ${agentFor(s).padEnd(10)} ${s.module.padEnd(12)} ${s.title}`);
  show('BLOCKED', blocked, ([s, b]) => `${s.id}  waiting on ${b.join(', ')}`);

  if (!opts.create) {
    if (opts.preview) for (const [story, blockedBy] of ready.filter(([s]) => matches(s))) {
      console.log(`${'='.repeat(72)}\n${titleFor(story)}\nlabels: ${labelsFor(story).join(', ')}\n${'-'.repeat(72)}\n${bodyFor(plan, story, blockedBy)}\n`);
    }
    console.log(`Dry run. ${ready.filter(([s]) => matches(s)).length} story/stories would be opened as issues in ${repo}.`);
    console.log('Re-run with --create (and GITHUB_TOKEN) to open them.');
    process.exit(0);
  }

  const queue = ready.filter(([story]) => matches(story)).slice(0, opts.limit ?? Infinity);
  if (!queue.length) { console.log('Nothing ready to dispatch.'); process.exit(0); }

  await ensureLabels(repo, token, [...new Set(queue.flatMap(([story]) => labelsFor(story)))]);
  for (const [story, blockedBy] of queue) {
    const issue = await github(`/repos/${repo}/issues`, {
      method: 'POST', token,
      body: {
        title: titleFor(story),
        body: bodyFor(plan, story, blockedBy),
        labels: labelsFor(story),
        ...(opts.assignee ? { assignees: [opts.assignee] } : {}),
      },
    });
    console.log(`opened #${issue.number}  ${story.id}  -> ${agentFor(story)}`);
  }
  console.log(`\n${queue.length} issue(s) opened. Assignment to a specific assistant is per-vendor: labels only here.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
