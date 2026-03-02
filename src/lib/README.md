# 3D Library Integration (`src/lib/`)

This folder contains utilities for processing 3D geometry from the AI's 2D reasoning output.

## Core Dependency: `three-bvh-csg`
As per project requirements, we use `three-bvh-csg` for Constructive Solid Geometry (boolean operations) instead of heavily typed CAD kernels (unless we encounter persistent non-manifold geometry).
It provides a great mix of speed, decent support for normals/UVs, and is widely adopted in the Three.js ecosystem.

### Workflow:
1. **Stock Generation**: Based on the primary dimensions (L, W, H) validated by the user, we build a base `THREE.BoxGeometry`.
2. **Feature Iteration**: For every confirmed feature (e.g., hole, pocket):
    - Create a cutting tool mesh (e.g., `THREE.CylinderGeometry` for holes, `BoxGeometry` for pockets).
    - Position and orient the cutting tool exactly where the AI identified the feature on the chosen face.
3. **Boolean Operations**:
    - Convert `THREE.Mesh` to CSG Evaluation nodes using `three-bvh-csg`.
    - Recursively subtract cutting features from the stock envelope.
4. **Final Export**: Return the simplified geometry to `ThreeViewer.tsx` for rendering.

### Fallback Strategy
If `three-bvh-csg` produces T-vertices or fails, we can implement an alternative CSG kernel (`manifold-3d`) here with minimal disruption to the rest of the application.
