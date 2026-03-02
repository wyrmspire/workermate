# WorkerMate Phase 1 — Agent Board

> **Project:** WorkerMate — Machinist Print Analyzer
> **Phase:** 1 — Orientation Wizard (5-Step)
> **Status:** All documentation locked. ZERO code exists. Building from scratch.
> **Repository root:** `workermate/`
>
> **Model:** Gemini 3 Flash (`gemini-3-flash-preview`) — hard-coded, no fallbacks
> **AI Orchestration:** Genkit (`genkit`, `@genkit-ai/google-genai`)
> **File Uploads:** `@google/generative-ai` (`GoogleAIFileManager`) for Files API upload; Genkit receives `fileUri`
> **Framework:** Next.js (App Router) + React + Tailwind
> **Overlays:** SVG with normalized 0–1000 coordinate system
> **Validation:** Zod schemas (structured JSON output from all flows)
> **State:** In-memory React state only. No database in Phase 1.
> **Env:** `GEMINI_API_KEY` via `.env.local`

---

## Key References

| Document | Path | Purpose |
|---|---|---|
| Architecture | `ARCHITECTURE.md` | State machine, data contracts, interfaces |
| Orientation Wizard | `docs/01_ORIENTATION_WIZARD.md` | Step-by-step wizard spec |
| Overlay System | `docs/02_OVERLAYS.md` | 0–1000 coordinate system, OverlaySpec primitives |
| Model Config | `docs/03_MODEL_CONFIG.md` | Gemini 3 Flash knobs (`thinkingLevel`, `mediaResolution`) |
| Agent Rules | `agents.md` | Hard constraints for AI coding agents |
| Roadmap | `docs/00_ROADMAP.md` | Phase overview and non-goals |

---

## Locked Constraints (Do Not Drift)

1. Model ID is `gemini-3-flash-preview` in every flow. No fallback model and no alternate model names.
2. Every wizard step ends with exactly one Yes/No question. No multi-question prompts.
3. Retry loop is mandatory. On `No`, call the same step again with `fileUri`, prior confirmed facts, rejected proposal, and `rejectionFeedback`.
4. All flow outputs are structured JSON validated by Zod before returning to UI.
5. Overlay coordinates always use normalized global `0..1000` space. `cropWindow` changes viewport only, never coordinate frame.
6. Truth hierarchy is strict: confirmed user facts > model proposal > unknown. Never overwrite confirmed prior-step facts.
7. Gemini 3 uses `thinkingLevel` (enum: `MINIMAL`, `LOW`, `MEDIUM`, `HIGH`), NOT `thinkingBudget`. Do not mix these.
8. Files API requires `@google/generative-ai` package (`GoogleAIFileManager`). This is separate from Genkit. Install it alongside Genkit.

---

## Lane A — Project Bootstrap & Foundation

**Files:** `package.json`, `tsconfig.json`, `next.config.js`, `src/agent/genkit.config.ts`, `src/lib/schemas.ts`, `src/lib/types.ts`
**Goal:** Initialize the Next.js project, install all dependencies, define every Zod schema and TypeScript type from ARCHITECTURE.md, and configure Genkit with the Gemini 3 Flash plugin. After this lane, any agent working on Lanes B–D has a compilable project with all shared types available.

