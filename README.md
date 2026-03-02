# WorkerMate — Machinist Print Analyzer

An AI-powered tool that reads 2D machinist prints (engineering drawings), reasons about their geometry through a guided human-in-the-loop workflow, and renders the final part as an interactive 3D model.

---

## The Problem

Reading a machinist print is hard. You need to cross-reference multiple orthographic views, decode GD&T callouts, mentally assemble where features live in 3D space, and pick the right datums before you can even think about programming a CNC machine. This project automates that first-pass reading.

## What WorkerMate Does

1. **Upload** — You drop a machinist print image into a chat interface.
2. **Envelope Pass** — The AI identifies the overall part envelope (Length × Width × Height) by reasoning across all views. It overlays its choices on the print for you to confirm or reject.
3. **Feature Pass** — Once the envelope is locked, the AI identifies every boolean operation (holes, pockets, slots, chamfers, radii) and marks them on the print with arrows and labels.
4. **Validation Loop** — At each stage you get checkboxes. Approve correct items; reject wrong ones. The AI re-analyzes only the rejected items using your feedback.
5. **3D Render** — Once every feature is confirmed, the app generates a Three.js 3D model by subtracting features from a solid stock block using CSG boolean operations.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js (App Router) | Server components, API routes, fast dev loop |
| AI Orchestration | Genkit (`@genkit-ai/google-genai`) | Structured flows, Zod schemas, vision model support |
| Vision Model | Gemini 2.5 Pro | Best-in-class image understanding for engineering drawings |
| 3D Engine | Three.js + `three-bvh-csg` | Fast CSG booleans, standard Three.js workflow |
| Fallback CSG | `manifold-3d` (WASM) | CAD-grade robustness if `three-bvh-csg` produces artifacts |
| UI | React + CSS (clean, functional) | Simple confirmation UIs, not a design showcase |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/wyrmspire/workermate.git
cd workermate

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your GEMINI_API_KEY

# 4. Run
npm run dev
```

---

## Project Structure

```
workermate/
├── agents.md              ← Rules for AI agents working in this repo
├── ARCHITECTURE.md        ← System design, data flow, state machine
├── README.md              ← You are here
├── .env.example           ← Template for environment variables
│
├── src/
│   ├── agent/             ← Genkit flows, prompts, schemas
│   │   └── README.md      ← AI flow documentation
│   ├── app/               ← Next.js pages + API routes
│   │   └── README.md      ← Routing documentation
│   ├── components/        ← React UI components
│   │   └── README.md      ← Component catalog
│   └── lib/               ← 3D geometry, CSG utilities
│       └── README.md      ← CSG pipeline documentation
│
├── printcode.sh           ← Dump source for LLM context
├── gitr.sh                ← Quick git commit + push
└── gitrdif.sh             ← Git diff report generator
```

---

## Key Documents

| Document | Audience | Purpose |
|---|---|---|
| [agents.md](agents.md) | AI agents | Hard rules, guardrails, naming conventions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Everyone | System design, state machine, data contracts |
| [src/agent/README.md](src/agent/README.md) | Developers + AI | Genkit flow specs, prompt engineering notes |
| [src/components/README.md](src/components/README.md) | Developers + AI | UI component catalog and behavior specs |
| [src/lib/README.md](src/lib/README.md) | Developers + AI | CSG pipeline, geometry processing |
| [src/app/README.md](src/app/README.md) | Developers + AI | Page routes, API route contracts |
