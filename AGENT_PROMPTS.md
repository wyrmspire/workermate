# 5 Agent Prompts — Parallel Execution

These prompts are designed to be given to 5 separate AI coding agents simultaneously. Each agent works on a distinct lane. Agent 1 (Lane A) must finish first — agents 2–4 can begin in parallel after A is done. Agent 5 waits for all others.

---

## Agent 1: Project Bootstrap & Foundation (Lane A)

```
You are working on the WorkerMate project at `c:\workermate`.

READ THESE FILES FIRST (in this order):
1. `board.md` — find Lane A. That is YOUR lane.
2. `ARCHITECTURE.md` — Section 3 has the data contracts you must implement as Zod schemas.
3. `docs/03_MODEL_CONFIG.md` — model policy and config knobs.
4. `agents.md` — hard rules.

YOUR JOB: Complete every task in Lane A (A.1 through A.8) of `board.md`.

BEFORE you start coding, open `board.md` and change task A.1 status from `⬜ TODO` to `🔨 IN PROGRESS`.
After you finish each task, change its status to `✅ DONE`.

SPECIFIC INSTRUCTIONS:

A.1: Run `npx create-next-app@latest . --typescript --app --src-dir --tailwind --eslint` in the repo root.
     The repo already has README.md, ARCHITECTURE.md, agents.md, docs/, etc. — do NOT let the scaffold overwrite them.
     If the scaffold prompts to overwrite, decline or restore the originals after.
     Verify `npm run dev` starts cleanly at localhost:3000.

A.2: Run `npm install genkit @genkit-ai/google-genai @google/generative-ai zod`.
     `@google/generative-ai` is needed for GoogleAIFileManager (Files API upload).
     Do NOT install @genkit-ai/firebase or any other provider.

A.3: Create `src/agent/genkit.config.ts`:
     - `import { genkit } from 'genkit';`
     - `import { googleGenAI } from '@genkit-ai/google-genai';`
     - `const ai = genkit({ plugins: [googleGenAI()] });`
     - `export { ai };`
     Do NOT hard-code any API key. Do NOT reference any model here — model is specified per-flow.

A.4: Create `src/lib/schemas.ts`. Translate EVERY interface from ARCHITECTURE.md Section 3 into Zod schemas.
     Critical schemas: OverlaySpecSchema, ViewLayoutSchema, DimensionProposalSchema, DatumProposalSchema,
     OrientationStepResultSchema, WizardStateSchema. Export both schemas and `z.infer<>` types.
     All overlay coordinates must be `z.number().min(0).max(1000)`.

A.5: Create `src/lib/types.ts`. Define `OrientationSession` and per-step input types.
     Import Zod-inferred types from schemas.ts — do NOT duplicate type definitions.

A.6: Create `src/lib/mocks.ts` with one deterministic `OrientationStepResult` fixture per step (5 total).
     Use realistic overlay coordinates. These fixtures must pass Zod validation.

A.7: Add `NEXT_PUBLIC_MOCK_MODE=true` to `.env.example`. Create `src/lib/mode.ts` exporting `isMockMode()`.

A.8: Run `npm run build` and `npm run dev`. Fix ALL TypeScript errors. The project must compile cleanly.
     This is the GATE — no other agent can proceed until this passes.

AFTER completing all tasks, update board.md with all statuses set to ✅ DONE.
Commit with message: "feat(A): project bootstrap — schemas, types, mocks, genkit config"
Push to origin.
```

---

## Agent 2: Genkit AI Flows (Lane B)

