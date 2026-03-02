# Genkit AI Flows — `src/agent/`

> **Note:** This is a placeholder for Phase 1. Currently, no code is implemented.

This directory will house the 5 Genkit flows that power the **Orientation Wizard**. 

**Strict constraints for this folder:**
1. **Model:** Gemini 3 Flash Preview (`gemini-3-flash-preview`) strictly.
2. **Input:** The `fileUri` from the Google AI Files API (uploaded once, reused across steps).
3. **Output:** Structured JSON conforming to the standardized `OverlaySpec` (0-1000 coordinate system).
4. **Behavior:** Never one-shot. Each flow (Step 1 through 5) asks one question and demands user confirmation.

**Flows to be built:**
- `orientationFlowStep1_DetectViews`
- `orientationFlowStep2_ConfirmEnvelope`
- `orientationFlowStep3_LockLW`
- `orientationFlowStep4_LockDepth`
- `orientationFlowStep5_FinalSummary`

For complete details, see:
- [01_ORIENTATION_WIZARD.md](../../docs/01_ORIENTATION_WIZARD.md)
- [02_OVERLAYS.md](../../docs/02_OVERLAYS.md)
- [03_MODEL_CONFIG.md](../../docs/03_MODEL_CONFIG.md)
