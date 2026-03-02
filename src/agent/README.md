# AI Flow Definitions (`src/agent/`)

This directory houses the Genkit configurations and flow definitions.

## Key Concepts

### 1. Multi-Step Reasoning
Instead of a single zero-shot prompt that tries to build the entire 3D model from an image, the reasoning is broken down into specific flows:
- **`analyzeEnvelopeFlow`**: Look at the print, determine length, width, height, and the primary views (Top, Front, Right). Returns bounding box coordinates.
- **`analyzeFeaturesFlow`**: Given the confirmed envelope, analyze boolean operations (holes, pockets, slots). Identifies face orientation and operation type. Returns a list of discrete operations.

### 2. Output Formatting
All AI outputs must be strictly typed (e.g., using Zod schemas in Genkit) so the frontend can easily overlay bounding boxes and arrows on the original image.
- Expected standard: `{ id: string, type: 'envelope' | 'hole' | 'pocket', coords: { x, y, w, h }, face: 'top', validationRequired: true }`

### 3. State & Memory
If the user rejects certain features during confirmation, the agent needs conversational memory or the application state needs to pass back the previous attempts along with the user's rejection notes.