```
You are working on the WorkerMate project at `c:\workermate`.

READ THESE FILES FIRST (in this order):
1. `board.md` — find Lane B. That is YOUR lane. Verify Lane A is ✅ DONE before starting.
2. `src/lib/schemas.ts` — these are the Zod schemas your flows must use.
3. `src/lib/types.ts` — these are the TypeScript types for flow inputs.
4. `src/agent/genkit.config.ts` — this is the `ai` instance you import.
5. `docs/01_ORIENTATION_WIZARD.md` — the 5-step wizard reasoning strategy.
6. `docs/03_MODEL_CONFIG.md` — model config (thinkingLevel, mediaResolution per step).
7. `docs/02_OVERLAYS.md` — the 0–1000 coordinate system your overlays must use.
8. `agents.md` — hard rules.

YOUR JOB: Complete every task in Lane B (B.1 through B.6) of `board.md`.

BEFORE you start coding, open `board.md` and change task B.1 status from `⬜ TODO` to `🔨 IN PROGRESS`.
After you finish each task, change its status to `✅ DONE`.

CRITICAL RULES:
- The ONLY model ID permitted anywhere is `gemini-3-flash-preview`. No exceptions.
- Gemini 3 uses `thinkingLevel` (enum: MINIMAL, LOW, MEDIUM, HIGH), NOT `thinkingBudget`.
- Steps 1–2 use `thinkingLevel: 'MINIMAL'`, `mediaResolution: 'medium'`.
- Steps 3–5 use `thinkingLevel: 'HIGH'`, `mediaResolution: 'high'`.
- Every flow uses `ai.defineFlow()` with explicit Zod `inputSchema` and `outputSchema`.
- Every flow output MUST include `proposalData`, `overlay` (OverlaySpec), and `question` (string).
- Every flow MUST handle optional `rejectionFeedback` by appending it to the prompt.
- Image input: pass `fileUri` as `{ media: { url: fileUri } }` in the prompt array.
- Use `output: { schema: OutputSchema }` to force structured JSON output.

FOR EACH FLOW (B.1–B.5):
- Create the file at the path specified in board.md.
- Import `ai` from `../agent/genkit.config`.
- Import schemas from `../lib/schemas`.
- Write the prompt as a template string. Include the 0–1000 coordinate rules in the system message.
- The `question` field is a FIXED string per step (see board.md task notes for exact text).

B.6: Create `src/agent/index.ts` that re-exports all 5 flows and the `ai` instance.

AFTER completing all tasks, update board.md with all B statuses set to ✅ DONE.
Commit with message: "feat(B): implement all 5 orientation wizard Genkit flows"
Push to origin.
```

---

## Agent 3: API Layer (Lane C)

```
You are working on the WorkerMate project at `c:\workermate`.

READ THESE FILES FIRST (in this order):
1. `board.md` — find Lane C. That is YOUR lane. Verify Lane A is ✅ DONE before starting.
2. `src/lib/schemas.ts` — Zod schemas for request/response validation.
3. `src/lib/types.ts` — TypeScript types.
4. `src/lib/mocks.ts` — mock fixtures you return when mock mode is active.
5. `src/lib/mode.ts` — the `isMockMode()` function.
6. `src/app/README.md` — route structure overview.
7. `agents.md` — hard rules.

YOUR JOB: Complete every task in Lane C (C.1 through C.5) of `board.md`.

BEFORE you start coding, open `board.md` and change task C.1 status from `⬜ TODO` to `🔨 IN PROGRESS`.
After you finish each task, change its status to `✅ DONE`.

IMPORTANT CONTEXT:
- Lane B (Genkit flows) may not be finished yet. You can still build route stubs.
- Every route must check `isMockMode()`. If true, return the matching fixture from `src/lib/mocks.ts`.
  If false, import and call the actual Genkit flow from `src/agent/index.ts`.
- If the flow imports fail because Lane B isn't done yet, use dynamic `import()` or a
  try/catch with a TODO comment. The routes must compile regardless of Lane B status.

C.1 (Upload Route):
- Create `src/app/api/upload/route.ts`.
- Accept multipart FormData. Extract the file.
- If mock mode: return `{ fileUri: "mock://test-print.png", fileName: "test-print.png", mimeType: "image/png" }`.
- If live mode: Use `GoogleAIFileManager` from `@google/generative-ai`:
  ```
  import { GoogleAIFileManager } from '@google/generative-ai/server';
  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
  ```
  Write the uploaded file to a temp path, call `fileManager.uploadFile(tempPath, { mimeType, displayName })`,
  return the `fileUri` from the response.
- Validate file type (png, jpg, jpeg, tiff, pdf). Max 20MB. Return 400 on invalid.

C.2–C.5 (Wizard Step Routes):
- Create one route file per step at `src/app/api/wizard/step-N/route.ts`.
- Each route: parse JSON body, validate required fields (return 400 if missing),
  check mock mode, call flow or return fixture, wrap in try/catch (return 500 with error details).
- Content-Type: application/json on all responses.

AFTER completing all tasks, update board.md with all C statuses set to ✅ DONE.
Commit with message: "feat(C): API routes — upload + 5 wizard step endpoints with mock/live switch"
Push to origin.
```