| # | Task | Status | Notes |
|---|------|--------|-------|
| A.1 | Initialize Next.js project with TypeScript | ✅ DONE | Run `npx create-next-app@latest . --typescript --app --src-dir --tailwind --eslint` from the repo root. Use App Router. Confirm `src/` directory structure is created. Do NOT overwrite existing `README.md` — decline or restore after scaffold. Verify `next dev` runs cleanly before proceeding. |
| A.2 | Install Genkit, Gemini, and Files API dependencies | ✅ DONE | `npm install genkit @genkit-ai/google-genai @google/generative-ai zod`. These are the four core packages. `@google/generative-ai` is needed for `GoogleAIFileManager` (Files API upload). Do NOT install `@genkit-ai/firebase` or any other provider. Verify packages exist in `node_modules` after install. |
| A.3 | Create Genkit configuration module | ✅ DONE | Create `src/agent/genkit.config.ts`. Import `genkit` from `genkit` and `googleGenAI` from `@genkit-ai/google-genai`. Initialize with `const ai = genkit({ plugins: [googleGenAI()] })`. Export the `ai` instance. The `GEMINI_API_KEY` env var is read automatically by the google-genai plugin. Do NOT hard-code any API key. Do NOT reference any model other than `gemini-3-flash-preview`. |
| A.4 | Define all Zod schemas in `src/lib/schemas.ts` | ✅ DONE | Translate every interface from ARCHITECTURE.md Section 3 into Zod schemas. Must include: `OverlaySpecSchema` (with `boxes`, `lines`, `points`, `arrows` arrays — each element has x/y/w/h or x1/y1/x2/y2 as `z.number().min(0).max(1000)`), `ViewLayoutSchema`, `DimensionProposalSchema` (value: number, unit: enum mm/in, sourceViewId: string, confidence: number 0–1), `DatumProposalSchema`, `OrientationStepResultSchema` (proposalData: z.any(), overlay: OverlaySpecSchema, question: z.string(), optional cropWindow), `WizardStateSchema` (enum of IDLE, UPLOADED, ORIENT_STEP_1..5, ORIENT_LOCKED). Export all schemas AND their inferred types via `z.infer<>`. |
| A.5 | Define TypeScript types in `src/lib/types.ts` | ✅ DONE | Create `OrientationSession` interface matching ARCHITECTURE.md exactly: `fileUri: string`, `currentState: WizardState`, `confirmedViews?: ViewLayout[]`, `confirmedEnvelope?: OverlaySpec`, `confirmedLW?: { length: DimensionProposal; width: DimensionProposal }`, `confirmedDepth?: DimensionProposal`, `lockedDatum?: DatumProposal`. Also define per-flow input types: `StepInput` base type with `fileUri: string`, `rejectionFeedback?: string`, plus step-specific extensions carrying prior confirmed data. Import Zod-inferred types from `schemas.ts` where possible to avoid duplication. |
| A.6 | Create mock fixtures for all 5 steps | ✅ DONE | Create `src/lib/mocks.ts` with deterministic JSON fixtures matching every Zod schema. One `OrientationStepResult` per step with realistic overlay coordinates and questions. These fixtures power the mock mode so the entire UI can be developed and tested without calling Gemini. |
| A.7 | Add mock/live mode switch | ✅ DONE | Add `NEXT_PUBLIC_MOCK_MODE=true` to `.env.example`. In a utility `src/lib/mode.ts`, export `isMockMode()`. API routes check this flag: if mock, return the fixture from `mocks.ts`; if live, call the Genkit flow. This lets the UI team iterate without burning API quota. |
| A.8 | Verify project compiles and dev server starts | ✅ DONE | Run `npm run build` and `npm run dev`. Fix any TypeScript errors. Confirm the default Next.js page loads at `localhost:3000`. Confirm `src/agent/genkit.config.ts` compiles without errors. This is the gate — do not proceed to Lane B until this passes. |

---

## Lane B — Genkit AI Flows

**Files:** `src/agent/orientationFlowStep1_DetectViews.ts`, `src/agent/orientationFlowStep2_ConfirmEnvelope.ts`, `src/agent/orientationFlowStep3_LockLW.ts`, `src/agent/orientationFlowStep4_LockDepth.ts`, `src/agent/orientationFlowStep5_FinalSummary.ts`, `src/agent/index.ts`
**Goal:** Implement all 5 Genkit flows. Each flow accepts `fileUri` + prior confirmed data + optional rejection feedback, calls Gemini 3 Flash with a carefully scoped prompt, and returns Zod-validated structured JSON containing `proposalData`, `overlay` (OverlaySpec), and `question` (string). The flows are the intellectual core of the application.

