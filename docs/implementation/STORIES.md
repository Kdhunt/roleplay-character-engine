# Agent story index

Snapshot: 2026-09-05. There are 89 active cards: 57 retained original cards plus 32 application/platform additions. RCE-057 is archived and merged into RCE-010. Do not implement it twice.

Read AGENTS.md and the shared implementation contracts before coding. `story-plan.json` is the canonical data-only snapshot: each record contains its title, source card, predecessor IDs, module and specific acceptance outcome. Repeated module contracts and target paths are factored out. `node scripts/show-story.mjs RCE-061` expands one complete assignment; `node scripts/show-story.mjs --order` prints a dependency-first sequence.

Every assignment also requires owner/continuity/branch authorization, version/idempotency behavior, negative tests, privacy/migration impact and actual verification evidence under QUALITY.md. Use STORY_TEMPLATE.md to divide contract/fixtures, implementation and integration into bounded tasks. Planned paths are deliverables, not claims they exist. Epics are indexes, not coding units. A source card's live workflow state supersedes this snapshot; the contracts remain versioned and changes must be reconciled explicitly.

Run `node scripts/check-story-plan.mjs` and `node --test scripts/check-story-plan.test.mjs` to validate the handoff. These are planning checks, not application tests. RCE-061 bootstraps the executable app and RCE-083 later proves the full user journey. RCE-089 is an owner-approved production launch gate.

## Core and continuity stories

### RCE-001: Define system invariants and source-of-truth rules
Source: https://trello.com/c/5pcHXzOk

### RCE-002: Specify persistence, event boundaries and erasable payloads
Source: https://trello.com/c/YxE0GXlX

### RCE-003: Define canonical character, release and instance schemas
Source: https://trello.com/c/Sl458Ct3

### RCE-004: Implement fact authority, provenance and canon locking
Source: https://trello.com/c/lAZlXfX9

### RCE-005: Implement deterministic archetype and preset composition
Source: https://trello.com/c/IB8OHUaq

### RCE-006: Build generalized anatomy graph
Source: https://trello.com/c/Ms0o3EBT

### RCE-007: Define versioned male, female and fictional anatomy presets
Source: https://trello.com/c/E3QXYDJN

### RCE-008: Implement independent identity, appearance and terminology profiles
Source: https://trello.com/c/C461xYZh

### RCE-009: Implement character agency and player-control permissions
Source: https://trello.com/c/UdzRv6f4

### RCE-010: Implement relational scene geometry and adaptive detail
Source: https://trello.com/c/mPaVe9vA

### RCE-011: Implement clothing, manipulator occupancy and contact transitions
Source: https://trello.com/c/3kZE5QwT

### RCE-012: Implement event log, deterministic replay and scene snapshots
Source: https://trello.com/c/4c0loOtI

### RCE-013: Implement scoped character memory persistence
Source: https://trello.com/c/3bYryJeK

### RCE-014: Implement truth, knowledge and belief visibility projections
Source: https://trello.com/c/BRqPSANw

### RCE-015: Implement directional relationships and explicit agreements
Source: https://trello.com/c/nnxzFbdv

### RCE-016: Implement MCP adapter over authorized API/domain services
Source: https://trello.com/c/wAI4rwJl

### RCE-017: Compile bounded, viewpoint-safe narrative context
Source: https://trello.com/c/T0zMeXTv

### RCE-018: Commit validated narrative turns atomically
Source: https://trello.com/c/MnXvl6Np

### RCE-019: Validate candidate continuity and bounded repair decisions
Source: https://trello.com/c/K1d2kv7Y

### RCE-020: Test anatomy and physical continuity end to end
Source: https://trello.com/c/WjeBCj6p

### RCE-021: Test knowledge, relationship and player-agency behavior
Source: https://trello.com/c/WyxfPWg1

### RCE-022: Implement branch primitives, save points and retcon isolation
Source: https://trello.com/c/xcqYaG2j

