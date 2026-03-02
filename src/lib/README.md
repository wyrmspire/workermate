# CSG Pipeline — `src/lib/`

This directory contains the 3D geometry processing layer. It takes confirmed feature data from the AI and produces a renderable Three.js mesh. No React, no Genkit — pure Three.js and math.

---

## File Structure (Target)

```
src/lib/
├── buildCSG.ts              ← Main pipeline: CSGInstruction → THREE.Mesh
├── createCuttingTool.ts     ← Factory for tool geometries (cylinder, box, chamfer, etc.)
├── instructionBuilder.ts    ← Converts FeatureResult → CSGInstruction
├── types.ts                 ← CSGInstruction, CSGOperation interfaces
└── README.md                ← You are here
```

---

## Pipeline Overview

```
FeatureResult (from AI)
       │
       ▼
instructionBuilder.ts   →  CSGInstruction (stock + operations list)
       │
       ▼
buildCSG.ts             →  THREE.Mesh (final solid)
       │
       ├── For each operation:
       │     createCuttingTool.ts → THREE.Mesh (the cutting shape)
       │     three-bvh-csg       → subtract(stock, tool)
       │
       ▼
ThreeViewer.tsx renders the mesh
```

---

## Module Specifications

### `instructionBuilder.ts`

**Purpose:** Translates the human-readable `FeatureResult` from the AI into machine-ready `CSGInstruction` with absolute coordinates.

```ts
function buildInstructions(
  envelope: EnvelopeResult,
  features: Feature[]
): CSGInstruction
```

**Key logic:**
1. Create the stock block from `envelope.length`, `envelope.width`, `envelope.height`.
2. For each feature, map its `face` and `dimensions` to a 3D position and rotation relative to the stock origin.
   - A hole entering from `top` → cylinder positioned at (x, y, stock.height), rotated to point downward.
   - A pocket on `front` → box positioned at (x, 0, z), sized to the pocket dimensions.
3. Handle coordinate system: the stock origin is at center-bottom (0, 0, 0), with Y-up.

---

### `createCuttingTool.ts`

**Purpose:** Factory function that creates a Three.js mesh for each type of cutting operation.

```ts
function createCuttingTool(op: CSGOperation): THREE.Mesh
```

| Tool Type | Three.js Geometry | Parameters |
|---|---|---|
| `cylinder` | `CylinderGeometry(r, r, depth, 32)` | `diameter`, `depth` |
| `box` | `BoxGeometry(w, h, d)` | `width`, `height`, `depth` |
| `chamfer_tool` | Custom: truncated cone or angled box | `angle`, `depth` |
| `fillet_tool` | Custom: quarter-torus subtraction | `radius`, `length` |

**Important:** All tools must be slightly oversized (add 0.01mm) to avoid Z-fighting and ensure clean boolean cuts.

---

### `buildCSG.ts`

**Purpose:** The main CSG execution pipeline. Takes the stock and iteratively subtracts all cutting tools.

```ts
import { Evaluator, Operation } from 'three-bvh-csg';

function buildCSG(instruction: CSGInstruction): THREE.Mesh
```

**Algorithm:**
1. Create a `THREE.Mesh` from `BoxGeometry(L, W, H)` for the stock.
2. For each operation in order:
   a. Create the cutting tool via `createCuttingTool()`.
   b. Position and rotate it according to `operation.position` and `operation.rotation`.
   c. Use `three-bvh-csg` `Evaluator` to subtract: `evaluator.evaluate(stock, tool, Operation.SUBTRACTION)`.
   d. Replace `stock` with the result.
3. Return the final mesh.

**Error handling:**
- If a subtraction produces a non-manifold mesh, log a warning and try `manifold-3d` as fallback.
- If a tool completely misses the stock (no intersection), skip it and log a warning.

---

## Dependency: `three-bvh-csg`

- **GitHub:** https://github.com/gkjohnson/three-bvh-csg
- **Why:** Fastest Three.js-native CSG library. Uses BVH acceleration, handles normals and UVs properly.
- **Known limitation:** Can produce T-vertices on complex intersections. Our primitives (boxes, cylinders) are simple enough that this rarely occurs.

## Fallback: `manifold-3d`

- **GitHub:** https://github.com/elalish/manifold
- **When:** Only if `three-bvh-csg` produces visible artifacts (open edges, inverted normals).
- **How:** Convert `THREE.BufferGeometry` → Manifold mesh → boolean → convert back.
- **Example:** https://manifoldcad.org/three
