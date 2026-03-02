import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema } from '../lib/schemas';

const Step1InputSchema = z.object({
  fileUri: z.string(),
  rejectionFeedback: z.string().optional(),
});

const Step1OutputSchema = OrientationStepResultSchema;

export const orientationFlowStep1_DetectViews = ai.defineFlow(
  {
    name: 'orientationFlowStep1_DetectViews',
    inputSchema: Step1InputSchema,
    outputSchema: Step1OutputSchema,
  },
  async (input) => {
    const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner of the entire image.
- All x, y, w, h values MUST be within 0–1000 inclusive.
- Box validity: w > 0, h > 0, x + w <= 1000, y + h <= 1000.

YOUR TASK — Step 1: Detect all orthographic and isometric views.
1. Find every distinct view block on the drawing (Front, Top, Right, Section, Isometric, Detail, etc.).
2. For each view, return a bounding box in normalized 0–1000 coordinates.
3. Classify each view with an id (use: "front", "top", "right", "section-A", "iso", or similar) and a human-readable label.
4. Choose EXACTLY ONE view as the primary (isPrimary: true). The primary view is the one with the most overall part geometry visible — typically the Front view.
5. Set isPrimary: false for all other views.

Return your answer as a JSON object matching this EXACT schema:
{
  "proposalData": [
    {
      "id": "<string>",
      "label": "<string>",
      "isPrimary": <boolean>,
      "boundingBox": { "x": <number>, "y": <number>, "w": <number>, "h": <number> }
    }
  ],
  "overlay": {
    "boxes": [
      { "x": <number>, "y": <number>, "w": <number>, "h": <number>, "label": "<viewLabel>", "strokeColor": "<color>" }
    ],
    "lines": [],
    "points": [],
    "arrows": []
  },
  "question": "Are these the bounding boxes for the views, and is the highlighted one the primary view?",
  "cropWindow": null
}

Use strokeColor "#00FF00" (green) for the primary view box and "#FFFF00" (yellow) for all others.
Do NOT include cropWindow for Step 1.
The "question" field MUST be exactly: "Are these the bounding boxes for the views, and is the highlighted one the primary view?"`;

    const rejectionNote = input.rejectionFeedback
      ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Try again with a revised answer.`
      : '';

    const { output } = await ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      config: {
        thinkingLevel: 'MINIMAL',
        mediaResolution: 'medium',
      },
      output: { schema: Step1OutputSchema },
      prompt: [
        { media: { url: input.fileUri } },
        { text: systemPrompt + rejectionNote },
      ],
    });

    if (!output) {
      throw new Error('No output from orientationFlowStep1_DetectViews');
    }

    // Ensure the fixed question string is always correct
    return {
      ...output,
      question: 'Are these the bounding boxes for the views, and is the highlighted one the primary view?',
    };
  }
);
