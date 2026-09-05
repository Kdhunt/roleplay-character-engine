# Roleplay Character Engine

An API-first character, continuity and memory service for a complete adult-user roleplay application. The implementation plan covers accounts, a curated character catalog, private character authoring, scenario overrides, multi-character conversation, privacy and operations.

## Current state

This repository contains the implementation specification and coding-agent handoff. It is not yet a runnable chat application. The first executable application task is RCE-061: workspace bootstrap. Application build/test commands described in the plan are deliverables until that task implements them.

The audited Trello plan contains 89 active cards. RCE-057 was merged into RCE-010 to avoid duplicate spatial models. Trello controls delivery status; this repository contains versioned implementation contracts and a dated story snapshot. GitHub issues are not automatically mirrored or synchronized with Trello.

## Start implementing

Read [AGENTS.md](AGENTS.md), then the [implementation overview](docs/implementation/README.md). The [story index](docs/implementation/STORIES.md) and [machine-readable plan](docs/implementation/story-plan.json) contain stable IDs, source cards, dependencies and acceptance outcomes.

These planning tools run with Node 22 or newer and require no package install:

```sh
node scripts/check-story-plan.mjs
node --test scripts/check-story-plan.test.mjs
node scripts/show-story.mjs RCE-061
node scripts/show-story.mjs --order
```

They validate planning metadata, not application functionality. The application target runtime is Node 24 LTS.

Agent entrypoints are AGENTS.md, CLAUDE.md, .cursor/rules/project.mdc and .github/copilot-instructions.md. Each directs the agent to the same contracts. Implement bounded stories with tests and actual evidence; do not treat an epic as a single assignment.

## Product scope

Responsive Vue web application and installable PWA first, backed by a TypeScript/Express API, PostgreSQL, OIDC authentication and a separate worker. Many independent accounts are supported; each private conversation has one human persona and one to four AI characters. Existing character releases are immutable and scenario overrides never mutate another user's history.

Explicit consenting-adult roleplay is a first-class data requirement. Real-user eligibility, fictional character adulthood, player content authorization, current willingness and provider permission are independently enforced. Native-store approval is not assumed. Production distribution, geography, age assurance, hosting/model policies, privacy/retention and operating budgets require RCE-089 approval.

Native applications, payments, public creator publishing, human multiplayer, generated voice/images and autonomous offscreen simulation are explicitly deferred. The API is designed to support future clients without duplicating domain rules.

[Trello board](https://trello.com/b/IB7rrPuX/roleplay-character-management-reference-system)

See the existing [LICENSE](LICENSE); this audit does not change it.
