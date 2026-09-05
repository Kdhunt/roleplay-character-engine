# Repository instructions

Read AGENTS.md at repository root and docs/implementation/README.md. The RCE task index and shared API/domain/client/quality contracts are mandatory context. Implement only the assigned bounded story and its approved dependencies. Do not assume a Trello connection exists; use the repository story snapshot and disclose its revision when live access is unavailable.

TypeScript strict; Node 24 LTS; Express 5; Vue 3/Vite; PostgreSQL; no React. Keep UI, provider and MCP adapters separate from domain state. Require authenticated ownership and continuity scope, validated transactional state changes, cancellation fencing, private-data minimization and branch-safe retrieval. Preserve adult-only use-case requirements without bypassing eligibility or provider policies.

Include positive and negative tests, migration implications, documentation and actual command results in each PR. Never mark planned features complete merely because a schema or mock exists. RCE-061 is the executable workspace bootstrap; application build commands are not present until that story is implemented.
