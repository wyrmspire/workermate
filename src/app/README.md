# Application Layer — `src/app/`

> **Note:** This is a placeholder for Phase 1. Currently, no code is implemented.

This directory will contain the Next.js routes and API endpoints to serve the **Orientation Wizard**.

**Routes / API endpoints we will build:**
- `POST /api/upload`: Receives the initial image, uploads to Google AI Files API, returns `fileUri`.
- `POST /api/wizard/step-1`: Proxies Genkit flow `orientationFlowStep1_DetectViews`.
- `POST /api/wizard/step-2`: Proxies Genkit flow `orientationFlowStep2_ConfirmEnvelope`.
...and so on up to Step 5.

For complete details on the state machine orchestrated here, see:
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
