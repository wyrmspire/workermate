import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema, OverlaySpecSchema } from '../lib/schemas';

const Step3InputSchema = z.object({
    fileUri: z.string(),
    confirmedViews: z.array(ViewLayoutSchema),
    confirmedEnvelope: OverlaySpecSchema,
    rejectionFeedback: z.string().optional(),
});

const Step3OutputSchema = OrientationStepResultSchema;

export const orientationFlowStep3_LockLW = ai.defineFlow(
    {
        name: 'orientationFlowStep3_LockLW',
        inputSchema: Step3InputSchema,
        outputSchema: Step3OutputSchema,
    },
    async (input) => {
        const primaryView = input.confirmedViews.find((v) => v.isPrimary);
        const envelopeBox = input.confirmedEnvelope.boxes[0];

        const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner.
- All coordinates MUST be within 0–1000 inclusive.

CONFIRMED FACTS FROM PRIOR STEPS:
Primary view: "${primaryView?.label ?? 'Front'}" (id: "${primaryView?.id ?? 'front'}")
${envelopeBox ? `Part envelope in primary view: x=${envelopeBox.x}, y=${envelopeBox.y}, w=${envelopeBox.w}, h=${envelopeBox.h}` : ''}

YOUR TASK — Step 3: Lock Length and Width.
1. Within the primary view, find the TWO overall dimension callouts that represent the maximum extents of the part:
   - LENGTH (L): the LARGER of the two overall dimensions.
   - WIDTH (W): the SMALLER of the two overall dimensions.
2. Read the numeric value and unit (mm or in) from the dimension text on the drawing.
3. Return arrows pointing FROM whitespace TO the dimension text locations.
4. Label the arrows exactly: "Length (L): <value><unit>" and "Width (W): <value><unit>".

Use HIGH precision — read the actual dimension numbers from the drawing text carefully.

Return your answer as a JSON object:
{
  "proposalData": {
    "length": { "value": <number>, "unit": "<mm|in>", "sourceViewId": "${primaryView?.id ?? 'front'}", "confidence": <0-1> },
    "width":  { "value": <number>, "unit": "<mm|in>", "sourceViewId": "${primaryView?.id ?? 'front'}", "confidence": <0-1> }
  },
  "overlay": {
    "boxes": [],
    "lines": [],
    "points": [],
    "arrows": [
      { "fromX": <whitespace x>, "fromY": <whitespace y>, "toX": <dim text x>, "toY": <dim text y>, "label": "Length (L): <value><unit>", "strokeColor": "#00FF00" },
      { "fromX": <whitespace x>, "fromY": <whitespace y>, "toX": <dim text x>, "toY": <dim text y>, "label": "Width (W): <value><unit>", "strokeColor": "#00BFFF" }
    ]
  },
  "question": "Are the Length and Width axes and values correct for this primary view?"
}

The "question" field MUST be exactly: "Are the Length and Width axes and values correct for this primary view?"
The length value MUST be >= the width value.`;

        const rejectionNote = input.rejectionFeedback
            ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Try again with a revised answer that addresses their concern.`
            : '';

        const { output } = await ai.generate({
            model: 'googleai/gemini-3-flash-preview',
            config: {
                thinkingLevel: 'HIGH',
                mediaResolution: 'high',
            },
            output: { schema: Step3OutputSchema },
            prompt: [
                { media: { url: input.fileUri } },
                { text: systemPrompt + rejectionNote },
            ],
        });

        if (!output) {
            throw new Error('No output from orientationFlowStep3_LockLW');
        }

        return {
            ...output,
            question: 'Are the Length and Width axes and values correct for this primary view?',
        };
    }
);
