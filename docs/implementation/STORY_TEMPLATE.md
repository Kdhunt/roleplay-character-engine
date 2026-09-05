# RCE story template

## Identity and outcome
Stable ID; title; source Trello URL; epic; milestone; current delivery status; desired user/developer outcome.

## Ownership and scope
Layer(s); authenticated owner; continuity/branch and instance scope; in-scope behavior; explicit exclusions. Distinguish the canonical story from related parent/test/adapter stories.

## Dependencies and contracts
List stable predecessor IDs and required artifacts. Reference exact API operations, DTOs, schema fields, events, errors and UI states. Specify module/file targets. Do not assume a predecessor is implemented because its card exists.

## Implementation tasks
1. Contract/schema and fixtures.
2. Domain/persistence or client implementation.
3. Integration, failure handling and verification.
Split further when a task cannot have a bounded independently testable outcome. Do not implement an entire epic as one task.

## Acceptance
Given/when/then success case; invalid input; wrong owner; stale revision; retries/cancellation; persistence/resume; privacy; adult-mode metadata where relevant; accessibility where UI exists.

## Data and operations
Migration/upgrade; backward compatibility; failure recovery; deletion/retention; telemetry redaction; rollout/rollback.

## Verification and handoff
Commands actually run and output/CI links; changed files; remaining limitations; source-card/contract revision used. Ready is not Done. Missing product decisions become explicit blockers, not hidden guesses.
