# Agent Operations Guide (agents.md)

This file contains crucial instructions for any AI agents (like Antigravity) working in this repository.

## Project Context
- We are building an intelligent machinist print parser.
- The user will converse with a Genkit agent to upload 2D prints.
- We use iterative confirmation steps: the AI parses part of the print, overlays boxes/arrows on the image, asks for User validation via a simple UI, and then either re-attempts or moves to the next step.
- We finish by rendering a 3D model using `three-bvh-csg`.

## Folder Structure & Scaffolding
- `src/agent/`: Contains the Genkit setup, flows, and prompts. Treat this as the brain for analyzing inputs.
- `src/components/`: Contains React UI components for the Next.js app. Key components include ChatUI, DocumentViewer (with SVG/canvas overlays), and ThreeViewer.
- `src/lib/`: Contains utility functions specifically for 3D generation, manipulating CSG meshes via `three-bvh-csg`, and generic geometry helpers.
- `src/app/`: Standard Next.js pages and API routes (which host the Genkit backend).

## Technical Requirements
- Prefer `three-bvh-csg` over other BSP tools. It maintains fast performance and standard Three.js usage, without immediately resorting to heavy WASM libraries unless structural failures occur.
- Genkit functions should return structured JSON that the React frontend can easily map onto the 2D image as overlays (x, y, width, height, rotation, label).
- Do not attempt to jump straight to 3D. The middle layers of user validation (the "checklists") are critical.
