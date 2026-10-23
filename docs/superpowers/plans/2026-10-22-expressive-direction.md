# Expressive Direction Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution. Track each deliverable below.

**Goal:** Zoom and rotate complete lyric phrases according to vocal delivery, with semantic body gestures and reproducible procedural variety.

**Architecture:** Extend the existing time-driven SVG pipeline with optional vocal envelopes and scene performance recipes. Keep one renderer for preview, Sharp and browser export.

**Tech Stack:** TypeScript, React, SVG, NumPy/SciPy, OpenType, Sharp and FFmpeg.

**Spec:** `docs/motion-direction.md`

## Global Constraints

- Preserve schemaVersion 1 and legacy projects.
- No dance loops; preserve floor contacts and object constraints.
- Declare mixed-audio vocal detection as a spectral estimate.
- Deterministic evaluation, offline font support, both aspect ratios and both export paths.

## Review Focus

- Instrumental percussion and unavailable voice analysis must not fabricate confident shouting.
- Retimed word anchors must move phrase camera and expression together.
- Long/CJK phrases and perspective extremes must remain inside safe bounds.
- Malformed recipes/envelopes must fail JSON validation.
- Exports must select the same font face and spacing as the preview.

## Tasks

1. **Vocal expression.** Add failing fixtures to `tests/performance.test.ts`; extend `Analysis` in `model.ts`, browser/Python audio analyzers and focus planning. Test soft/loud repetitions and instrumental-only material. Keep legacy fallback neutral.
2. **Procedural direction.** Create catalog and director modules; add validated optional scene recipes. Select by seed, meaning and delivery; expose reproducible reroll. Test serialization, variation and invalid references.
3. **Phrase projection and body.** Extend `focus.ts` with shared-plane perspective, delivery envelopes and fitted projected bounds. Add semantic upper-body gestures in a separate module; call it before IK and object contacts. Rasterize variants and check continuity/floor contacts.
4. **Typography and editor.** Bundle licensed DejaVu faces and metrics. Update browser outlines/font loading, explicit Pages assets and inspector controls for phrase focus, delivery and recipes. Verify browser interaction, undo and responsive controls.
5. **Delivery.** Update demo recipes/docs. Run `npm test`, `npm run build`, `npm run build:pages`, `npm run check:pages`; inspect real rendered frames and H.264 output. Review diff, commit and push source and published PWA without Actions.

- [ ] Vocal expression
- [ ] Procedural direction
- [ ] Phrase projection and body
- [ ] Typography and editor
- [ ] Verification and commits
