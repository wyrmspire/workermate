# Overlay System Contract

To maintain UI consistency and simplify AI instructions, we enforce a strict, normalized overlay coordinate system across all Phase 1 and Phase 2 steps.

## The Coordinate Space

We do not use raw image pixel sizes inside the AI reasoning because different devices or downsampling rules might alter the payload.

- **Origin (0, 0):** The absolute top-left corner of the original uploaded image file.
- **Bottom-Right (1000, 1000):** The absolute bottom-right corner of the original uploaded image file.

*Every coordinate returned by the AI must be a float between `0.0` and `1000.0`.*

When the React UI renders the SVG/Canvas layout, it scales these percentages to the actual display container bounds: `actualX = (normalizedX / 1000) * viewWidth`.

---

## Allowed Primitives (`OverlaySpec`)

All Genkit flows return an `overlay` object matching this interface. All primitives support an optional label, color overriding, and confidence-driven styling (e.g., low confidence = dashed stroke).

### Box
Used to bound views, enclose parts, or frame specific dimension callouts.
```ts
{ type: 'box', x: 250.5, y: 100.0, w: 50.0, h: 75.0, label: "Primary View" }
```

### Line
Used to draw axes connecting points.
```ts
{ type: 'line', x1: 100.0, y1: 200.0, x2: 300.0, y2: 200.0, label: "Length Axis" }
```

### Point
Used to mark datums or specific corner vertices.
```ts
{ type: 'point', x: 500.0, y: 500.0, label: "Datum A" }
```

### Arrow
Specifically used to point from white space (tail) to a feature/dimension (head).
```ts
{ type: 'arrow', fromX: 100.0, fromY: 100.0, toX: 250.0, toY: 150.0, label: "Ø 13.5" }
```

---

## Standardized Labels

- **Views:** "Primary View", "Top View", "Right View", "Section A-A"
- **Dimensions:** "Length (L)", "Width (W)", "Depth (D)" 
- **Features:** "Feature A", "Feature B"
- **Datums:** "Datum A", "Datum B", "Datum C"

---

## Crop Windows

If a step (e.g., Step 3: Lock L/W) focuses tightly on a primary view, the AI can optionally return a `cropWindow` object in its result. 

```ts
{
  cropWindow: { x: 100.0, y: 100.0, w: 400.0, h: 400.0 }
}
```

The UI should animate the viewport bounds to this crop window to hide clutter. **Crucially**, any `OverlaySpec` objects returned by the AI are *still projected in the global 0-1000 scale*, not relative to the crop window. This guarantees that `(100, 100)` always means the exact same pixel on the print, regardless of zoom level.
