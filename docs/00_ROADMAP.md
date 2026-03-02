# Project Roadmap

This project is built iteratively, deferring complex features and 3D modeling until the core foundational computer-vision reasoning is bulletproof.

## Phase 1: Orientation Wizard (Current Focus)
**Goal:** Extract the overall bounding block of raw material and orient the part in space with 100% accuracy.
- Build the 5-step UI wizard.
- Implement Genkit flows using `gemini-3-flash-preview`.
- Master the normalized `0-1000` overlay coordinate system.
- Build the in-memory session loop (Yes/No validations, retries).
- **Output:** A locked L × W × D bounding box and datum face map. No 3D render required.

## Phase 2: Feature Detection (Future)
**Goal:** Identify subtractive boolean operations (holes, pockets, slots).
- AI analyzes the print again, constrained *strictly* within the envelope approved in Phase 1.
- Identifies feature type, size, depth, and entering face.
- Detailed validation loops per feature.
- **Output:** A complete array of CSG mathematical instructions.

## Phase 3: 3D CSG Rendering (Future)
**Goal:** Render the interpreted part in the browser.
- Feed Phase 2 instructions into `three-bvh-csg`.
- Provide interactive 3D inspection aligned with the 2D print overlays.
- Export capabilities (STL/STEP/GLTF).
