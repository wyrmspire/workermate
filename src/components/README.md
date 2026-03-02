# UI Components — `src/components/`

This directory contains all React components for the WorkerMate interface. Components receive data via props — they never call Genkit flows directly.

---

## File Structure (Target)

```
src/components/
├── ChatInterface.tsx        ← Image upload + conversation thread
├── PrintViewer.tsx          ← 2D print display with overlays
├── ValidationPanel.tsx      ← Approval checkboxes for AI findings
├── ThreeViewer.tsx          ← 3D model canvas
├── OverlayLayer.tsx         ← SVG/Canvas overlay engine (boxes + arrows)
├── FeatureCard.tsx          ← Individual feature detail card
└── README.md                ← You are here
```

---

## Component Specifications

### 1. `ChatInterface.tsx`

**Purpose:** The primary interaction point. User uploads a print image, sees AI "thinking" status, and can type correction feedback.

**Props:**
```ts
{
  onImageUpload: (file: File) => void;
  onFeedbackSubmit: (text: string) => void;
  messages: ChatMessage[];     // AI responses + user messages
  isAnalyzing: boolean;        // Show spinner/thinking indicator
}
```

**Behavior:**
- Accepts image files via drag-and-drop or file picker.
- Displays a scrolling message thread showing AI analysis steps.
- Shows a text input for user feedback when items are rejected.
- Does NOT call API routes — it fires callbacks that the parent page handles.

---

### 2. `PrintViewer.tsx`

**Purpose:** Displays the uploaded 2D machinist print with interactive overlays drawn on top.

**Props:**
```ts
{
  imageSrc: string;                      // Object URL or base64 of the uploaded print
  overlayBoxes: OverlayBox[];            // From EnvelopeResult
  overlayArrows: OverlayArrow[];         // From FeatureResult
  highlightedFeatureId: string | null;   // Feature currently hovered in the checklist
  onFeatureClick: (id: string) => void;  // User clicks an overlay
}
```

**Behavior:**
- Pan and zoom via mouse drag / scroll wheel (critical for cluttered prints).
- Overlays render on an absolute-positioned SVG or Canvas layer on top of the image.
- Opaque colored boxes for envelope dimensions (L=red, W=green, H=blue).
- Arrows with letter labels (A, B, C…) for identified features.
- Hover on an overlay highlights the corresponding item in the ValidationPanel.
- The AI may suggest cropped/zoomed regions — the viewer should support smooth animated zoom transitions.

---

### 3. `ValidationPanel.tsx`

**Purpose:** Lists the AI's findings as a checklist. The user approves or rejects each item.

**Props:**
```ts
{
  stage: 'envelope' | 'features';
  items: ValidationItem[];          // Dimensions or features
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onSubmit: () => void;             // "Confirm and proceed"
  feedbackText: string;
  onFeedbackChange: (text: string) => void;
}

interface ValidationItem {
  id: string;
  label: string;           // e.g. "Length: 120.0mm (from Top View)"
  confidence: number;       // 0-1, controls visual styling
  approved: boolean | null; // null = not yet decided
}
```

**Behavior:**
- Each item has a ✅ (approve) and ❌ (reject) button.
- Low-confidence items (< 0.7) are visually flagged (yellow border, warning icon).
- A text area appears for feedback when any item is rejected.
- "Confirm and Proceed" button is only enabled when all items have a decision.
- Hovering an item highlights the corresponding overlay in PrintViewer.

---

### 4. `ThreeViewer.tsx`

**Purpose:** Renders the final 3D model after all features are approved.

**Props:**
```ts
{
  mesh: THREE.Mesh | null;  // The CSG result from src/lib/
  isGenerating: boolean;
}
```

**Behavior:**
- Uses `@react-three/fiber` and `@react-three/drei` for orbit controls, lighting, and grid.
- Shows a loading spinner during CSG generation.
- Orbit, zoom, and pan controls for inspecting the model.
- Optional: animate each boolean subtraction step-by-step.

---

### 5. `OverlayLayer.tsx`

**Purpose:** The rendering engine for boxes and arrows on top of the print image. Used internally by `PrintViewer`.

**Props:**
```ts
{
  width: number;              // Image display width
  height: number;             // Image display height
  boxes: OverlayBox[];
  arrows: OverlayArrow[];
  highlightedId: string | null;
}
```

**Behavior:**
- Renders as an SVG element positioned absolutely over the print image.
- Boxes are semi-transparent rectangles with labels.
- Arrows are SVG line elements with arrowhead markers and letter labels.
- Highlighted items pulse or glow.

---

### 6. `FeatureCard.tsx`

**Purpose:** Expandable detail view for a single identified feature.

**Props:**
```ts
{
  feature: Feature;           // From FeatureResult
  isHighlighted: boolean;
  onApprove: () => void;
  onReject: () => void;
}
```

**Behavior:**
- Shows feature type icon, label, face, and all dimensions.
- Expands on click to show full dimension table with tolerances.
- Approve/reject buttons integrated.
