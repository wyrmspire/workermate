# Machinist Copilot

This project is an AI-powered CAD assistant specifically focused on interpreting 2D machinist prints and converting them into 3D models using web-based CSG operations.

## Core Data Flow

1. **User Upload**: The user uploads a 2D machinist print (image/PDF) via a chat interface.
2. **Genkit Analysis 1 (Envelope)**:
    - The AI analyzes the print to identify the overall length, width, height, and main orthographic views.
    - It reasons over different views to pick the best overall bounding box.
    - The UI displays the print overlayed with boxes identifying these key dimensions for confirmation.
3. **User Confirmation 1**:
    - The user confirms or corrects the bounding box and orientations.
    - If incorrect, feedback triggers re-analysis.
4. **Genkit Analysis 2 (Features)**:
    - AI identifies internal features (boolean cuts, holes, slots, pockets).
    - It highlights exactly where each dimension/cut originates and what operation it runs from the bounding box.
    - Opaque boxes and arrows highlight findings on the original image.
5. **User Confirmation 2**:
    - User clicks through checklists for each feature.
    - Incorrect features are sent back to the agent with feedback for re-evaluation.
6. **3D Generation (`three-bvh-csg`)**:
    - When all features are approved, the app generates a watertight 3D model in Three.js using robust constructive solid geometry operations.

## Architecture Highlights
- **Framework**: Next.js (App Router)
- **AI Orchestration**: Genkit flows (Vision models, structured output, memory/chat history)
- **3D Engine**: Three.js + `three-bvh-csg` (fast, reliable CSG)
- **UI**: Tailwind CSS, generic React components
