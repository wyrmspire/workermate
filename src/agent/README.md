# Genkit AI Flows — `src/agent/`

This directory contains all AI logic for the machinist print analyzer: Genkit initialization, flow definitions, Zod schemas, and prompt templates.

> **Rule:** All Genkit code goes in a single `index.ts` file per the Genkit best-practice guide. Keep prompts as template strings inside the flow or in a `prompts/` subdirectory if they get long.

---

## File Structure (Target)

```
src/agent/
├── index.ts          ← Genkit ai instance + all flow definitions
├── schemas.ts        ← Shared Zod schemas (EnvelopeResult, FeatureResult, etc.)
├── prompts/          ← Long prompt templates (optional, can inline)
│   ├── envelope.ts
│   └── features.ts
└── README.md         ← You are here
```

---

## Flow 1: `analyzeEnvelopeFlow`

### Purpose
Takes an uploaded print image and identifies the global part dimensions (Length, Width, Height), the dominant orientation, the primary datum face, and all orthographic views present.

### Input
```ts
z.object({
  imageBase64: z.string(),       // The uploaded print as base64
  mimeType: z.string(),          // e.g. "image/png"
  feedback: z.string().optional() // User's rejection notes from a previous attempt
})
```

### Output
Returns an `EnvelopeResult` (see `ARCHITECTURE.md` §3.1) with overlay coordinates the frontend can draw on the image.

### Reasoning Strategy (embed in prompt)
1. **Identify views** — Scan the image for all orthographic views (front, top, right, sections, details, isometric). Label each with a bounding box.
2. **Map dimensions to axes** — For each view, identify which drawn dimensions correspond to Length, Width, or Height of the 3D part.
3. **Cross-reference** — The same real-world dimension should appear consistently across views. If 120.0mm appears horizontally in the top view and horizontally in the front view, they are the same axis.
4. **Resolve conflicts** — If dimension assignments conflict between views, prefer the view with clearer annotations. Lower the confidence score for ambiguous choices.
5. **Pick orientation** — Decide which axis is L vs W vs H based on convention (longest = Length, next = Width, shortest = Height unless the print states otherwise).
6. **Identify datum** — The primary datum face is usually the one with the most features or the one explicitly called out with datum symbols.

### Model
`gemini-2.5-pro` via `@genkit-ai/google-genai` — required for vision + structured output.

---

## Flow 2: `analyzeFeaturesFlow`

### Purpose
Given the confirmed envelope (L, W, H, orientation, views), analyze the print for every boolean machining operation: holes, pockets, slots, chamfers, fillets, steps, bosses, etc.

### Input
```ts
z.object({
  imageBase64: z.string(),
  mimeType: z.string(),
  envelope: EnvelopeResultSchema,            // The confirmed envelope from Step 1
  previousFeatures: z.array(FeatureSchema).optional(), // Features already approved
  rejectedFeatureIds: z.array(z.string()).optional(),   // IDs the user rejected
  feedback: z.string().optional()
})
```

### Output
Returns a `FeatureResult` (see `ARCHITECTURE.md` §3.2) with arrows pointing to each feature on the print.

### Reasoning Strategy (embed in prompt)
1. **Establish context** — You already know the part envelope and views. Focus on what's being removed from the stock.
2. **Scan each view** — Look at every dimensioned callout that isn't part of the envelope. Identify what it describes.
3. **Type the feature** — Is it a thru hole, blind hole, counterbore, countersink, thread, pocket, slot, chamfer, fillet, step, boss, radius?
4. **Read the callout text** — Parse the GD&T notation: `Ø8.0 THRU ALL`, `Ø13.5 ∇ 8.5`, `M4-6H ∇ 8.0`, `G1/2" - 6H ∇ 18.0`, etc.
5. **Assign a face** — Which face of the stock does this feature enter from?
6. **Zoom if needed** — If a view is cluttered, mentally crop to the relevant area to avoid confusing nearby callouts.
7. **Preserve approvals** — If `previousFeatures` are provided, do not re-analyze already-approved features. Only re-analyze rejected ones.

### Model
`gemini-2.5-pro` — same as envelope flow.

---

## Prompt Engineering Notes

### Image Input
Genkit supports multimodal input. Pass the image as:
```ts
const response = await ai.generate({
  model: googleAI.model('gemini-2.5-pro'),
  prompt: [
    { media: { url: `data:${mimeType};base64,${imageBase64}` } },
    { text: promptText }
  ],
  output: { schema: OutputSchema }
});
```

### Structured Output
Always use `output: { schema: ... }` to force the model to return JSON matching the Zod schema. This is critical — the frontend cannot function without structured data.

### Temperature
- Envelope flow: `temperature: 0.2` (we want deterministic dimension reading)
- Feature flow: `temperature: 0.3` (slightly more creative for feature typing, but still grounded)

### Handling Rejections
When a user rejects items, the flow is called again with:
- The original image
- The full confirmed envelope
- The list of previously approved features (don't re-analyze these)
- The rejected feature IDs + user feedback text
- The prompt should focus only on the rejected items and incorporate the feedback
