# UI Components — `src/components/`

> **Note:** This is a placeholder for Phase 1. Currently, no code is implemented.

This directory will contain the React components for the **Orientation Wizard** UI.

**Strict constraints:**
- The UI's single source of truth for drawing is the `OverlaySpec` coordinate system (0.0 to 1000.0, normalized).
- Every step MUST block on a Yes/No user decision.

**Components to be built:**
- `ImageOverlay.tsx`: SVG/Canvas rendering of boxes, lines, points, and arrows over the print.
- `YesNoPanel.tsx`: The primary interaction surface capturing user approval and optional text feedback.
- `StepHistory.tsx`: Breadcrumb/history view showing the confirmed facts locked in prior steps.
- `WizardContainer.tsx`: The state machine orchestrator managing the 5 flow steps.

For complete details, see:
- [01_ORIENTATION_WIZARD.md](../../docs/01_ORIENTATION_WIZARD.md)
- [02_OVERLAYS.md](../../docs/02_OVERLAYS.md)