| # | Task | Status | Notes |
|---|------|--------|-------|
| B.1 | Implement `orientationFlowStep1_DetectViews` | ✅ DONE | Create `src/agent/orientationFlowStep1_DetectViews.ts`. Use `ai.defineFlow()` from the shared genkit config. **Input schema:** `{ fileUri: string, rejectionFeedback?: string }`. **Output schema:** `OrientationStepResultSchema` where `proposalData` is `ViewLayout[]`. **Model call:** Use `ai.generate()` with `model: 'gemini-3-flash-preview'`, config `{ thinkingLevel: 'MINIMAL', mediaResolution: 'medium' }`. **Prompt:** System prompt must explain the 0–1000 normalized coordinate system, instruct the model to find all orthographic/isometric views, classify them (front, top, right, section, iso), choose the primary view, and return bounding boxes. If `rejectionFeedback` is provided, append it as: "The user rejected your previous proposal. Their feedback: {feedback}. Try again." **Media input:** Pass `fileUri` as a `media` part with `url: fileUri`. The `question` field must always be: "Are these the bounding boxes for the views, and is the highlighted one the primary view?" |
| B.2 | Implement `orientationFlowStep2_ConfirmEnvelope` | ✅ DONE | Create `src/agent/orientationFlowStep2_ConfirmEnvelope.ts`. **Input schema:** `{ fileUri: string, confirmedViews: ViewLayout[], rejectionFeedback?: string }`. **Output schema:** `OrientationStepResultSchema` where `proposalData` is an `OverlaySpec` (single box). **Model config:** `thinkingLevel: 'MINIMAL'`, `mediaResolution: 'medium'`. **Prompt:** Provide the confirmed primary view bounding box from Step 1. Instruct: "Within the primary view at [coords], find the tightest bounding box around the physical part geometry. Ignore dimension lines, leader lines, notes, title block. Return a single box in 0–1000 coordinates." Include `cropWindow` set to the primary view bounds to help the UI zoom in. **Question:** "Does this box accurately capture the overall part envelope in the primary view?" |
| B.3 | Implement `orientationFlowStep3_LockLW` | ✅ DONE | Create `src/agent/orientationFlowStep3_LockLW.ts`. **Input schema:** `{ fileUri: string, confirmedViews: ViewLayout[], confirmedEnvelope: OverlaySpec, rejectionFeedback?: string }`. **Output schema:** `OrientationStepResultSchema` where `proposalData` is `{ length: DimensionProposal, width: DimensionProposal }`. **Model config:** `thinkingLevel: 'HIGH'`, `mediaResolution: 'high'`. Switch to HIGH thinking and HIGH resolution because reading dimension text is hard. **Prompt:** Provide confirmed envelope. Instruct: "Find the two overall dimension callouts (largest extents) in the primary view. The longer value is Length, the shorter is Width. Return the numeric values, units (mm or in), and draw arrows from whitespace to the dimension text locations." **Overlay:** Two arrows pointing to dimension callouts, labeled "Length (L)" and "Width (W)". **Question:** "Are the Length and Width axes and values correct for this primary view?" |
| B.4 | Implement `orientationFlowStep4_LockDepth` | ✅ DONE | Create `src/agent/orientationFlowStep4_LockDepth.ts`. **Input schema:** `{ fileUri: string, confirmedViews: ViewLayout[], confirmedLW: { length: DimensionProposal, width: DimensionProposal }, rejectionFeedback?: string }`. **Output schema:** `OrientationStepResultSchema` where `proposalData` is `DimensionProposal`. **Model config:** `thinkingLevel: 'HIGH'`, `mediaResolution: 'high'`. **Prompt:** Provide all confirmed views from Step 1. Instruct: "The primary view shows Length and Width. Find the best alternate view (side, top, or section) that shows the third dimension (Depth/Thickness). Identify the overall depth dimension callout. Draw a box around the alternate view and an arrow to the depth value." The model must select which non-primary view to use. **Overlay:** Box around chosen alternate view + arrow to depth dimension. **Question:** "Is this the correct depth (thickness) dimension?" |
| B.5 | Implement `orientationFlowStep5_FinalSummary` | ✅ DONE | Create `src/agent/orientationFlowStep5_FinalSummary.ts`. **Input schema:** `{ fileUri: string, confirmedViews: ViewLayout[], confirmedLW: { length: DimensionProposal, width: DimensionProposal }, confirmedDepth: DimensionProposal, rejectionFeedback?: string }`. **Output schema:** `OrientationStepResultSchema` where `proposalData` is `DatumProposal`. **Model config:** `thinkingLevel: 'HIGH'`, `mediaResolution: 'high'`. **Prompt:** Summarize all confirmed L/W/D. Instruct: "Determine the primary datum face — typically the face with the most dimension origin lines or the face designated as Datum A. Map L, W, D to X, Y, Z axes. Draw axis lines on the primary view overlay." **Overlay:** Lines for X/Y/Z axes on primary view + points for datum origin. **Question:** "Lock final orientation?" |
| B.6 | Create barrel export `src/agent/index.ts` | ✅ DONE | Create `src/agent/index.ts` that re-exports all 5 flows by name. Example: `export { orientationFlowStep1_DetectViews } from './orientationFlowStep1_DetectViews'`. This allows the API layer to import flows cleanly. Also export the shared `ai` instance from `genkit.config.ts` if needed for direct invocation. |

---

## Lane C — API Layer

