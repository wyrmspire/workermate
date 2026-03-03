# Release Evidence — Phase 1

**Date:** 2026-03-01
**Build:** Next.js 16.1.6 (Turbopack)
**Mock Mode:** `NEXT_PUBLIC_MOCK_MODE=true`

---

## E.1 — Test Assets ✅

- `docs/TEST_ASSETS.md` created with mock-mode expected values and live-mode test drawing guidelines.

## E.2 — Mock-Mode Smoke Run ✅

| Check | Result |
|-------|--------|
| Page loads at localhost:3000 | ✅ Dark theme, WorkerMate header, upload dropzone visible |
| Upload accepts any image | ✅ Mock returns `fileUri: mock://test-print.png` |
| Step 1 overlay renders | ✅ Green/yellow boxes on SVG with `viewBox="0 0 1000 1000"` |
| Step 1 → Yes advances to Step 2 | ✅ State transitions to ORIENT_STEP_2 |
| Step 2 → Yes advances to Step 3 | ✅ |
| Step 3 → No shows feedback textarea | ✅ Textarea expands, Submit button visible |
| Step 3 retry with feedback | ✅ Same step re-runs, state does NOT advance (mock returns same fixture) |
| Step 3 → Yes advances to Step 4 | ✅ |
| Steps 4–5 → Yes | ✅ |
| ORIENT_LOCKED summary | ✅ Shows L: 120mm, W: 80mm, D: 35mm, Datum: top |
| Start Over resets to IDLE | ✅ |

## E.3 — Live-Mode Run

- Step 1 (DetectViews): ✅ Completed successfully with real print, overlays render
- Steps 2–5: ⬜ Pending — config `thinkingConfig`/`mediaResolution` fixed, awaiting retest
- Genkit config: `thinkingConfig: { thinkingLevel }` + per-part `metadata: { mediaResolution: { level } }`

## E.4 — Coordinate Validation ✅ (Mock)

All mock fixture coordinates verified within 0–1000:
- Step 1: boxes at (50,50,400,400) and (500,50,200,400) — valid
- Step 2: box at (60,60,380,380), cropWindow (50,50,400,400) — valid
- Step 3: arrows fromX/Y and toX/Y all within 0–1000 — valid
- Step 4: box (500,50,200,400), arrow within bounds — valid
- Step 5: lines and points within bounds — valid

## E.5 — Retry Loop Tests ✅ (Mock)

| Step | Feedback Sent | Same Step Re-ran | State Unchanged | Result Changed |
|------|--------------|------------------|-----------------|----------------|
| 3 | "wrong dimensions" | ✅ | ✅ | ⚠ No (mock always returns same fixture) |

In live mode, Gemini will receive the feedback text appended to the prompt and generate a revised proposal.

## E.6 — Schema Robustness

| Test | Result |
|------|--------|
| Missing `fileUri` in step request | ✅ Returns 400 |
| Missing `confirmedViews` in step-2 | ✅ Returns 400 |
| Invalid JSON body | ✅ Returns 400 |
| Empty FormData on upload | ✅ Returns 400 |
| Unsupported file type | ✅ Returns 400 (validated client-side too) |

## E.7 — QA Checks

| Check | Result |
|-------|--------|
| File type rejection (client-side) | ✅ Error banner shown |
| File size rejection (client-side 20MB limit) | ✅ Error banner shown |
| Loading spinner during API calls | ✅ Visible during steps |
| Start Over reset | ✅ Returns to IDLE dropzone |
| Hydration mismatch | ✅ Fixed with suppressHydrationWarning |

## E.8 — Release Gate

| Criterion | Status |
|-----------|--------|
| `npm run build` passes cleanly | ✅ Zero errors |
| All 6 API routes registered | ✅ upload + step-1 through step-5 |
| Mock-mode wizard completes end-to-end | ✅ |
| Retry loop works mechanically | ✅ |
| Overlay SVG coordinate system correct | ✅ viewBox="0 0 1000 1000" |
| Live-mode Gemini integration | ⬜ Pending prompt tuning |

### Verdict

**Phase 1 scaffold is release-ready for mock mode.** Live mode is mechanically wired but awaits prompt tuning with real machinist prints.
