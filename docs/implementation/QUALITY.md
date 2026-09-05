# Quality, readiness and release evidence

## Definition of Ready

A bounded story has stable RCE ID and source link; user/developer outcome; layer, owner and continuity scope; explicit dependencies and exclusions; referenced DTO/API/data/event contract; positive and negative acceptance tests; migration, privacy and failure impact; planned file/module boundaries; and executable verification commands or a bootstrap requirement to create them. An epic is an index, not a coding assignment. Unknown release decisions remain recorded blockers. Code agents do not silently select payment/hosting/legal policy defaults.

A large story must be decomposed into contract/schema, implementation and integration task sections with their own acceptance evidence. Those sections remain owned by one canonical story or linked child IDs, avoiding duplicate implementation cards. Independent tasks may run in parallel only when their contracts and migration ordering are clear.

## Definition of Done

Implementation is present and reviewed; acceptance tests run; contracts/client types agree; migrations tested fresh and upgrade; negative authorization and privacy tests pass; documentation and source links updated; actual command output or CI run linked. No TODO stubs, mocked production integrations, skipped tests or unexecuted commands can be reported as passing. Deployment and product release require separate gates.

## Mandatory regression fixtures

1. Two users share a catalog character but cannot access each other's instances, messages, files, event streams, memory, jobs or export URLs.
2. One user runs two independent scenarios with the same core; corrections/history from one never enter the other.
3. A pinned green-eye fact cannot become blue through candidate narration. Explicit authorized scenario override changes only that instance.
4. Gender/pronouns and anatomy stay independent. Referencing an absent structure is rejected; unknown presence returns unresolved rather than invented data.
5. A watch dropped on the floor stays there after several turns, reload, network loss and process restart until an accepted move/reset affects it.
6. Manipulator occupancy, clothing removal, object containment and relative pose transitions remain possible across multiple participants. Coarse proximity alone is not proof of impossible geometry.
7. Characters do not know private facts they never perceived; false beliefs do not change world truth; summaries cannot leak hidden sources.
8. Stable voice, values and anti-expressions remain active in adult-mode metadata fixtures. No graphic prose is needed to test mode consistency. Pattern detectors distinguish prohibited character behavior from mere words and from legitimate development.
9. Real-user eligibility, fictional age, player opt-in, character willingness and provider approval each independently deny when missing/revoked. A relationship, preference, bodily response or silence does not substitute for consent.
10. Duplicate send and duplicate outbox delivery yield one canonical turn. Stale revision does not overwrite state.
11. Cancellation/commit races have one durable outcome; a late worker cannot commit after fencing. Retry does not create duplicate user input.
12. Edits/regeneration create isolated branches and exclude abandoned branch memories. A failed replacement leaves original active branch intact.
13. Raw invalid candidate text is never streamed or returned as canonical history. Refusal/failure does not mutate canon.
14. Import/export round trips preserve explicit overrides and inert extensions; unknown versions, malicious payloads and duplicate IDs are handled deterministically.
15. Erasure removes derivative memory/vector/summary/media/feedback copies and restores do not resurrect deleted data.
16. Hostile card instructions, XSS, CSRF, SSRF, malformed schemas, forged owner fields and oversized payloads cannot escape the permitted domain.
17. Registration, verification, recovery, selection, scenario creation, conversation, resume, settings, export and deletion complete through the real browser/API/database stack using synthetic model fixtures.
18. Phone keyboard, touch controls, keyboard-only operation, screen-reader labels, zoom, contrast, focus and private-cache behavior are verified manually and automatically.

Use synthetic users and fictional characters with explicit ages 27 and 31 for normal fixtures. Underage/unknown cases use metadata-only rejection tests; never generate sexual content for them. Do not place real user transcripts or intimate content in public test artifacts.

## Test layers

Unit: pure reducers, inheritance, permissions, schema validation, memory ranking and deterministic constraint rules. Property tests: replay determinism, no invalid ownership edges, no duplicate primary object location, branch exclusion and idempotency. Integration: PostgreSQL migrations, transaction rollback, OIDC, outbox leases, SSE resume and provider contract mocks. End-to-end: real browser, development identity provider, database and deterministic generator. Optional live-model evaluation is a separate non-deterministic suite with approved provider and budget.

Use Vitest for TypeScript unit/integration tests and Playwright for browser flows after RCE-061 sets up actual commands. A fake adapter is appropriate for deterministic CI but not proof a production provider permits or reliably generates the intended content. Semantic behavior classifiers need labeled evaluation with false-positive/false-negative reporting; do not claim perfect personality enforcement.

## Performance acceptance targets

Initial test baseline: 100 authenticated simulated sessions, one active turn per conversation, bounded four-character contexts. Non-model JSON reads/writes target p95 <=500 ms in the documented staging setup; turn acceptance target <=1 second before queued processing. Report generation/validation/provider latency separately rather than imposing an unsupported model-speed promise. SSE reconnect must recover consistent status/history without duplicate effects. Load tests must report CPU/memory/queue growth and demonstrate configured caps, not just throughput.

These are proposed engineering targets, not measured results. Owner may revise them through RCE-089 before release. Budget/retention and RPO/RTO are similarly explicit decisions. No unlimited production quotas.

## Operational and security gates

Production must fail startup if using mock identity/age/model settings, default secrets, no approved provider or missing required region/content policy. Hosted arbitrary endpoint URLs are forbidden without an allowlist and egress controls. Validate secure cookies, CSRF/CORS/CSP, token isolation, import/media limits and tenant boundaries. CI scans secrets/dependencies and triages material vulnerabilities. Do not put raw private content into ordinary logs, metrics or error reports.

Exercise database upgrade, application rollback, worker restart, provider outage and encrypted-backup restoration in staging. Reapply deletion tombstones before reopening restored service. Record operational owner, alerts, retention and recovery procedure. Admin tools use least privilege and selected report evidence, not default access to all chats.

## Workflow and evidence

Ideas: optional/uncommitted expansion. Backlog: defined but dependency-blocked or not scheduled. Ready for Design: scoped design/approval work with identified outputs. In Design/Design Review: actual design activity/review. Ready for Development: sufficiently specified and unblocked bounded implementation. In Development/Code Review/Testing: evidence of those activities. Ready for Release: verification complete, release approvals pending. Done: shipped or completed artifact with evidence.

Do not move a card to Testing because its title contains test. Do not mark a card Done merely because its description is detailed. RCE-061 is initially the unblocked coding entrypoint. RCE-089 is a release gate and cannot be marked approved by an agent without owner evidence.