**Files:** `src/app/api/upload/route.ts`, `src/app/api/wizard/step-1/route.ts`, `src/app/api/wizard/step-2/route.ts`, `src/app/api/wizard/step-3/route.ts`, `src/app/api/wizard/step-4/route.ts`, `src/app/api/wizard/step-5/route.ts`
**Goal:** Expose Next.js App Router API routes that the React frontend calls. The upload route handles the image-to-Files-API pipeline. The 5 wizard routes are thin wrappers that parse the request body, invoke the corresponding Genkit flow (or return mock fixtures), and return the structured JSON result.

| # | Task | Status | Notes |
|---|------|--------|-------|
| C.1 | Implement `POST /api/upload` route | ✅ DONE | `src/app/api/upload/route.ts` created. Handles multipart FormData, validates type/size, uses GoogleAIFileManager in live mode, returns mock fileUri in mock mode. |
| C.2 | Implement `POST /api/wizard/step-1` route | ✅ DONE | `src/app/api/wizard/step-1/route.ts` created. Mock/live switch, validates fileUri, dynamic import of flow. |
| C.3 | Implement `POST /api/wizard/step-2` route | ✅ DONE | `src/app/api/wizard/step-2/route.ts` created. Validates confirmedViews present and non-empty. |
| C.4 | Implement `POST /api/wizard/step-3` and `step-4` routes | ✅ DONE | Both routes created. Step 3 validates confirmedEnvelope. Step 4 validates confirmedLW.length and width. |
| C.5 | Implement `POST /api/wizard/step-5` route | ✅ DONE | `src/app/api/wizard/step-5/route.ts` created. Validates all confirmed prior data. On success frontend transitions to ORIENT_LOCKED. |

---

## Lane D — UI Components

**Files:** `src/components/ImageOverlay.tsx`, `src/components/YesNoPanel.tsx`, `src/components/StepHistory.tsx`, `src/components/WizardContainer.tsx`, `src/app/page.tsx`
**Goal:** Build the complete wizard UI. The user uploads an image, sees it rendered with SVG overlays, answers Yes/No at each step, and progresses through the 5-step state machine. The WizardContainer manages all state transitions, API calls, and retry loops.

| # | Task | Status | Notes |
|---|------|--------|-------|
| D.1 | Build `ImageOverlay.tsx` component | ✅ DONE | Create `src/components/ImageOverlay.tsx`. Props: `{ imageSrc: string, overlay: OverlaySpec, cropWindow?: { x, y, w, h } }`. Render the uploaded image in a container div. Overlay an absolutely-positioned SVG element sized to match the image. Use `viewBox="0 0 1000 1000"` on the SVG so normalized coords map directly. For each box: render `<rect>`. For lines: `<line>`. For points: `<circle r="5">`. For arrows: `<line>` with `marker-end` arrowhead `<defs>`. Add `<text>` elements for labels. Default stroke color: `#00FF00` (green). If `cropWindow` is provided, apply CSS `transform: scale()` and `transform-origin` to zoom to that region. Use `pointer-events: none` on the SVG layer so it doesn't block image interaction. |
| D.2 | Build `YesNoPanel.tsx` component | ✅ DONE | Create `src/components/YesNoPanel.tsx`. Props: `{ question: string, onConfirm: () => void, onReject: (feedback: string) => void, isLoading: boolean }`. Render the `question` text prominently. Two buttons: "Yes" (green) and "No" (red). When "No" is clicked, expand a textarea for optional feedback, then a "Submit Feedback" button that calls `onReject(feedbackText)`. When "Yes" is clicked, call `onConfirm()` immediately. Disable both buttons when `isLoading` is true and show a spinner. Tailwind classes only. |
| D.3 | Build `StepHistory.tsx` component | ✅ DONE | Create `src/components/StepHistory.tsx`. Props: `{ currentStep: number, confirmedFacts: OrientationSession }`. Render a horizontal breadcrumb or vertical timeline showing steps 1–5. Completed steps show a green checkmark and a one-line summary (e.g., "Step 1: 3 views detected, Front is primary"). Current step is highlighted. Future steps are grayed out. Pull summary text from the confirmed session data — e.g., for Step 3: "L: 120.0mm, W: 80.0mm". |
| D.4 | Build `WizardContainer.tsx` orchestrator | ✅ DONE | Create `src/components/WizardContainer.tsx`. This is the main state machine component. Internal state: `OrientationSession` object (initialized with `currentState: 'IDLE'`), `currentOverlay`, `currentQuestion`, `isLoading`, `imageSrc` (local blob URL for display). **Upload flow:** File input triggers POST to `/api/upload`, stores returned `fileUri`, sets state to `UPLOADED`, auto-advances to Step 1 by calling `/api/wizard/step-1`. **Step flow:** On API response, store overlay + question, render `ImageOverlay` + `YesNoPanel`. On "Yes": commit proposalData to the session, advance `currentState`, call next step API. On "No": call same step API again with `rejectionFeedback`. **Transitions:** IDLE→UPLOADED→ORIENT_STEP_1→...→ORIENT_STEP_5→ORIENT_LOCKED. At ORIENT_LOCKED, show success summary with all confirmed L/W/D values. **Gotcha:** Keep `imageSrc` (blob URL) separate from `fileUri` (Google Files API reference). |
| D.5 | Wire up `src/app/page.tsx` main page | ✅ DONE | Replace the default Next.js `src/app/page.tsx` with a minimal layout that renders `<WizardContainer />`. Page title: "WorkerMate — Print Analyzer". Centered container, max-width 1200px. No navigation or auth for Phase 1 — single-page app. |
| D.6 | Add upload dropzone to WizardContainer | ✅ DONE | In the `IDLE` state of `WizardContainer.tsx`, render a drag-and-drop zone for image upload. Use `<input type="file" accept="image/*,.pdf">` wrapped in a styled dropzone div. On file selection: create a local blob URL for `imageSrc`, create `FormData`, POST to `/api/upload`. Show upload progress/spinner. On success, store `fileUri` and transition to UPLOADED. Accepted types: PNG, JPG, JPEG, TIFF, PDF. |

