# Roleplay Character Engine

A persistent character, memory, anatomy, relationship, and scene state engine for AI roleplay chat.

The engine treats structured state as canonical truth and generated prose as a proposed transaction. Character identity, anatomy, appearance, terminology, knowledge, beliefs, relationships, memories, and scene state remain separate domains with explicit precedence and validation rules.

## Core principles

1. Structured state is canonical. Prose describes state but does not directly own it.
2. Explicit user canon outranks model inference.
3. Unknown remains unknown unless policy explicitly permits inference or invention.
4. Identity, gender, pronouns, anatomy, appearance, and terminology are independent dimensions.
5. Character specific knowledge and memory are isolated to prevent accidental omniscience.
6. Generated turns are validated before state changes are committed.
7. Memory retrieval is bounded, relevance driven, and source traceable.
8. Event sourcing preserves history, rollback, branching, and retcons.

## Initial architecture

- TypeScript on Node.js
- MCP server as the controlled interface into roleplay state
- PostgreSQL for canonical relational state
- Event sourced timeline for scene and turn history
- Vector retrieval for memory relevance only, never as canonical truth
- Explicit validation and transaction boundaries around generated narrative

## Primary domains

- Character identity and archetypes
- Anatomy graph, presets, and overrides
- Character agency and player control
- Scene geometry, clothing, held objects, and contact
- Character specific memory and beliefs
- Directional multidimensional relationships
- World truth and knowledge boundaries
- Context compilation and memory retrieval
- Continuity validation and repair
- Timeline branching, save points, and retcons

## Project tracking

The implementation backlog is mirrored from the Trello board: Roleplay Character Management & Reference System.
