# Application Routing (`src/app/`)

This directory houses the Next.js App Router structure.

## Structure

- **`page.tsx`**: The main entry point. Currently acts as the primary layout holding:
    - The Genkit Chat Interface for image uploads.
    - The Image Viewer displaying overlays (boxes/arrows).
    - The Validation Checklist panel.
    - The 3D Result Viewer.
- **`layout.tsx`**: Standard Next.js root layout.
- **`api/genkit/route.ts`**: The API route exposing our Genkit flows to the frontend client. Takes base64 encoded images or file buffers and returns structured JSON arrays of features/dimensions.
