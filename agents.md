# Agent Operations Guide (Docs Mode)

> **Audience:** AI coding agents (Antigravity, Cursor, etc.)
> Read this file first before touching any code in this repository.

---

## 1. Hard Rules

1. **DO NOT implement code yet.** We are in a documentation / scaffolding phase. Only edit `.md` files until the architecture is perfectly locked.
2. **Gemini 3 Flash ONLY.** The singular allowed model is `gemini-3-flash-preview`. Hard ban on all mentions or usage of any other models.
3. **Never skip validation.** There is no "one-shot" generation. Every flow step ends by asking the user for confirmation (Yes/No).
4. **Structured outputs only.** All Genkit flows must return structured JSON defined by Zod schemas. Overlays must use the standardized coordinate system.

---

## 2. Prompting Philosophy

When writing prompts for the Genkit flows, adhere to these principles:

- **Hypothesis generator, not fact reader.** The model should phrase its outputs internally as proposals that require human validation, not absolute truth.
- **Always propose + ask for confirmation.** "I believe the top view is here. Does this look correct?"
- **Ask only ONE question per step.** Do not overwhelm the user. Step 1 asks about views. Step 2 asks about the envelope outline. Do not mix them.

---

## 3. Iteration Protocol (The Retry Loop)

The validation UI is strictly Yes/No with optional feedback.

- **User says YES**: The proposed facts (data contracts) for step `i` are persisted to session state. The UI advances to step `i+1`.
- **User says NO**: The UI stays on step `i`. The flow for step `i` is called again, passing the prior image `fileUri`, the confirmed facts from step `i-1`, the rejected proposal, and the `userFeedback` string. The model generates a new proposal, and the UI updates the overlays.

---

## 4. Truth Hierarchy

When reasoning about the print, the system must respect this hierarchy:

1. **User-confirmed facts:** Absolute truth. Never contradict what the user locked in a previous step.
2. **Model proposals:** Current hypotheses to be validated.
3. **Unknown:** Everything else layout, text, or features not yet analyzed.
