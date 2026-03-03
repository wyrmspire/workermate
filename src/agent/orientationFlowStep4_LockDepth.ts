import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema, DimensionProposalSchema } from '../lib/schemas';

const Step4InputSchema = z.object({
    fileUri: z.string(),
    mimeType: z.string().optional(),
    confirmedViews: z.array(ViewLayoutSchema),
    confirmedLW: z.object({
        length: DimensionProposalSchema,
        width: DimensionProposalSchema,
    }),
    rejectionFeedback: z.string().optional(),
});

const Step4OutputSchema = OrientationStepResultSchema.extend({
    proposalData: DimensionProposalSchema,
});

export const orientationFlowStep4_LockDepth = ai.defineFlow(
    {
        name: 'orientationFlowStep4_LockDepth',
        inputSchema: Step4InputSchema,
        outputSchema: Step4OutputSchema,
    },
    async (input) => {
        const primaryView = input.confirmedViews.find((v) => v.isPrimary);
        const nonPrimaryViews = input.confirmedViews.filter((v) => !v.isPrimary);

        const viewList = input.confirmedViews
            .map((v) => `  - id="${v.id}", label="${v.label}", isPrimary=${v.isPrimary}, box=(x=${v.boundingBox.x}, y=${v.boundingBox.y}, w=${v.boundingBox.w}, h=${v.boundingBox.h})`)
            .join('\n');

        const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner.
- All coordinates MUST be within 0–1000 inclusive.

CONFIRMED FACTS FROM PRIOR STEPS:
Primary view: "${primaryView?.label ?? 'Front'}" (id: "${primaryView?.id ?? 'front'}")
Confirmed Length (L): ${input.confirmedLW.length.value}${input.confirmedLW.length.unit}
Confirmed Width (W): ${input.confirmedLW.width.value}${input.confirmedLW.width.unit}

All views on the drawing:
${viewList}

Non-primary views available for depth: ${nonPrimaryViews.map((v) => `"${v.label}" (id: "${v.id}")`).join(', ') || 'none found — re-examine the drawing'}

YOUR TASK — Step 4: Lock Depth (Third Dimension).
The primary view shows Length and Width. We need the DEPTH (Thickness) of the part from an alternate view.

1. Select the BEST non-primary view that clearly shows the depth/thickness dimension of the part.
   Preferred order: Right Side view > Top view > Section view > Isometric.
   The chosen view's sourceViewId MUST NOT be "${primaryView?.id ?? 'front'}".

2. Within that chosen view, find the overall DEPTH (thickness) dimension callout — the dimension that represents the 3rd axis not already captured by L and W.

3. Return:
   - A box around the chosen alternate view.
   - An arrow pointing FROM whitespace TO the depth dimension text.

Return your answer as a JSON object:
{
  "proposalData": {
    "value": <number>,
    "unit": "<mm|in>",
    "sourceViewId": "<non-primary view id>",
    "confidence": <0-1>
  },
  "overlay": {
    "boxes": [
      { "x": <alternate view x>, "y": <alternate view y>, "w": <alternate view w>, "h": <alternate view h>, "label": "<chosen view label>", "strokeColor": "#FFFF00" }
    ],
    "lines": [],
    "points": [],
    "arrows": [
      { "fromX": <whitespace x>, "fromY": <whitespace y>, "toX": <dim text x>, "toY": <dim text y>, "label": "Depth (D): <value><unit>", "strokeColor": "#FF8C00" }
    ]
  },
  "question": "Is this the correct depth (thickness) dimension?"
}

The "question" field MUST be exactly: "Is this the correct depth (thickness) dimension?"
The sourceViewId MUST reference a non-primary view.`;

        const rejectionNote = input.rejectionFeedback
            ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Try again — consider choosing a different alternate view or re-reading the depth dimension.`
            : '';

        const { output } = await ai.generate({
            model: 'googleai/gemini-3-flash-preview',
            config: {
                thinkingConfig: { thinkingLevel: 'HIGH' },
            },
            output: { schema: Step4OutputSchema },
            prompt: [
                {
                    media: { url: input.fileUri, contentType: input.mimeType ?? 'image/png' },
                    metadata: { mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' } },
                },
                { text: systemPrompt + rejectionNote },
            ],
        });

        if (!output) {
            throw new Error('No output from orientationFlowStep4_LockDepth');
        }

        return {
            ...output,
            question: 'Is this the correct depth (thickness) dimension?',
            cropWindow: null,
        };
    }
);
