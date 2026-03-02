# WorkerMate — Machinist Print Analyzer

Upload a machinist print image, guide the AI through a 5-step Orientation Wizard to establish the dimensions and datums, and eventually build a CSG 3D model.

---

## Current Milestone: Phase 1 (Orientation Wizard)

Right now, the project is strictly focused on **Phase 1: The 5-Step Orientation Wizard**. 
- We only determine Length, Width, Depth (Thickness), and datums.
- **NO FEATURES are analyzed.** No pockets, no holes, no CSG generation.
- The system must not attempt “print → full 3D” in one shot. Features are deferred to Phase 2.

## The Problem (Why a 5-step wizard?)

Reading a machinist print is highly ambiguous. The exact same numerical value (e.g., 120.0) can appear in multiple views, representing different axes depending on the view. Trying to deduce the entire part in one prompt leads to compounded hallucination errors. 

By breaking the orientation into 5 microscopic steps with human confirmation at every stage, we lock in known facts before proceeding. The human answers "Yes" or "No". A "No" immediately retries that specific step with user feedback.

---

## Tech Stack (Docs Only)

- **AI Orchestration**: Genkit (handles flows, Zod schemas, structured outputs, user feedback looping).
- **Vision Model**: **Gemini 3 Flash ONLY `gemini-3-flash-preview`**.
- **Image Handling**: Google AI Files API (upload once, pass `fileUri` to all subsequent steps).
- **UI**: Overlay-driven validation. React renders boxes, arrows, and lines over the image based on Genkit's normalized 0-1000 coordinate output.

---

## The 5-Step Orientation Wizard

1. **Detect Views**: Map out the bounding boxes of all orthographic/isometric views.
2. **Confirm Envelope**: Outline the overall bounding box of the part in the primary view.
3. **Lock L/W**: Confirm the Length and Width axes and their specific values.
4. **Lock Depth**: Find the best alternate view to confirm Depth (thickness).
5. **Final Summary**: Map L/W/D to the 3D space, establish the primary datum face, and lock orientation.

---

## Project Structure

```text
workermate/
├── docs/                      ← Deep-dive architecture and specs
│   ├── 00_ROADMAP.md
│   ├── 01_ORIENTATION_WIZARD.md
│   ├── 02_OVERLAYS.md
│   ├── 03_MODEL_CONFIG.md
│   └── 04_FEATURES_PHASE_2_PREVIEW.md
├── agents.md                  ← Hard rules for AI coding agents
├── ARCHITECTURE.md            ← Phase 1 Data contracts and State Machine
├── README.md                  ← You are here
│
├── src/
│   ├── agent/                 ← Genkit flows (5 steps)
│   ├── app/                   ← API routes and Next.js shell
│   ├── components/            ← UI (ImageOverlay, YesNoPanel, StepHistory)
│   └── lib/                   ← (Future) CSG Geometry pipeline
```
