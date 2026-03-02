import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema } from '../lib/schemas';

const Step2InputSchema = z.object({
    fileUri: z.string(),
    confirmedViews: z.array(ViewLayoutSchema),
    rejectionFeedback: z.string().optional(),
});

const Step2OutputSchema = OrientationStepResultSchema;

export const orientationFlowStep2_ConfirmEnvelope = ai.defineFlow(
    {
        name: 'orientationFlowStep2_ConfirmEnvelope',
        inputSchema: Step2InputSchema,
        outputSchema: Step2OutputSchema,
    },
    async (input) => {
        const primaryView = input.confirmedViews.find((v) => v.isPrimary);
        const primaryBox = primaryView?.boundingBox ?? { x: 0, y: 0, w: 1000, h: 1000 };

        const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner.
- All coordinates MUST be within 0–1000 inclusive.
- Box validity: w > 0, h > 0, x + w <= 1000, y + h <= 1000.

STEP 1 RESULTS (already confirmed by user):
Primary view: "${primaryView?.label ?? 'Front'}" (id: "${primaryView?.id ?? 'front'}")
Primary view bounding box: x=${primaryBox.x}, y=${primaryBox.y}, w=${primaryBox.w}, h=${primaryBox.h}

YOUR TASK — Step 2: Confirm Part Outline Envelope.
Within the primary view bounding box above, find the TIGHTEST bounding box that encompasses ONLY the physical part geometry.
EXCLUDE: dimension lines, leader lines, extension lines, center lines, notes, tolerances, title block text, arrows, and any annotation that is not part of the physical geometry outline.
INCLUDE: only the solid outline of the physical part itself.

The envelope box MUST be fully inside the primary view bounding box.
Use normalized 0–1000 global coordinates (NOT local coordinates relative to the primary view).

Return your answer as a JSON object:
{
  "proposalData": {
    "boxes": [{ "x": <number>, "y": <number>, "w": <number>, "h": <number> }],
    "lines": [],
    "points": [],
    "arrows": []
  },
  "overlay": {
    "boxes": [{ "x": <number>, "y": <number>, "w": <number>, "h": <number>, "label": "Part Envelope", "strokeColor": "#FF0000" }],
    "lines": [],
    "points": [],
    "arrows": []
  },
  "question": "Does this box accurately capture the overall part envelope in the primary view?",
  "cropWindow": { "x": ${primaryBox.x}, "y": ${primaryBox.y}, "w": ${primaryBox.w}, "h": ${primaryBox.h} }
}

The "question" field MUST be exactly: "Does this box accurately capture the overall part envelope in the primary view?"`;

        const rejectionNote = input.rejectionFeedback
            ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Try again with a revised answer.`
            : '';

        const { output } = await ai.generate({
            model: 'gemini-3-flash-preview',
            config: {
                thinkingLevel: 'MINIMAL',
                mediaResolution: 'medium',
            },
            output: { schema: Step2OutputSchema },
            prompt: [
                { media: { url: input.fileUri } },
                { text: systemPrompt + rejectionNote },
            ],
        });

        if (!output) {
            throw new Error('No output from orientationFlowStep2_ConfirmEnvelope');
        }

        return {
            ...output,
            question: 'Does this box accurately capture the overall part envelope in the primary view?',
            cropWindow: output.cropWindow ?? {
                x: primaryBox.x,
                y: primaryBox.y,
                w: primaryBox.w,
                h: primaryBox.h,
            },
        };
    }
);
