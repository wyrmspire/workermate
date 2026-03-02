# Agent Operations Guide

> **Audience:** AI coding agents (Antigravity, Gemini, Copilot, etc.)
> Read this file first before touching any code in this repository.

---

## 1. What Is This Project?

WorkerMate analyzes 2D machinist prints (engineering drawings) and converts them into 3D models. The pipeline is:

**Upload → AI Envelope Analysis → User Confirmation → AI Feature Analysis → User Confirmation → 3D CSG Rendering**

The human is in the loop at every AI stage. Do not skip confirmations.

---

## 2. The Rules

### 2.1 Never Skip the Validation Loop
The entire point of this project is human-in-the-loop verification. Every AI analysis step **must** return structured data that the UI renders on top of the original print image, and the user **must** approve it before proceeding. Do not build any flow that tries to go from image → 3D in one shot.

### 2.2 Structured Output Only
All Genkit flows must define a Zod output schema. Freeform text responses are banned. The frontend needs to render overlays programmatically — it cannot parse prose.

### 2.3 Genkit Conventions
- All Genkit code lives in `src/agent/`.
- Use the `@genkit-ai/google-genai` plugin with `gemini-2.5-pro` for vision tasks.
- Follow the single-file pattern: all flows, schemas, and the Genkit `ai` instance go in `src/agent/index.ts`.
- Always use `ai.defineFlow()` with explicit `inputSchema` and `outputSchema`.
- See the [Genkit Usage Guide](https://firebase.google.com/docs/genkit) and the data contracts in `ARCHITECTURE.md`.

### 2.4 Three.js / CSG Conventions
- Use `three-bvh-csg` as the primary CSG library.
- Only fall back to `manifold-3d` if you encounter persistent non-manifold output.
- CSG code lives in `src/lib/`. It takes `CSGInstruction` objects (defined in `ARCHITECTURE.md`) and returns `THREE.Mesh`.

### 2.5 File Organization
| Directory | Contents | Guard Rail |
|---|---|---|
| `src/agent/` | Genkit flows, Zod schemas, prompt templates | No UI imports, no Three.js |
| `src/app/` | Next.js pages and API routes | Thin wrappers that call flows/components |
| `src/components/` | React components | No direct Genkit calls; receive data via props |
| `src/lib/` | CSG pipeline, geometry helpers | No React, no Genkit — pure Three.js |

### 2.6 Naming Conventions
- Flows: `camelCaseFlow` (e.g., `analyzeEnvelopeFlow`, `analyzeFeaturesFlow`)
- Components: `PascalCase.tsx` (e.g., `PrintViewer.tsx`, `ValidationPanel.tsx`)
- Lib functions: `camelCase.ts` (e.g., `buildCSG.ts`, `createCuttingTool.ts`)
- Types/interfaces: `PascalCase` in a `types.ts` file per directory

### 2.7 Environment
- Only `GEMINI_API_KEY` is required. See `.env.example`.
- Never commit `.env.local`. It is in `.gitignore`.

---

## 3. How to Approach Tasks

### Starting a new feature
1. Read `ARCHITECTURE.md` to understand where it fits in the state machine.
2. Check the relevant `src/*/README.md` for component/flow specs.
3. Write the code following the conventions above.
4. Test with `npm run dev`.

### Modifying a Genkit flow
1. Read the existing flow in `src/agent/index.ts`.
2. Update the Zod schemas if the data contract changes.
3. Mirror changes in `ARCHITECTURE.md` data contracts section.
4. Verify with `genkit start -- npm run dev` if possible.

### Debugging AI output
1. Use Genkit's dev UI (`genkit start`) to inspect flow traces.
2. The AI may return low-confidence results — the UI handles this by highlighting uncertain items in the validation panel.

---

## 4. Key Documents

| Document | What to read it for |
|---|---|
| `README.md` | Project overview, tech stack, quick start |
| `ARCHITECTURE.md` | State machine, data contracts (TypeScript interfaces), component diagram |
| `src/agent/README.md` | Flow specifications, prompt engineering notes |
| `src/components/README.md` | Component catalog, props, behavior |
| `src/lib/README.md` | CSG pipeline, tool geometry, fallback strategy |
| `src/app/README.md` | API route contracts, page structure |

---

## 5. Common Mistakes to Avoid

| Mistake | Why it's wrong | What to do instead |
|---|---|---|
| Returning plain text from a Genkit flow | Frontend can't render overlays from prose | Always use Zod output schemas |
| Putting Genkit imports in a component | Breaks client/server boundary | Call flows via API routes only |
| Skipping the feature approval step | User loses trust, errors compound | Always show checklist before 3D |
| Using `three-csg-ts` or old BSP libs | Slow, buggy, abandoned | Use `three-bvh-csg` |
| Committing `.env.local` | Leaks API keys | It's in `.gitignore` — leave it there |
