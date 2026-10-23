# Scene Library Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this single integrated task. The user authorized direct execution, limited tests, commit and PWA.

**Goal:** Add 320 selectable, animated scene compositions with contextual automatic selection.

**Architecture:** A typed scene catalog owns metadata, preset IDs and vocabulary. A shared SVG world module draws the 40 new families; storyboard assigns stable, non-repeating presets. A small inspector component provides catalog search.

**Tech Stack:** Existing TypeScript, React and SVG; no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-scene-library-design.md`

## Global Constraints

Preserve schemaVersion 1, old projects, user visual direction, mobile single-pane layout, balanced lyric zoom policy and private media exclusion.

## Review Focus

Preset/kind mismatch must reject invalid JSON; manual selection must update metadata and motion; unknown lyrics must avoid unrelated literal imagery; repeated bilingual refrains must vary deterministically; both output formats must render valid SVG with bounded complexity.

### Task 1: Catalog, worlds and editor

**Files:** Create `src/engine/scene-catalog.ts`, `src/engine/world-library.ts`, `src/editor/SceneLibrary.tsx`, `tests/scene-library.test.ts`. Modify model, storyboard, semantics, frame, stage, editor and README.

**Interfaces:** `scenePresets` lists stable preset IDs, family, label and variant; `applyScenePreset(scene,preset)` applies a manual choice; `assignScenePresets(scenes)` assigns contextual variations only to newly generated storyboards. `libraryWorlds(hero,words)` implements new worlds in the shared renderer.

- [ ] Write and run failing tests for new semantic worlds and non-repeating bilingual refrains.
- [ ] Implement catalog and 40 SVG families, with eight meaningful compositions per family; preserve legacy rendering when no preset exists.
- [ ] Integrate automatic assignment, validation and searchable mobile inspector.
- [ ] Run focused regression, one full suite, TypeScript/PWA build and a local audio/example smoke check; inspect representative rendered worlds.
- [ ] Perform one bounded code review, commit source, publish PWA with existing authenticated GitHub tools, and verify deployment.

Atualização de escopo: o usuário priorizou o boneco e dispensou testes adicionais. Gestos e cotovelos ajustados primeiro. Compilar e construir o PWA; a avaliação visual final fica com o usuário. Os dois testes de seleção passaram antes dessa instrução; não rodar suíte adicional.
