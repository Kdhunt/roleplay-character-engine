# Proposal: reuse the SimIA world engine for runtime world state

**Status: PROPOSAL. No card exists yet.** This is a design note, not a contract. Nothing here is normative, and `proposals/` is deliberately outside the contract set. It changes no invariant, schema or story.

Snapshot 2026-10-16. Source: `Kdhunt/simia` (private), branch `feat/house-skill` at the time of writing.

## Problem

RCE-043 (runtime world state and simulation) indexes the stories that make a scene physically coherent: geometry (RCE-010), clothing and contact (RCE-011), grounded objects (RCE-049), multi-character interactions (RCE-050), world lore and locations (RCE-087), and, at M2, offscreen simulation (RCE-024). None of them is built.

A separate project, SimIA, already simulates a household. It models:

- rooms with levels, sizes and routes;
- about 480 catalog object kinds that wear with use and neglect;
- people and a dog with bodies, routines, moods, food, hobbies and dreams;
- speech that carries by distance;
- briefings scoped to where a character is.

It is TypeScript on Node with zod schemas. It is exposed over MCP, by stdio and by Streamable HTTP, and has a working deployment and a 3D viewer.

The question is whether RCE should reuse that work, and in what form, without violating the invariants that make RCE's continuity trustworthy.

## What SimIA is, measured

Counts and capabilities taken from the source; nothing here claims RCE conformance.

| Area | SimIA today |
| --- | --- |
| Objects | 16 hand-tuned definitions plus 8 hobby objects plus catalog-composed kinds (25 behavior profiles), each with typed meters (0–100, declared good direction), flags, intents, interactions (`use` / `maintain` / `inspect`), `blocked` reasons, passive drift per simulated hour, supplies between objects in a room, and issue text |
| Places | Room types from RESO RoomType plus common spaces; houses built from a real listing (levels, sizes, connections) or from a property class; routes with travel time; earshot |
| Beings | Body meters, conditions from sustained neglect, mood, personality dials, flaws, reward tags, routines with skip logic, clothing with freshness, relationships with tension and closeness |
| Food | Ingredients with shelf lives, recipes that consume them, tastes, diets and allergies, shopping on a budget, spoilage |
| Hobbies and dreams | Gear whose condition scales progress; dreams with progress, passion, milestones and neglect |
| Context | A per-character briefing: always-on self/body/family/time, plus only the current room or away place; a persona block placed last |
| Effects | Snapshot and diff: what changed for objects, rooms and each being |
| Transport | MCP tools over stdio and Streamable HTTP; versioned compare-and-set saves |
| Tests | Eight engine suites (simulation, catalog, beings, food, hobbies, web, scene, MCP), all passing at the snapshot |

## Where it conflicts with RCE, stated plainly

Taken as-is, SimIA would break several invariants. Each conflict below is structural, not cosmetic.

1. **Two authorities.** SimIA owns its world state and mutates it directly. ADR-004 requires one authoritative scene and says to reuse the simulation services, not run a second one. INV-001 makes structured state canon. A SimIA world running beside `scene_state` would be a second canon.
2. **Writes without validation.** SimIA's tools (`act`, `move`, `advance_time` and others) apply effects immediately. INV-004 says model output carries no authority; INV-023/024 require generation outside the transaction and an atomic commit of validated effects. The MCP adapter section of API.md forbids a raw arbitrary-state write tool.
3. **No scope.** A SimIA world is keyed by an id. INV-017 requires owner, continuity and branch on every operation, and INV-029 requires branching from pre-turn state.
4. **Its own memory.** SimIA keeps a per-being log and free-text memories. RCE's memory taxonomy (RCE-025), Observation records and INV-041 perception scoping own that. Two memory stores would diverge.
5. **Presence treated as perception.** SimIA's briefing shows a character everything in the room they're in. INV-041 says being present is not perception. Earshot-based speech is closer to RCE's model than room contents are.
6. **A clock that runs.** SimIA advances routines, wear and food on its own. RCE-024 makes offscreen simulation M2-only, explicitly enabled and budgeted; disabled worlds do not advance.
7. **Its own stack for chat.** SimIA's Python service (turns, threads, a consistency check, a content filter) overlaps RCE's API, worker and gate model and is weaker than them. It should not be reused.
8. **Containment is missing.** INV-037 and RCE-049 need exactly one primary placement per object and acyclic containment. SimIA places objects in rooms only; nothing is carried, pocketed or put in a drawer.

## Proposed approach

Reuse SimIA's **behavior**, not its **authority**.

**Port, don't attach.** The object definitions, catalog composition, being rules, food and dreams are pure functions over state plus a seeded random generator. They move into `packages/domain` as reducers: `(prior state, validated action, pinned rule versions) → proposed effects`. RCE persistence stores the resulting state in its own aggregates; SimIA's JSON world and its store go away inside RCE.

**Effects enter only as validated events.** A reducer's output is a proposed effect set, checked by RCE-019 and committed by RCE-018 with the rest of the turn. An object's wear, a spoiled ingredient or a moved being is a `WorldEvent` like any other. Nothing reaches canon on the reducer's say-so.

**Rules are versioned releases.** Object behavior, recipes and routine templates become pinned, versioned releases alongside `EnvironmentTemplate` and `PresetRelease`, so replay is reproducible (INV-013) and the random seed is part of recorded state.

**Simulation is opt-in.** Passive drift (wear, spoilage, routines) runs only for a world with offscreen simulation explicitly enabled and budgeted, which is RCE-024's terms. With it disabled, world time advances only through accepted turns, and passive effects apply only for the elapsed scene time a turn declares.