---

## Agent 4: UI Components (Lane D)

```
You are working on the WorkerMate project at `c:\workermate`.

READ THESE FILES FIRST (in this order):
1. `board.md` — find Lane D. That is YOUR lane. Verify Lane A is ✅ DONE before starting.
2. `src/lib/schemas.ts` — Zod schemas (you need the inferred types for props).
3. `src/lib/types.ts` — OrientationSession type for state management.
4. `src/components/README.md` — component catalog and specs.
5. `docs/02_OVERLAYS.md` — the 0–1000 coordinate system for SVG rendering.
6. `docs/01_ORIENTATION_WIZARD.md` — the 5-step wizard flow your UI must implement.
7. `agents.md` — hard rules.

YOUR JOB: Complete every task in Lane D (D.1 through D.6) of `board.md`.

BEFORE you start coding, open `board.md` and change task D.1 status from `⬜ TODO` to `🔨 IN PROGRESS`.
After you finish each task, change its status to `✅ DONE`.

CRITICAL UI RULES:
- All overlay rendering uses an SVG with `viewBox="0 0 1000 1000"` positioned absolutely over the image.
  This means Gemini's raw 0–1000 coordinates map DIRECTLY to SVG units. Zero math in the render layer.
- The UI must work in mock mode without any live API. It calls `/api/wizard/step-N` and `/api/upload`
  and the API layer handles mock vs live. The UI does not know or care which mode is active.
- Use Tailwind CSS for all styling. No CSS modules, no styled-components.
- Components receive data via props. No direct API calls inside presentational components.
  Only `WizardContainer.tsx` makes fetch calls.

D.1 (ImageOverlay.tsx):
- Render image in a container div with `position: relative`.
- Absolutely position an SVG on top with `viewBox="0 0 1000 1000"` and `preserveAspectRatio="none"`.
- Render boxes as <rect>, lines as <line>, points as <circle r="5">, arrows as <line> with marker-end.
- Add <text> labels near each primitive.
- If `cropWindow` is provided, use CSS transform to zoom the container to that region.
- SVG must have `pointer-events: none`.

D.2 (YesNoPanel.tsx):
- Question text displayed prominently.
- Green "Yes ✓" button and Red "No ✗" button.
- On "No" click: expand a textarea for feedback + "Submit Feedback" button.
- Both buttons disabled + spinner shown when `isLoading` is true.

D.3 (StepHistory.tsx):
- Horizontal breadcrumb showing Steps 1–5.
- Completed steps: green checkmark + one-line summary from session data.
- Current step: highlighted/pulsing.
- Future steps: grayed out.

D.4 (WizardContainer.tsx) — THIS IS THE MOST IMPORTANT COMPONENT:
- Manages `OrientationSession` state via `useReducer` or `useState`.
- IDLE state shows the upload dropzone (D.6).
- On upload success: stores `fileUri` + `imageSrc` (blob URL), auto-calls `/api/wizard/step-1`.
- On step response: stores overlay + question, renders ImageOverlay + YesNoPanel.
- On "Yes": commits proposalData to session, advances state, calls next step API.
- On "No": calls SAME step API again with `rejectionFeedback`. State does NOT advance.
- At ORIENT_LOCKED: shows success summary with L/W/D values.
- Keep `imageSrc` (local blob URL for display) separate from `fileUri` (Google Files API ref).

D.5 (page.tsx):
- Replace default Next.js page with `<WizardContainer />`.
- Title: "WorkerMate — Print Analyzer". Centered, max-w-6xl.

D.6 (Upload dropzone):
- Styled drag-and-drop zone inside WizardContainer's IDLE state.
- `<input type="file" accept="image/*,.pdf">`.
- On file select: create blob URL, POST FormData to `/api/upload`, show spinner, store fileUri.

AFTER completing all tasks, update board.md with all D statuses set to ✅ DONE.
Commit with message: "feat(D): UI components — ImageOverlay, YesNoPanel, StepHistory, WizardContainer"
Push to origin.
```

