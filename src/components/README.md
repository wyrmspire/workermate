# UI Components (`src/components/`)

This folder contains the React components used to assemble the interface.

## High-Level UI Components

### 1. Chat Interface (`ChatInterface.tsx`)
A conversational UI where the user can upload a print and chat with the Genkit agent. It displays the AI's thoughts and allows prompting for corrections.

### 2. Print Viewer with Overlays (`PrintViewer.tsx`)
Displays the uploaded 2D print. Uses a canvas or SVG overlay to draw opaque boxes and arrows pointing to features the AI identified.
- Must support zooming and panning (especially for cluttered prints).
- Must handle interactive clicking (e.g., clicking a highlighted hole to view its AI-determined properties).

### 3. Validation Checklist (`ValidationChecklist.tsx`)
A sidebar or floating panel presenting the Yes/No checkboxes for the AI's findings.
- **Step 1**: Envelope validation (Length, Width, Height, Orientations).
- **Step 2**: Feature validation (List of cuts, holes, pockets).

### 4. 3D Viewer (`ThreeViewer.tsx`)
A Three.js canvas utilizing `@react-three/fiber` (or raw Three.js) to render the final generated solid model.
Displays the base stock and animates/highlights the boolean CSG subtractions as they are applied.