**Perception replaces presence.** The briefing becomes one input to RCE-017's context compiler and is cut down to what Observations allow. Room contents are perceived through an Observation, not granted by location.

**Containment is added, not assumed.** SimIA's object model gains RCE-049's single primary placement and acyclic containment before any of it is ported. The watch must survive drop, reload, transfer and reset.

**The MCP surface becomes RCE's adapter.** Read tools (context, house view, pantry, dreams) map onto RCE's permission-aware read services. Write tools become typed proposals that go through the normal turn pipeline, never a direct state write (API.md, MCP adapter).

## What maps where

| SimIA piece | RCE owner | Treatment |
| --- | --- | --- |
| Object definitions, meters, interactions, issues | RCE-049 (objects), EnvironmentTemplate capabilities | Port as condition reducers on `ObjectInstance`; meters become condition fields with lifetimes |
| Catalog and behavior profiles | EnvironmentTemplate releases | Port as versioned template content; "a template does not claim every real bedroom contains a dresser" still holds |
| Rooms, levels, routes, listing import | RCE-087 (location hierarchy) | Port as Location seeds; routes and earshot inform qualitative proximity |
| Floor-plan layout and positions | RCE-010 (geometry) | Optional numeric extension only; DOMAIN.md says coordinates are never required |
| Clothing and freshness | RCE-011 | Freshness is a condition; coverage and fastening are RCE's |
| Bodies, routines, flaws, food, hobbies, dreams | RCE-024 (M2) plus character goals | Reducers behind the simulation flag; dreams map to goals with status and visibility |
| Briefing | RCE-017 | One input, filtered by Observations |
| Snapshot and diff | Turn outcome and effect manifest | Replaced by RCE's completion manifest |
| Speech by distance | RCE-014 / Observation | Earshot becomes an evidence channel for who perceived an utterance |
| Python chat service, filter, threads | — | Not reused |

## The three constraints, and the one that matters most

1. **Simulation can never satisfy a gate.** A routine, a room or a body meter is not evidence for any of the five gates. INV-031 already lists what a gate may be derived from. SimIA's sample household includes children; their ages must reach the fictional-adulthood gate (INV-032) as authored character data, and no simulated state may bear on adult content at all.
2. **One canon.** Everything SimIA computes is a proposal until committed. There is no path by which simulated state becomes canon except an accepted event.
3. **Disabled means still.** A world without offscreen simulation enabled does not advance between turns, however it is hosted.

## The hard part, stated honestly

**SimIA was designed as a living world; RCE is designed as a validated record.** Much of SimIA's appeal comes from things happening on their own: Noah's controller drifts, the milk spoils, Maya studies after a shift. Under RCE's model, all of that is either (a) recomputed deterministically for the scene time a turn declares, or (b) M2 offscreen simulation with a budget. Some behaviors will feel less alive in M0/M1, and that is the correct trade.

**The port is real work.** The reducers are pure in spirit but share mutable world state in practice: one object's interaction can write a room's air, and the dog can take food. Splitting that into effect proposals is most of the cost. So is containment, which SimIA never had.

**Rule content needs review.** Catalog behaviors and routines encode assumptions (household roles, school schedules, what counts as neglect). As with social frames, they should be reviewed and released as authored, versioned content, not taken from SimIA wholesale.

## Proposed cards

Draft text for Trello, not yet created. Bounded, in order.

> **Specify object condition lifecycles on ObjectInstance**
>
> Epic RCE-043. Depends on RCE-049, RCE-025.
>
> Define condition fields (typed 0–100 meters with good direction, flags, issues), their lifetimes, and how use, maintenance and elapsed scene time change them, as versioned rule releases. Port the SimIA bath, toilet, sink and towel definitions as fixtures.
>
> Acceptance: condition changes are proposed effects committed with the turn; a rejected turn changes no condition; the same prior state, action, rule versions and seed produce the same condition; replay never calls a model.

> **Add containment to the ported object model**
>
> Epic RCE-043. Depends on RCE-049.
>
> One primary placement, acyclic containment, carried items. Fixtures: the watch drop/reload/transfer/reset journey, a pantry item moved to a bag and back.

> **Port household routines and passive drift behind the simulation flag**
>
> Epic RCE-043. Depends on RCE-024, RCE-018.
>
> Routines, food and hobby wear as reducers that run only for worlds with offscreen simulation enabled and budgeted. Disabled worlds do not advance.

> **Feed the briefing into context compilation through Observations**
>
> Depends on RCE-014, RCE-017.
>
> Room contents and speech reach a character only through Observations; presence alone grants nothing (INV-041).

## Open questions

1. **Port or wrap?** This note proposes porting into `packages/domain`. Wrapping SimIA as an external service and treating its output as proposals is possible, but it keeps two state stores and a reconciliation problem. Owner's call.
2. **How much passive drift is in scope before M2?** Proposed answer: only drift for the elapsed scene time a turn declares, applied deterministically in the reducer.
3. **Where do meters live?** As fields on `ObjectInstance` condition, or as a separate runtime projection? RCE-003 owns entity fields.
4. **Are body meters (hunger, energy, bladder) RuntimeState?** They change constantly and drive behavior, which suggests runtime-only with no memory rows, per ADR-004's "routine narration creates no separate observation".
5. **What happens to the catalog's 480 kinds?** Ship a curated subset as the first EnvironmentTemplate release and grow it, or port all of them behind review?
6. **Does SimIA's 3D viewer have a place?** It is a client of a scene feed. RCE's client is Vue; the viewer is plain three.js and could become an optional view in `apps/web`, reading only permitted state.
