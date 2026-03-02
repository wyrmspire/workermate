# Architecture — WorkerMate

This document defines the system design, data flow, and state machine for the machinist print analyzer. It is the single source of truth for how the pieces fit together.

---

## 1. High-Level Pipeline

```
┌──────────┐    ┌───────────────┐    ┌────────────────┐    ┌────────────────┐    ┌────────────┐
│  Upload  │───▶│ Envelope Pass │───▶│  Feature Pass   │───▶│  Validation    │───▶│  3D Render │
│  (image) │    │  (AI + user)  │    │  (AI + user)    │    │  Loop (user)   │    │  (CSG)     │
└──────────┘    └───────────────┘    └────────────────┘    └────────────────┘    └────────────┘
```

Each stage produces structured output that feeds into the next. The user has veto power at every AI stage.

---

## 2. Application State Machine

The app progresses through a linear state machine. Backward transitions only happen on user rejection.

```
IDLE
  │  (user uploads image)
  ▼
ANALYZING_ENVELOPE
  │  (AI returns envelope proposal)
  ▼
CONFIRMING_ENVELOPE  ──── reject ────▶ ANALYZING_ENVELOPE (with feedback)
  │  (user approves all)
  ▼
ANALYZING_FEATURES
  │  (AI returns feature list)
  ▼
CONFIRMING_FEATURES  ──── reject ────▶ ANALYZING_FEATURES (with feedback + partial approvals)
  │  (user approves all)
  ▼
GENERATING_3D
  │  (CSG pipeline completes)
  ▼
VIEWING_MODEL
```

### State Persistence
- State lives in React client state (useState / useReducer).
- No database needed for V1. The entire analysis session is ephemeral.
- The uploaded image and AI responses are kept in memory for the duration of the session.

---

## 3. Data Contracts

### 3.1 Envelope Analysis Output

The AI returns this from `analyzeEnvelopeFlow`. The frontend uses it to draw overlay boxes.

```ts
interface EnvelopeResult {
  length: Dimension;
  width:  Dimension;
  height: Dimension;
  orientation: 'landscape' | 'portrait';
  primaryDatumFace: Face;
  views: ViewIdentification[];
}

interface Dimension {
  value: number;         // e.g. 120.0
  unit: 'mm' | 'in';
  sourceView: string;    // which view the AI read this from, e.g. "top"
  confidence: number;    // 0-1
  overlay: OverlayBox;   // where to draw on the image
}

interface ViewIdentification {
  name: string;          // "Front View", "Top View", "Section B-B", etc.
  type: 'front' | 'top' | 'right' | 'left' | 'bottom' | 'section' | 'detail' | 'isometric';
  boundingBox: OverlayBox;
}

interface OverlayBox {
  x: number;       // px from left of image
  y: number;       // px from top of image
  w: number;       // px width
  h: number;       // px height
  rotation?: number; // degrees
  label?: string;
}

type Face = 'top' | 'front' | 'right' | 'left' | 'bottom' | 'back';
```

### 3.2 Feature Analysis Output

The AI returns this from `analyzeFeaturesFlow`. The frontend uses it for the feature checklist and overlay arrows.

```ts
interface FeatureResult {
  features: Feature[];
}

interface Feature {
  id: string;                 // "A", "B", "C", etc.
  type: FeatureType;
  label: string;              // Human-readable, e.g. "Ø8.0 THRU hole"
  face: Face;                 // Which face the feature enters from
  dimensions: FeatureDim[];   // All relevant dimensions
  overlay: OverlayArrow;      // Arrow pointing to feature on the print
  approved: boolean;          // Starts false, user sets to true
}

type FeatureType =
  | 'thru_hole'
  | 'blind_hole'
  | 'counterbore'
  | 'countersink'
  | 'thread'
  | 'outer_pocket'
  | 'inner_pocket'
  | 'irregular_pocket'
  | 'slot'
  | 'chamfer'
  | 'fillet'
  | 'step'
  | 'boss'
  | 'radius';

interface FeatureDim {
  name: string;        // "diameter", "depth", "width", etc.
  value: number;
  unit: 'mm' | 'in';
  tolerance?: string;  // e.g. "±0.1"
}

interface OverlayArrow {
  fromX: number;       // arrow tail (in label area)
  fromY: number;
  toX: number;         // arrow head (pointing at feature)
  toY: number;
  label: string;       // e.g. "A"
}
```

### 3.3 CSG Build Instruction

After all features are approved, the lib layer converts `FeatureResult` into CSG operations.

```ts
interface CSGInstruction {
  stock: { length: number; width: number; height: number; };
  operations: CSGOperation[];
}

interface CSGOperation {
  featureId: string;
  type: 'subtract';           // Almost always subtract for machining
  tool: 'cylinder' | 'box' | 'chamfer_tool' | 'fillet_tool';
  position: { x: number; y: number; z: number; };
  rotation: { x: number; y: number; z: number; };  // Euler angles
  dimensions: Record<string, number>;               // tool-specific dims
}
```

---

## 4. AI Reasoning Strategy

### Why multi-pass instead of one-shot?

A single prompt asking "analyze this entire print and build a 3D model" will fail because:
1. **Dimension ambiguity** — The same measurement (e.g., 120.0mm) might appear on multiple views. The AI must reason about which view is the most reliable source for Length vs Width vs Height by considering orientation.
2. **Feature density** — Cluttered prints with many callouts overwhelm a single prompt. Breaking into envelope → features keeps each prompt focused.
3. **User feedback** — Humans catch errors the AI misses. The iterative loop means wrong answers get corrected early, not compounded.

### Envelope Pass Reasoning Chain
1. Identify all views on the print (top, front, right, isometric, sections, details).
2. For each view, identify which global dimension (L, W, H) each measurement corresponds to.
3. Cross-reference: if "120.0" appears in the top view as horizontal and in the front view as horizontal, they are likely the same dimension (Length).
4. Pick the orientation (which axis is L, W, H) that is most internally consistent.
5. Identify the primary datum face.

### Feature Pass Reasoning Chain
1. With the envelope locked, scan each view for features that cut into the stock.
2. For each feature, determine: what type it is, which face it enters from, its dimensions.
3. The AI may zoom/crop views to reduce clutter when identifying fine details.
4. Features are labeled A, B, C, … and linked to the specific callout text on the print.

---

## 5. Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ ChatInterface│   │ PrintViewer  │   │ ValidationPanel│  │
│  │              │   │ (overlays)   │   │ (checkboxes)   │  │
│  └──────┬───────┘   └──────▲───────┘   └───────┬────────┘  │
│         │                  │                   │            │
│         │         ┌────────┴────────┐          │            │
│         └────────▶│ Session State   │◀─────────┘            │
│                   │ (useReducer)    │                        │
│                   └────────┬────────┘                        │
│                            │                                │
│                   ┌────────▼────────┐                        │
│                   │ API Route       │                        │
│                   │ /api/genkit     │                        │
│                   └────────┬────────┘                        │
│                            │                                │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │              Genkit Flows (server)                      │ │
│  │  analyzeEnvelopeFlow  │  analyzeFeaturesFlow           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────┐                                          │
│  │ ThreeViewer   │ ◀── CSG Pipeline (src/lib/)              │
│  │ (3D canvas)   │                                          │
│  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Deployment

- **Local dev**: `npm run dev` — standard Next.js dev server.
- **Genkit dev UI**: `genkit start -- npm run dev` — enables Genkit's flow inspection UI.
- **Production**: Deploy to Google Cloud Run via the Cloud Run MCP, or Vercel.
- **Environment**: Only `GEMINI_API_KEY` is required. See `.env.example`.
