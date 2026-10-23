# Reel Sequences Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax for tracking.

**Goal:** Replace the repeated reel stage with phrase-directed spatial compositions.

**Architecture:** Derive immutable phrase shots from existing lyric timings and voice analysis. Render spatial type, desktop/dialog actions and the existing native worlds through the shared deterministic SVG renderer.

**Tech Stack:** Existing TypeScript, SVG, React/Vite PWA, sharp and FFmpeg; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-reel-sequences-design.md`

## Global Constraints

- Words never appear before their supplied timestamps; timings are never rewritten by rendering.
- Editor, PWA and MP4 share the renderer, including backward seeking.
- Preserve instrument contacts and manual focus controls.
- No deployment or full-track ASR/export in this change.
- Deliver a short 720 × 1280, 60 FPS preview, and publish source commits remotely.

## Review Focus

- A long unbroken word must remain within the final reveal in portrait and landscape.
- A timestamp edited in place must invalidate derived phrase planning.
- A scene without words must still render its native world.
- An ordinary phrase or drum hit alone must not become a shouting zoom.
- Custom fonts, disabled performance and manual focus must retain their purpose.

### Task 1: Phrase direction and renderer integration

**Files:** Create `src/engine/reel-direction.ts`, `src/engine/reel-stage.ts`, `tests/reel-sequences.test.ts`; modify `src/engine/frame.ts`, `src/engine/director.ts`.

**Interfaces:** `planReelShots(project, scene)` produces timed shots with phrase bounds; `reelCamera(shot, time, width, height)` and `projectReelPoint(camera, point)` produce deterministic screen coordinates; `renderReelStage(context, nativeWorld)` produces an SVG layer.

- [x] Write and run the failing instrument regression through `renderFrame`; reel guitar/piano/drums must contain the actual instrument.
- [x] Add behavior checks for phrase camera/reveal bounds, timestamp edits, held words, future words and empty scenes.
- [x] Implement phrase planning and projection, then distinct type/desktop/dialog/world compositions.
- [x] Route reel scenes through the new stage, preserving native world rendering and manual lyric focus.
- [x] Run `node --import tsx --test tests/reel-sequences.test.ts tests/lyric-sync.test.ts tests/creative-stage.test.ts`; expected all pass.

### Task 2: Visual proof and publication

**Files:** Update README; private rendering material stays in ignored `output/` and `public/media/`.

- [ ] Render and inspect representative frames and a short actual-music excerpt; correct clipping, unreadable words or repeated composition.
- [x] Run `npm test` once and `npm run build:pages`; inspect results and the PWA private-audio exclusion report.
- [ ] Review the final diff, preserve concurrent remote work and publish using an expected-head lease.
- [ ] Save the short MP4 and report the remote commit, build and remaining visual limits.