---

## Agent 5: Integration & Testing (Lane E)

```
You are working on the WorkerMate project at `c:\workermate`.

READ THESE FILES FIRST (in this order):
1. `board.md` — find Lane E. That is YOUR lane. Verify Lanes A, B, C, D are ALL ✅ DONE before starting.
2. `ARCHITECTURE.md` — state machine and data contracts.
3. `docs/01_ORIENTATION_WIZARD.md` — expected wizard behavior.
4. `docs/02_OVERLAYS.md` — coordinate validation rules.
5. `agents.md` — hard rules.

YOUR JOB: Complete every task in Lane E (E.1 through E.8) of `board.md`.

BEFORE you start, open `board.md` and change task E.1 status from `⬜ TODO` to `🔨 IN PROGRESS`.
After you finish each task, change its status to `✅ DONE`.

THIS LANE IS STRICTLY SEQUENTIAL. Do each task in order.

E.1 (Test Assets):
- Create `docs/TEST_ASSETS.md` listing at least 3 test drawings with expected L/W/D values.
- If test images exist in the repo, reference them. If not, note that they need to be uploaded manually.

E.2 (Mock-mode Smoke Run):
- Ensure `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local`.
- Run `npm run dev`.
- Open the browser. Upload any image (mock mode ignores actual content).
- Click through all 5 steps: Yes on each one.
- Verify: overlays render correctly on the SVG, questions match the exact text from board.md,
  state advances only on Yes, and ORIENT_LOCKED summary appears at the end.
- Take screenshots as evidence.
- ALSO test the retry loop: at Step 3, click "No" with feedback "wrong dimensions."
  Verify the step re-runs without advancing state. Then click "Yes" and verify advancement.

E.3 (Live-mode Run):
- Set `NEXT_PUBLIC_MOCK_MODE=false` (or remove the variable).
- Ensure `GEMINI_API_KEY` is set in `.env.local`.
- Run the full 5-step wizard on a real machinist print image.
- Verify Gemini returns structured JSON matching Zod schemas.
- Verify overlays visually align with the print's actual views and dimensions.
- Test retry loop on at least one step.

E.4 (Coordinate Validation):
- For every step's API response in both mock and live runs:
  - Verify all coordinates are within 0..1000.
  - Verify box validity: w > 0, h > 0, x + w <= 1000, y + h <= 1000.
  - Verify overlay-to-drawing alignment tolerance: +/-10 for boxes/lines, +/-15 for arrows.

E.5 (Retry Loop Tests):
- Force rejections on Steps 1, 3, and 4 with specific feedback.
- Verify: rejectionFeedback is included in the next API request, same step re-runs,
  proposal changes in response to feedback, state advances only after Yes.

E.6 (Schema Robustness):
- Send malformed JSON to each API route. Verify 400/500 responses with structured error messages.
- Verify UI does not crash on any error — shows a recoverable error message.

E.7 (QA Checks):
- Test file type/size rejection on upload.
- Test loading states (spinner visibility during API calls).
- Test "Start Over" reset behavior (if implemented) or page refresh reset.
- Test responsive layout on desktop and tablet widths.
- Verify overlay alignment after window resize.

E.8 (Release Gate):
- Create `docs/RELEASE_EVIDENCE.md` with pass/fail results for E.1–E.7.
- Include screenshots, request/response snippets, and coordinate delta checks.
- Phase 1 is release-ready ONLY when every check passes in both mock and live modes.

AFTER completing all tasks, update board.md with all E statuses set to ✅ DONE.
Commit with message: "test(E): integration testing complete — mock and live verified"
Push to origin.
```
