# Application Layer — `src/app/`

This directory contains the Next.js App Router pages and API routes. Pages are thin orchestrators that wire components together and manage session state. API routes proxy requests to Genkit flows.

---

## File Structure (Target)

```
src/app/
├── layout.tsx               ← Root layout (fonts, metadata, providers)
├── page.tsx                 ← Main single-page app
├── globals.css              ← Global styles
├── api/
│   └── analyze/
│       └── route.ts         ← POST endpoint for Genkit flow calls
└── README.md                ← You are here
```

---

## Page: `page.tsx`

The application is a single page with a multi-panel layout:

```
┌─────────────────────────────────────────────────────────┐
│                     Header / Title                       │
├──────────────┬──────────────────────┬───────────────────┤
│              │                      │                   │
│   Chat       │   Print Viewer       │   Validation      │
│   Interface  │   (with overlays)    │   Panel           │
│              │                      │                   │
├──────────────┴──────────────────────┴───────────────────┤
│                   3D Viewer (when ready)                 │
└─────────────────────────────────────────────────────────┘
```

### State Management

The page uses `useReducer` with the state machine defined in `ARCHITECTURE.md`:

```ts
type AppState = {
  stage: 'idle' | 'analyzing_envelope' | 'confirming_envelope'
       | 'analyzing_features' | 'confirming_features'
       | 'generating_3d' | 'viewing_model';
  image: File | null;
  imageUrl: string | null;
  envelope: EnvelopeResult | null;
  features: Feature[];
  csgMesh: THREE.Mesh | null;
  feedback: string;
};
```

---

## API Route: `POST /api/analyze`

A single API route handles both envelope and feature analysis. The request body specifies which flow to run.

### Request

```ts
{
  flow: 'envelope' | 'features';
  imageBase64: string;
  mimeType: string;
  // For features flow:
  envelope?: EnvelopeResult;
  previousFeatures?: Feature[];
  rejectedFeatureIds?: string[];
  feedback?: string;
}
```

### Response

```ts
// For envelope flow:
{ result: EnvelopeResult }

// For features flow:
{ result: FeatureResult }

// On error:
{ error: string }
```

### Implementation

```ts
// Pseudocode
export async function POST(req: Request) {
  const body = await req.json();

  if (body.flow === 'envelope') {
    const result = await analyzeEnvelopeFlow(body);
    return Response.json({ result });
  }

  if (body.flow === 'features') {
    const result = await analyzeFeaturesFlow(body);
    return Response.json({ result });
  }

  return Response.json({ error: 'Unknown flow' }, { status: 400 });
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI API key for Gemini vision model |

See `.env.example` for the template.