---

## Lane E — Integration, Polish & Testing

**Files:** All files from Lanes A–D
**Goal:** Wire all layers together end-to-end, handle error states gracefully, verify the complete upload-to-locked flow works with a real machinist print image, and harden the retry loop.

| # | Task | Status | Notes |
|---|------|--------|-------|
| E.1 | Build browser test asset set and manifest | ⬜ TODO | Create `docs/TEST_ASSETS.md` listing at least 3 drawings: `clean-orthographic`, `dense-annotations`, and `ambiguous-depth`. For each asset, include known expected L/W/D so validations are objective in both mock and live runs. |
| E.2 | Mock-mode browser smoke run (all 5 steps) | ⬜ TODO | In browser, run full `IDLE → ORIENT_LOCKED` using mock mode. Verify each step renders overlays, asks exactly one Yes/No question, and persists confirmed state only on Yes. Capture evidence pack for each step. |
| E.3 | Live-mode browser run (all 5 steps) | ⬜ TODO | In browser, run full flow with live Gemini on at least 2 different prints. Verify extraction quality, same-step retry on No, and truth-hierarchy compliance (confirmed prior facts are never contradicted on later steps). Capture full evidence pack. |
| E.4 | Orientation coordinate validation | ⬜ TODO | For each step, verify every coordinate in response JSON is within `0..1000` and geometry constraints hold (`x+w <= 1000`, `y+h <= 1000`). Validate overlay-to-drawing alignment with tolerance: boxes/lines/points within +/-10 normalized units, arrow target tips within +/-15. |
| E.5 | Retry-loop and feedback incorporation tests | ⬜ TODO | For Steps 1, 3, and 4, force a rejection with specific feedback. Verify next call includes `rejectionFeedback`, same step re-runs (no state advance), and proposal changes in the direction of feedback. Repeat until accepted and then verify state advances exactly one step. |
| E.6 | Contract and schema robustness tests | ⬜ TODO | Validate every API response against Zod contracts in runtime tests. Inject malformed payload fixtures to ensure API returns structured error payloads and UI shows recoverable errors without crashing. |
| E.7 | Regular QA checks (upload, UX, responsiveness) | ⬜ TODO | Validate file type/size rejection, loading states, network/API failure messaging, Start Over reset behavior, and responsive layout on desktop and tablet. Verify overlay remains visually aligned after resize and crop-window zoom transitions. |
| E.8 | Release gate checklist | ⬜ TODO | Phase 1 is release-candidate only when all E.1–E.7 pass in both mock and live modes and each run has complete evidence: screenshots, request/response snippets, coordinate deltas, and explicit pass/fail notes. |

---

## Browser Agent Validation Protocol (Executable)

### Required Evidence Pack (Per Step)

