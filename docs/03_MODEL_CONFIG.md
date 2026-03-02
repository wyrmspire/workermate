# Model Configuration: Gemini 3 Flash ONLY

This project enforces a strict, single-model policy for all Genkit flows. 

## The Model

**ID:** `gemini-3-flash-preview`  
**Provider:** `@genkit-ai/google-genai`

*Why?* Gemini 3 Flash introduces controllable `thinking_level` and `media_resolution` knobs. By sticking to one model, we can fine-tune performance across the 5 wizard steps without juggling multiple API limits or context window rules.

**Rule:** There is NO falling back to older models. Do not ask for it. Do not implement it. All models other than `gemini-3-flash-preview` are prohibited.

---

## Image File Reuse

A machinist print is uploaded once at the very beginning of the session. 
We use the Google AI **Files API** to upload the image and retrieve a `fileUri`.

This `fileUri` is then passed implicitly through Genkit multimodal payloads for every subsequent wizard step. Do not base64-encode the image payload on every step—this causes latency spikes and burns token limits rapidly.

---

## Per-Step Knobs

### `thinking_level`
A feature of Gemini 3 that trades latency for reasoning depth.

- **Fast (Default):** Use for Step 1 (Detect Views) and Step 2 (Confirm Part Envelope). This is basic computer vision bounding-box work and should return in <2 seconds.
- **High/Complex:** Use for Step 3 (L+W values), Step 4 (Depth value), and Step 5 (Datums). Reading microscopic GD&T notation, resolving contradictory dimensions, and mapping axes to orthographic views requires deeper reasoning loops.

### `media_resolution`
Controls how many tokens the image is parsed into, prioritizing legibility vs speed.

- **Medium (Default):** Step 1 and 2. Detecting large blocks (views, bounding box limits).
- **High:** Steps 3, 4, 5, and all Phase 2 Feature Detection. Reading dense 8-point dimension lines across A0-sized blueprints requires maximum fidelity.

---

## Prompt Structure Constraints
- **One question per flow.** Keep the prompt tightly bound to the exact step output needed.
- Provide the normalized `0-1000` coordinate space rules clearly in the system instructions for the model.
