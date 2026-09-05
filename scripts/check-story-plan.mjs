import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = /^RCE-\d{3}$/;
const STATES = new Set(['Ideas', 'Backlog', 'Ready for Design', 'In Design', 'Design Review', 'Ready for Development', 'In Development', 'Code Review', 'Testing', 'Ready for Release', 'Done']);
const KINDS = new Set(['story', 'design', 'epic', 'release_gate']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const canonical = value => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

/** Expand the compact data-only catalog; no code from the catalog is executed. */
export function hydratePlan(raw) {
  if (!raw || Array.isArray(raw.stories)) return raw;
  if (!Array.isArray(raw.story_records)) return raw;
  const id = number => `RCE-${String(number).padStart(3, '0')}`;
  return { ...raw, stories: raw.story_records.map(line => {
    if (typeof line !== 'string') throw new Error('Invalid story record');
    const fields = line.split('|');
    if (fields.length !== 6 || !/^\d+$/.test(fields[0])) throw new Error('Invalid compact story record');
    const [number, short, title, deps, module, acceptance] = fields;
    const n = Number(number);
    const workflow = Object.entries(raw.workflow ?? {}).filter(([, numbers]) => numbers.includes(n));
    if (workflow.length > 1) throw new Error(`Multiple workflow states for ${id(n)}`);
    return { id: id(n), title, source: `https://trello.com/c/${short}`,
      kind: module === 'epic' ? 'epic' : module === 'release' ? 'release_gate' : raw.design_ids?.includes(n) ? 'design' : 'story',
      milestone: n === 24 ? 'M2' : raw.m0_ids?.includes(n) ? 'M0' : 'M1',
      status: workflow[0]?.[0] ?? 'Backlog',
      depends_on: deps ? deps.split(',').map(d => { if (!/^\d+$/.test(d)) throw new Error('Invalid dependency number'); return id(Number(d)); }) : [],
      module, targets: raw.module_targets?.[module], contracts: raw.module_contracts?.[module], acceptance };
  }) };
}

/** Validate planning metadata, not application behavior or completion. */
export function validatePlan(plan, { fileExists = () => true, storyText = null } = {}) {
  const errors = [];
  try { plan = hydratePlan(plan); } catch (error) { return { errors: [error.message], order: [] }; }
  if (!plan || plan.format !== 'rce-story-plan' || plan.schema_version !== 1 || !Array.isArray(plan.stories)) {
    return { errors: ['Invalid story-plan format/schema_version/stories'], order: [] };
  }
  if (!text(plan.as_of) || !/^\d{4}-\d{2}-\d{2}$/.test(plan.as_of)) errors.push('Missing ISO snapshot date');
  if (!text(plan.repository) || !text(plan.scope)) errors.push('Missing repository or scope');
  if (!plan.stories.length) errors.push('Story plan is empty');
  const stories = new Map();
  const titles = new Set();
  const sources = new Set();
  for (const s of plan.stories) {
    if (!s || typeof s !== 'object') { errors.push('Invalid story record'); continue; }
    if (!ID.test(s.id ?? '')) errors.push(`Invalid story ID: ${s.id}`);
    if (stories.has(s.id)) errors.push(`Duplicate story ID: ${s.id}`);
    else stories.set(s.id, s);
    for (const key of ['title', 'module', 'targets', 'acceptance']) if (!text(s[key])) errors.push(`${s.id}: missing ${key}`);
    if (text(s.title)) {
      const title = canonical(s.title);
      if (titles.has(title)) errors.push(`${s.id}: duplicate title`);
      titles.add(title);
    }
    if (!/^https:\/\/trello\.com\/c\/[A-Za-z0-9]{8}(?:\/[^\s]*)?$/.test(s.source ?? '')) errors.push(`${s.id}: invalid source URL`);
    else {
      const source = s.source.split('/').slice(0, 5).join('/');
      if (sources.has(source)) errors.push(`${s.id}: duplicate source card`);
      sources.add(source);
    }
    if (!KINDS.has(s.kind)) errors.push(`${s.id}: invalid kind`);
    if (!STATES.has(s.status)) errors.push(`${s.id}: invalid workflow state`);
    if (!['M0', 'M1', 'M2'].includes(s.milestone)) errors.push(`${s.id}: invalid milestone`);
    if (!Array.isArray(s.depends_on) || s.depends_on.some(d => typeof d !== 'string')) errors.push(`${s.id}: invalid dependency list`);
    else if (new Set(s.depends_on).size !== s.depends_on.length) errors.push(`${s.id}: repeated dependency`);
    if (!Array.isArray(s.contracts) || !s.contracts.length) errors.push(`${s.id}: missing contract files`);
    else for (const path of s.contracts) {
      if (!text(path) || path.includes('\\') || isAbsolute(path) || path.split('/').includes('..')) errors.push(`${s.id}: unsafe contract path`);
      else if (!fileExists(path)) errors.push(`${s.id}: missing contract file ${path}`);
    }
  }
  const aliases = plan.aliases ?? {};
  if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) errors.push('Invalid alias map');
  else for (const [oldId, target] of Object.entries(aliases)) {
    if (!ID.test(oldId) || !ID.test(target)) errors.push(`Invalid alias: ${oldId}`);
    if (stories.has(oldId)) errors.push(`Archived alias still active: ${oldId}`);
    if (!stories.has(target)) errors.push(`Alias target missing: ${oldId} -> ${target}`);
  }
  for (const s of stories.values()) for (const dep of Array.isArray(s.depends_on) ? s.depends_on : []) {
    if (!stories.has(dep)) errors.push(`${s.id}: missing/archived dependency ${dep}`);
    if (stories.get(dep)?.kind === 'epic') errors.push(`${s.id}: depends on an epic rather than a bounded artifact`);
  }
  const stack = [];
  const visited = new Set();
  const order = [];
  function visit(id) {
    if (stack.includes(id)) { errors.push(`Dependency cycle: ${[...stack.slice(stack.indexOf(id)), id].join(' -> ')}`); return; }
    if (visited.has(id)) return;
    stack.push(id);
    for (const dep of Array.isArray(stories.get(id).depends_on) ? stories.get(id).depends_on : []) if (stories.has(dep)) visit(dep);
    stack.pop(); visited.add(id); order.push(id);
  }
  for (const id of stories.keys()) visit(id);
  if (storyText !== null) {
    const headings = [...storyText.matchAll(/^### (RCE-\d{3}):/gm)].map(m => m[1]);
    for (const id of stories.keys()) if (headings.filter(h => h === id).length !== 1) errors.push(`${id}: expected exactly one STORIES.md section`);
    for (const id of headings) if (!stories.has(id)) errors.push(`${id}: unknown STORIES.md section`);
  }
  return { errors: [...new Set(errors)], order };
}

export function checkRepository(root) {
  const base = resolve(root);
  const fileExists = path => {
    const absolute = resolve(base, path);
    const rel = relative(base, absolute);
    if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) return false;
    try { return statSync(absolute).isFile(); } catch { return false; }
  };
  const plan = JSON.parse(readFileSync(resolve(base, 'docs/implementation/story-plan.json'), 'utf8'));
  const storyText = readFileSync(resolve(base, 'docs/implementation/STORIES.md'), 'utf8');
  const result = validatePlan(plan, { fileExists, storyText });
  for (const path of ['AGENTS.md', 'CLAUDE.md', '.cursor/rules/project.mdc', '.github/copilot-instructions.md', 'docs/implementation/STORY_TEMPLATE.md']) {
    if (!fileExists(path)) result.errors.push(`Missing handoff file: ${path}`);
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const result = checkRepository(root);
    if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
    else console.log(`PASS: ${result.order.length} story contracts; unique IDs/sources/titles; no dangling or cyclic dependencies; referenced files and sections exist. This is not an application test.`);
  } catch (error) { console.error(`Story check failed: ${error.message}`); process.exitCode = 1; }
}
