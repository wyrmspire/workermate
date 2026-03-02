# Phase 1: 5-Step Orientation Wizard

This wizard is the core loop of Phase 1. Without a locked orientation, feature detection in Phase 2 is impossible. 

## The Core Loop

1. **Step i** executes its Genkit flow.
2. The AI returns a structured JSON proposal, an overlay spec, and a question.
3. The UI renders the image with the overlay and presents the question with Yes/No buttons.
4. **Yes:** The UI transitions to **Step i+1**, committing the proposal to session memory.
5. **No:** The user optionally types feedback. The UI transitions back to the start of **Step i**, passing the prior context, the rejected proposal, and the user feedback string back to the AI flow for another attempt.

---

## Step 1: Detect Views

- **Goal:** Identify orthographic bounds. Which block of pixels is the Front, Top, Right, Section A-A, Detail B, Isometric?
- **AI Task:** "Find all views on this technical drawing. Classify them. Choose the primary view (the one with the most overall geometry visible)."
- **Overlay:** Labeled boxes bounding each view cluster.
- **Question:** "Are these the bounding boxes for the views, and is the highlighted one the primary view?"
- **State committed:** `ViewLayout[]` (normalized bounding boxes per view, primary flag).

## Step 2: Confirm Part Outline (Primary View)

- **Goal:** Trace the physical raw material block for the primary view, ignoring dimension lines, leader lines, titles, and title block text.
- **AI Task:** "Using the primary view bounding box found in Step 1, identify the tightest bounding box encompassing ONLY the physical part."
- **Overlay:** A colored bounding box snapped to the part perimeter.
- **Question:** "Does this box accurately capture the overall part envelope in the primary view?"
- **State committed:** `OverlaySpec` containing the envelope box coordinates.

## Step 3: Lock Length + Width (Primary View)

- **Goal:** Parse dimension lines applying only to the overall length and overall width identified in Step 2.
- **AI Task:** "Find the textual dimension callouts holding the maximum Length and maximum Width values in the primary view. Return the values and coordinate locations of the text."
- **Overlay:** Labeled lines/arrows pointing directly to the dimension callouts on the drawing.
- **Question:** "Are the Length and Width axes and values correct for this primary view?"
- **State committed:** `{ length: DimensionProposal, width: DimensionProposal }`.

## Step 4: Lock Depth (Alternate View)

- **Goal:** The primary view is 2D. We need an alternate view to lock the 3rd dimension (Depth/Thickness).
- **AI Task:** "Find the best alternate view (e.g., right side or top) that illustrates the overall depth (thickness) of the part. Find the dimension callout."
- **Overlay:** Box around the alternate view, arrow pointing to the depth dimension callout.
- **Question:** "Is this the correct depth (thickness) dimension?"
- **State committed:** `{ depth: DimensionProposal }`.

## Step 5: Final Summary & Datums

- **Goal:** Consolidate the L/W/D proposals into a final 3D part matrix.
- **AI Task:** "Review L/W/D. Determine the likely primary datum face (e.g., Face A, or the face with the most dimension origin lines)."
- **Overlay:** Cleaned up recap of the primary and alternate view with X (Length), Y (Width), and Z (Depth) axes drawn on top.
- **Question:** "Lock final orientation?"
- **State committed:** `OrientationSession` moves to `ORIENT_LOCKED`.
