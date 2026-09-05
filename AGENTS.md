# Roleplay Character Engine: coding-agent contract

Read docs/implementation/README.md, ARCHITECTURE.md, DOMAIN.md, API.md, CLIENT.md and QUALITY.md before changing application contracts. Read the requested RCE story in docs/implementation/STORIES.md and its dependencies. Trello is delivery status; repository specifications are the versioned implementation contract. Compare the latest card when access exists. Report the snapshot used when access does not exist.

This repository is currently a specification/initialization repository, not a completed runnable app. RCE-061 bootstraps executable workspaces and commands. Do not claim build or test commands passed without executing them. Do not invent working code, connections, completed cards, background activity or production approvals.

Implement one bounded story/task at a time. State the RCE ID, files, dependencies and tests. Preserve existing LICENSE and user changes. Do not assign an entire epic to an agent as one coding task. Split a broad story into contract, implementation and integration task sections before coding, without duplicating its requirements.

Baseline: TypeScript strict, Node 24 LTS, npm workspaces, Express 5 API, Vue 3/Vite responsive PWA, PostgreSQL, separate worker process, OIDC provider. No React. No unbounded latest dependencies. Use singular table names, parameterized queries and versioned migrations. Put domain logic in packages/domain, not UI/MCP/provider adapters.

Mandatory invariants: authenticated owner and continuity scope on every operation; separate global core, scenario instance and runtime state; never infer anatomy from gender; never promote model output into canon without validation; corrections are evidence unless an authorized explicit canon edit is made. Preserve explicit consenting-adult data support while enforcing real-user access, fictional age, content opt-in, current willingness and provider eligibility separately. Never bypass provider rules or use real intimate transcripts as public fixtures.

Generate outside database transactions. Commit validated output, domain events, projection updates and outbox intent atomically after version/permission checks. No raw unvalidated token stream to users. Cancellation, retries and revisions must not create ghost state. All retrieval, caches, jobs, media and exports must enforce ownership and branch visibility. No secrets/private dialogue in ordinary logs.

A PR must contain implementation, positive/negative tests, migration and rollback impact, documentation changes and actual command results. Do not weaken tests or declare mocks to be production integrations. Readiness is not completion. External launch decisions remain blocked by RCE-089 until owner approval.