### RCE-023: Build versioned character voice and identity fingerprints
Source: https://trello.com/c/ny9WgeN2

### RCE-024: FUTURE: bounded offscreen NPC simulation
Source: https://trello.com/c/E5ft3LPI

### RCE-025: Specify memory taxonomy, lifetimes and promotion rules
Source: https://trello.com/c/NLGMPZva

### RCE-026: Ingest character definitions into scoped canonical facts and memories
Source: https://trello.com/c/atlSTxZT

### RCE-027: Derive per-character observations from committed events
Source: https://trello.com/c/40hLTnms

### RCE-028: Score memory significance and controlled promotion
Source: https://trello.com/c/M5ffEBfZ

### RCE-029: Implement memory recall decay and bounded reinforcement
Source: https://trello.com/c/XeBUR0o4

### RCE-030: Build scoped active and working memory caches
Source: https://trello.com/c/AoPCnx2g

### RCE-031: Implement source-linked, visibility-safe memory summaries
Source: https://trello.com/c/F8nvDqsi

### RCE-032: Deduplicate memories without collapsing distinct evidence
Source: https://trello.com/c/y1Arb2dn

### RCE-033: Update beliefs from supporting and contradicting evidence
Source: https://trello.com/c/GTeNB5GM

### RCE-034: Track commitments, secrets and unresolved obligations
Source: https://trello.com/c/gWILcgfa

### RCE-035: Finalize scene memories idempotently
Source: https://trello.com/c/EewSnGOJ

### RCE-036: Retrieve and rank memories within authorized scope
Source: https://trello.com/c/rQyBPnbO

### RCE-037: Enforce context token budgets and retrieval depth
Source: https://trello.com/c/XCAjFIC2

### RCE-038: Record context and memory provenance per turn
Source: https://trello.com/c/0gIDC57H

### RCE-039: Approve evidence-backed character development
Source: https://trello.com/c/DXKHHmV3

### RCE-040: Implement distinct memory correction, suppression and erasure commands
Source: https://trello.com/c/1kiJYQeb

### RCE-041: Audit memory integrity and repair derived projections
Source: https://trello.com/c/26j5xGlv

### RCE-042: EPIC: Character integrity and behavioral intelligence
Source: https://trello.com/c/jVCxrllQ

### RCE-043: EPIC: Runtime world state and simulation
Source: https://trello.com/c/CKugiZwT

### RCE-044: EPIC: API, character store and memory services
Source: https://trello.com/c/5N4jZz5e

### RCE-045: Define values, contextual expressions and anti-expressions
Source: https://trello.com/c/OnYstsKq

### RCE-046: Detect character-specific cliche and behavioral drift
Source: https://trello.com/c/zzh5QsBg

### RCE-047: Capture scoped corrections and optional training feedback
Source: https://trello.com/c/HidkRaE6

### RCE-048: Define versioned environment templates and affordances
Source: https://trello.com/c/wBrX0Zav

### RCE-049: Track grounded objects, containment and persistent placement
Source: https://trello.com/c/izYLdEam

### RCE-050: Orchestrate multi-character interaction states and resource constraints
Source: https://trello.com/c/srIlL0KB

### RCE-051: Implement versioned archetype and preset authoring registries
Source: https://trello.com/c/GWhyoIJZ

### RCE-052: Enforce fictional adult eligibility across every participant
Source: https://trello.com/c/VQCKsd3o

### RCE-053: Deliver executable OpenAPI and shared application contracts
Source: https://trello.com/c/LOuL7U3K

### RCE-054: Architecture decisions and agent Definition of Ready
Source: https://trello.com/c/I8zm8tXF

### RCE-055: Resolve pinned global cores and scenario-specific overrides
Source: https://trello.com/c/GJ6Tm3Hd

### RCE-056: Model player authorization and scoped character willingness
Source: https://trello.com/c/IYUmhuye

