# Phase 2: Feature Detection (Preview)

> **Status:** NOT IMPLEMENTED IN PHASE 1. This document serves to explain how the data pipeline will continue *after* `ORIENT_LOCKED` is reached. Do not begin coding this until Phase 1 is stable.

## Post-Orientation Reality

In Phase 1, we determine that a block of Aluminum is `120.0 (L) × 80.0 (W) × 35.0 (D)`. We also confirm that Face A (Top) is where the Length and Width are drawn. 

Phase 2 takes this locked bounding box and subtracts material from it.

## The Machining Subtraction Contract

Every single feature on a machinist print acts as a subtractive boolean operation (CSG). We model all features as variations of pockets, holes, or boundary conditions.

### First Class Open Edges ("Outer Pockets")

A common stumbling block in geometric parsing is the "open edge pocket" or step. A machinist print might dimension a cut that lives on the exterior edge of the part. Phase 2 must treat an "open pocket" as explicitly distinct from a closed "inner pocket," handling the over-cutting required to cleanly remove tool radius from the boundary.

### Slots as Pockets
Slots (whether oval-ended or square) are simply pockets defined by tool diameter (`width`) and travel (`length`). They can be `open` (cutting through a wall) or `closed` (internal). Phase 2 categorizes slots beneath the pocket abstraction tree.

## The Phase 2 Validation Loop

Just like the Phase 1 Orientation Wizard, Phase 2 features are never processed in single-shot.

The flow will identify `Feature A`, render an overlay arrow, highlight the text string (e.g. `2x Ø8.0 THRU ALL`), propose the CSG tool definition (e.g. `cylinder`, `r=4`, `depth=100`), and ask the user to approve. Rejections trigger the retry loop.