| Field | Requirement |
|---|---|
| Screenshot | Full browser screenshot with overlay visible and step label |
| Request snippet | API request body sent for that step (redact secrets) |
| Response snippet | `proposalData`, `overlay`, `question`, and `cropWindow` (if present) |
| Coordinate deltas | Numeric check results against expected geometry and tolerance |
| Verdict | PASS or FAIL with one-sentence reason |

### Step-by-Step Checks

| Step | Core checks | Pass criteria |
|---|---|---|
| 1 Detect Views | View boxes are valid; exactly one `isPrimary: true`; question matches step | All boxes legal in `0..1000`, one primary view, question text is exact Step 1 question |
| 2 Confirm Envelope | Envelope box is inside primary view and excludes annotation clutter | One envelope box aligns to part boundary and step question is exact |
| 3 Lock L/W | Length and Width values parsed with units; arrows point to correct callouts | `length` and `width` payload valid, overlays labeled `Length (L)` and `Width (W)` |
| 4 Lock Depth | Non-primary view selected for depth; depth callout targeted | `sourceViewId` is non-primary and depth overlay includes view box plus callout arrow |
| 5 Final Summary | Datum and axis mapping are consistent with confirmed L/W/D | `DatumProposal` valid, axis labels are a non-duplicated permutation of L/W/D |

### Coordinate and Geometry Rules

1. Hard bounds: all numeric coordinates must be within `0..1000`.
2. Box validity: `w > 0`, `h > 0`, `x + w <= 1000`, `y + h <= 1000`.
3. Tolerance for visual alignment: +/-10 (boxes, lines, points), +/-15 (arrow target tips).
4. Crop behavior: `cropWindow` may zoom viewport but must not change overlay coordinate frame.

### Retry Loop Assertions

1. Rejected step does not advance `currentState`.
2. Retry request includes `rejectionFeedback` and prior confirmed facts.
3. Retry response changes proposal relative to rejected attempt.
4. State advances only after explicit Yes.

---

## Agent Assignment Summary

| Lane | Designation | Dependencies | Effort |
|---|---|---|---|
| **A** | Project Bootstrap & Foundation | None — start immediately | Small |
| **B** | Genkit AI Flows | Requires A (schemas, genkit config) | Large |
| **C** | API Layer | Requires A (types), partially B (flow imports) | Medium |
| **D** | UI Components | Requires A (types/schemas) | Large |
| **E** | Integration, Polish & Testing | Requires B, C, D complete | Medium |

## Execution Order

```
A ──────────────────► (gate: project compiles)
                      ├──► B (AI Flows)      ──┐
                      ├──► C (API Layer)*     ──┤──► E (Integration & Testing)
                      └──► D (UI Components)  ──┘
```

*Lane C can begin route stubs in parallel with B, but flow imports require B to be complete.
Lanes B, C (stubs), and D can run in parallel after Lane A is done.
Lane E is strictly sequential after B + C + D.

## Critical Path

```
A.4 (Zod schemas) -> B.1 (first flow) -> B.3 (hardest flow, dimension reading) -> C.1 (upload) -> E.2 (mock full run) -> E.3 (live full run)
```

The longest pole is Lane B. Prompt engineering for Steps 3–5 (dimension reading with `thinkingLevel: 'HIGH'`) will likely require the most iteration. Start B early.

## Key Design Decisions

1. **In-memory session only.** No database writes in Phase 1. `OrientationSession` lives in React state inside `WizardContainer`.
2. **SVG viewBox="0 0 1000 1000".** The overlay SVG uses a 1000×1000 viewBox so Gemini's normalized coordinates map directly to SVG units with zero math in the rendering layer.
3. **Thin API routes.** Each `/api/wizard/step-N` route is a pass-through to the Genkit flow. No business logic in the route — all intelligence lives in the flow prompts and Zod validation.
4. **File uploaded once, referenced forever.** The `GoogleAIFileManager` uploads the image once and returns a `fileUri`. That `fileUri` is passed to every subsequent flow call. No re-uploading or base64 encoding per step.
5. **Retry loop is frontend-driven.** The backend is stateless. The frontend holds the session, decides whether to retry (on "No") or advance (on "Yes"), and passes all accumulated confirmed data on every API call.
6. **Gemini 3 Flash only.** No model fallbacks, no model selection UI. The model ID `gemini-3-flash-preview` is hard-coded in every flow definition.
7. **Mock mode first.** Mock mode (deterministic fixtures) ships in Lane A so UI and integration work never blocks on live API calls.