### RCE-058: Implement portable character packages and version migrations
Source: https://trello.com/c/NvIrUbyI

## Application and platform additions

### RCE-059: EPIC: Accounts, character library and responsive roleplay app
Source: https://trello.com/c/AKoFJ8SZ

### RCE-060: EPIC: Secure delivery platform and operating readiness
Source: https://trello.com/c/vV5qUicB

### RCE-061: Bootstrap runnable API, web, worker and contract workspace
Source: https://trello.com/c/nFjeG6xi

### RCE-062: Enforce account ownership and continuity isolation everywhere
Source: https://trello.com/c/asv3lOGT

### RCE-063: Implement registration, email verification, login and recovery
Source: https://trello.com/c/uZsPDJmm

### RCE-064: Build account settings and device-session management
Source: https://trello.com/c/XEv5r2TH

### RCE-065: Implement adult-user onboarding and content authorization
Source: https://trello.com/c/BWj9Izyz

### RCE-066: Browse, search, favorite and select characters
Source: https://trello.com/c/TLDozCDR

### RCE-067: Build character authoring, cloning and portability UI
Source: https://trello.com/c/1oCI8WNO

### RCE-068: Create scenarios, player personas and character lineups
Source: https://trello.com/c/vAmGHiRL

### RCE-069: Persist conversations, messages and durable turn status
Source: https://trello.com/c/EeE1DTtb

### RCE-070: Deliver mobile chat UI and reconnectable validated output
Source: https://trello.com/c/3i1D7JO3

### RCE-071: Implement safe edit, regenerate, cancel and retry semantics
Source: https://trello.com/c/b6pRhzpg

### RCE-072: Implement model adapters and explicit provider capability gates
Source: https://trello.com/c/63Nna5BP

### RCE-073: Implement durable workers, outbox and fenced retries
Source: https://trello.com/c/PVEwD9gF

### RCE-074: Add usage budgets, rate limits and cost accounting
Source: https://trello.com/c/xhCFCQB1

### RCE-075: Build responsive app shell, accessibility and installable PWA
Source: https://trello.com/c/PwiQ5NLM

### RCE-076: Implement private portrait and media storage pipeline
Source: https://trello.com/c/8bPgcNLS

### RCE-077: Implement user export, erasure and retention lifecycle
Source: https://trello.com/c/0JTsnDeR

### RCE-078: Build catalog administration, reporting and incident controls
Source: https://trello.com/c/qlstY2BB

### RCE-079: Harden API, imports and model boundaries against hostile input
Source: https://trello.com/c/JjeXiEqy

### RCE-080: Build deployment, backup, restore and rollback runbooks
Source: https://trello.com/c/r6L9WWuF

### RCE-081: Implement database migration harness and base repositories
Source: https://trello.com/c/RztYWfMI

### RCE-082: Add privacy-safe turn tracing and operational observability
Source: https://trello.com/c/YFA0NIC9

### RCE-083: Prove complete product journeys with release regression tests
Source: https://trello.com/c/yVwU4FgX

### RCE-084: Model goals, mood and temporary bodily state without personality drift
Source: https://trello.com/c/stCGEN6t

### RCE-085: Resolve entities and extract grounded action proposals
Source: https://trello.com/c/2uff7FLs

### RCE-086: Orchestrate multiple speakers with isolated knowledge and voice
Source: https://trello.com/c/x9Wgw7AR

### RCE-087: Define world lore, location hierarchy and state lifetimes
Source: https://trello.com/c/iwcWOiF4

### RCE-088: Track player intent and scene focus without inventing preferences
Source: https://trello.com/c/rJ9mKesT

### RCE-089: RELEASE GATE: distribution, providers, age assurance and launch scope
Source: https://trello.com/c/DR7cGtQX

### RCE-090: Enforce coding-agent story contracts and traceability in CI
Source: https://trello.com/c/8nne0PrA
