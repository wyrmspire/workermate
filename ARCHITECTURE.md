# Architecture — WorkerMate Phase 1

This document defines the Phase 1 Orientation Wizard state machine, the standard overlay coordinate system, and the data contracts between the AI and the UI.

---

## 1. State Machine: Phase 1 Wizard

The application session is purely in-memory (no database required yet). We use a linear state machine that only advances on user approval. A rejection loops back to re-run the current state.

```text
IDLE (Wait for print upload)
  │
  ▼
UPLOADED (File sent to Gemini Files API, fileUri received)
  │
  ▼
ORIENT_STEP_1 (Detect orthographic views)
  │
  ▼
ORIENT_STEP_2 (Confirm part outline envelope in primary view)
  │
  ▼
ORIENT_STEP_3 (Lock Length & Width axes & values)
  │
  ▼
ORIENT_STEP_4 (Lock Depth/Thickness via alternate view)
  │
  ▼
ORIENT_STEP_5 (Final Orientation Summary & Datums)
  │
  ▼
ORIENT_LOCKED (Ready for Phase 2: Features)
```

No 3D modeling, CSG rendering, or feature detection happens anywhere in this flow.

---

## 2. Step Definitions

**1) Detect Views**
- **Action:** Find bounding boxes for all views. Choose the primary view.
- **Overlay:** Boxes around each view block.
- **Question:** "Are these the bounding boxes for the views, and is the highlighted one the primary view?"

**2) Confirm Part Outline**
- **Action:** Trace the tightest bounding box of the physical part inside the primary view (ignoring dimension lines).
- **Overlay:** Outer perimeter box.
- **Question:** "Does this box accurately capture the overall part envelope in the primary view?"

**3) Confirm Length + Width**
- **Action:** Identify the two longest axes in the primary view. Extract their dimension callouts.
- **Overlay:** Labeled lines or arrows pointing to the extracted dimension text.
- **Question:** "Are the Length and Width axes and values correct for this primary view?"

**4) Confirm Depth**
- **Action:** Switch to the best alternate view (e.g., side view or section). Identify the depth/thickness dimension.
- **Overlay:** Box around the alternate view + marked depth dimension.
- **Question:** "Is this the correct depth (thickness) dimension?"

**5) Final Summary**
- **Action:** Summarize L/W/D. Establish the primary datum face logically.
- **Overlay:** Recap of primary view and alternate view with final XYZ mapping.
- **Question:** "Lock final orientation?"

---

## 3. Phase 1 Data Contracts (TypeScript Examples)

### The Session State

```ts
interface OrientationSession {
  fileUri: string;              // Google Files API reference
  currentState: WizardState;
  
  // Accumulated truth:
  confirmedViews?: ViewLayout[];
  confirmedEnvelope?: OverlaySpec;
  confirmedLW?: { length: DimensionProposal; width: DimensionProposal };
  confirmedDepth?: DimensionProposal;
  lockedDatum?: DatumProposal;
}
```

### The Standard Overlay Contract

All UI drawing uses a normalized coordinate space `0.0` to `1000.0`. The origin `(0,0)` is the top-left of the original uploaded image. `(1000, 1000)` is the bottom-right.

```ts
interface OverlaySpec {
  boxes: Array<{ x: number; y: number; w: number; h: number; label?: string; strokeColor?: string }>;
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string; strokeColor?: string }>;
  points: Array<{ x: number; y: number; label?: string; color?: string }>;
  arrows: Array<{ fromX: number; fromY: number; toX: number; toY: number; label?: string; strokeColor?: string }>;
}
```

### Generic Step Result & Component Proposals

```ts
interface OrientationStepResult {
  proposalData: any;          // The structured data proposed for this step
  overlay: OverlaySpec;       // What to draw on the image
  question: string;           // The Yes/No question for the UI
  cropWindow?: {              // Optional: zoom the UI to this area (0-1000 normalized)
    x: number; y: number; w: number; h: number
  };
}

interface ViewLayout {
  id: string;                 // "front", "top", "iso", "section-A"
  label: string;
  isPrimary: boolean;
  boundingBox: { x: number; y: number; w: number; h: number }; // 0-1000
}

interface DimensionProposal {
  value: number;
  unit: 'mm' | 'in';
  sourceViewId: string;
  confidence: number;
}

interface DatumProposal {
  primaryFace: 'top' | 'front' | 'right' | 'left' | 'bottom' | 'back';
  axisLabels: { x: 'L'|'W'|'D', y: 'L'|'W'|'D', z: 'L'|'W'|'D' };
}
```

---

## 4. Non-Goals for Phase 1

- No recognizing pockets, holes, radii, or slots.
- No parsing of threads or geometric tolerances (GD&T).
- No 3D CSG boolean operations.
- No `three-bvh` setup.
