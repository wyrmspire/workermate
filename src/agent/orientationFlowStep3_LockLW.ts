import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema, OverlaySpecSchema, DimensionProposalSchema } from '../lib/schemas';

const Step3InputSchema = z.object({
    fileUri: z.string(),
    mimeType: z.string().optional(),
    confirmedViews: z.array(ViewLayoutSchema),
    confirmedEnvelope: OverlaySpecSchema,
    rejectionFeedback: z.string().optional(),
});

const Step3OutputSchema = OrientationStepResultSchema.extend({
    proposalData: z.object({
        length: DimensionProposalSchema,
        width: DimensionProposalSchema,
    }),
});

export const orientationFlowStep3_LockLW = ai.defineFlow(
    {
        name: 'orientationFlowStep3_LockLW',
        inputSchema: Step3InputSchema,
        outputSchema: Step3OutputSchema,
    },
    async (input) => {
        const primaryView = input.confirmedViews.find((v) => v.isPrimary);

        // Build a description of ALL confirmed views
        const viewList = input.confirmedViews
            .map((v) => {
                const tag = v.isPrimary ? ' [PRIMARY]' : '';
                return `  - id="${v.id}", label="${v.label}"${tag}, box=(x=${v.boundingBox.x}, y=${v.boundingBox.y}, w=${v.boundingBox.w}, h=${v.boundingBox.h})`;
            })
            .join('\n');

        // Describe envelope boxes per view
        const envelopeDesc = input.confirmedEnvelope.boxes
            .map((box, i) => `  ${i + 1}. label="${box.label ?? 'Envelope'}", box=(x=${box.x}, y=${box.y}, w=${box.w}, h=${box.h})`)
            .join('\n');

        const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner.
- All coordinates MUST be within 0–1000 inclusive.

CONFIRMED FACTS FROM PRIOR STEPS:

All confirmed views:
${viewList}

Confirmed part envelopes:
${envelopeDesc}

YOUR TASK — Step 3: Lock Length and Width.

IMPORTANT: The overall Length and Width dimensions might NOT both appear in the same view.
Sometimes one dimension is visible in the primary view and the other is only visible in a secondary view.
You MUST search ALL views — do NOT limit yourself to only the primary view.

1. Search ALL views for the TWO dimension callouts that represent the MAXIMUM OVERALL extents of the part:
   - LENGTH (L): the LARGER of the two overall dimensions.
   - WIDTH (W): the SMALLER of the two overall dimensions.

2. For each dimension:
   - Read the numeric value and unit (mm or in) from the dimension text on the drawing.
   - Record which view it was found in via sourceViewId.
   - A dimension found in ANY view is valid — do not reject a dimension just because it's in a secondary view.

3. CRITICAL RULES for selecting the correct dimensions:
   - Only select dimensions that span the FULL EXTENT of the part (edge-to-edge of the overall outline).
   - Do NOT select partial dimensions like hole-to-edge, feature-to-edge, or hole diameter.
   - Do NOT select tolerance values, radius callouts, or chamfer dimensions.
   - If an overall dimension is not visible in one view, check the other views.
   - The Length value MUST be >= the Width value.

4. Return arrows pointing FROM whitespace TO the dimension text locations.
   Label the arrows: "Length (L): <value><unit>" and "Width (W): <value><unit>".

Return your answer as a JSON object:
{
  "proposalData": {
    "length": { "value": <number>, "unit": "<mm|in>", "sourceViewId": "<view id where found>", "confidence": <0-1> },
    "width":  { "value": <number>, "unit": "<mm|in>", "sourceViewId": "<view id where found>", "confidence": <0-1> }
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
  "question": "Are the Length and Width values correct? Check the source views."
}

Do NOT include a cropWindow — the user needs to see ALL views to verify the dimensions.
The "question" field MUST be exactly: "Are the Length and Width values correct? Check the source views."
The length value MUST be >= the width value.`;

        const rejectionNote = input.rejectionFeedback
            ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Try again — consider looking in other views or selecting different dimension callouts that represent the true overall extent.`
            : '';

        const { output } = await ai.generate({
            model: 'googleai/gemini-3-flash-preview',
            config: {
                thinkingConfig: { thinkingLevel: 'HIGH' },
            },
            output: { schema: Step3OutputSchema },
            prompt: [
                {
                    media: { url: input.fileUri, contentType: input.mimeType ?? 'image/png' },
                    metadata: { mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' } },
                },
                { text: systemPrompt + rejectionNote },
            ],
        });

        if (!output) {
            throw new Error('No output from orientationFlowStep3_LockLW');
        }

        return {
            ...output,
            question: 'Are the Length and Width values correct? Check the source views.',
            cropWindow: null, // No zoom — user needs to see all views
        };
    }
);
