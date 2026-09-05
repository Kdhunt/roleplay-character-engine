import { readFileSync } from 'node:fs';
import { hydratePlan, validatePlan } from './check-story-plan.mjs';

try {
  const plan = hydratePlan(JSON.parse(readFileSync(new URL('../docs/implementation/story-plan.json', import.meta.url), 'utf8')));
  const result = validatePlan(plan);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  const requested = process.argv[2];
  if (requested === '--order') {
    console.log(result.order.join('\n'));
  } else {
    if (!requested) throw new Error('Usage: node scripts/show-story.mjs RCE-061 | --order');
    const id = plan.aliases[requested] ?? requested;
    const story = plan.stories.find(s => s.id === id);
    if (!story) throw new Error(`Unknown story: ${requested}`);
    if (id !== requested) console.log(`${requested} was merged into ${id}; do not implement it twice.\n`);
    console.log(`# ${story.id}: ${story.title}\n\nSource: ${story.source}\nSnapshot: ${plan.as_of}; ${story.status}; ${story.milestone}; ${story.kind}\n\nDependencies: ${story.depends_on.join(', ') || 'none'}\nTargets: ${story.targets}\nRequired contracts:\n${story.contracts.join('\n')}\n\nOutcome and acceptance:\n${story.acceptance}\n\nBefore coding, read AGENTS.md and the required contracts. Use STORY_TEMPLATE.md to divide contract/fixtures, implementation, and integration/verification into bounded tasks. Check live Trello status when available. Do not equate this specification with implemented software.`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
