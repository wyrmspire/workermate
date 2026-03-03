import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema, DimensionProposalSchema, DatumProposalSchema } from '../lib/schemas';

const Step5InputSchema = z.object({
    fileUri: z.string(),
    mimeType: z.string().optional(),
    confirmedViews: z.array(ViewLayoutSchema),
    confirmedLW: z.object({
        length: DimensionProposalSchema,
        width: DimensionProposalSchema,
    }),
    confirmedDepth: DimensionProposalSchema,
    rejectionFeedback: z.string().optional(),
});

const Step5OutputSchema = OrientationStepResultSchema.extend({
    proposalData: DatumProposalSchema,
});

export const orientationFlowStep5_FinalSummary = ai.defineFlow(
    {
        name: 'orientationFlowStep5_FinalSummary',
        inputSchema: Step5InputSchema,
        outputSchema: Step5OutputSchema,
    },
    async (input) => {
        const primaryView = input.confirmedViews.find((v) => v.isPrimary);
        const primaryBox = primaryView?.boundingBox;

        const viewList = input.confirmedViews
            .map((v) => `  - id="${v.id}", label="${v.label}", isPrimary=${v.isPrimary}`)
            .join('\n');

        const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner.
- All coordinates MUST be within 0–1000 inclusive.

ALL CONFIRMED FACTS (do NOT contradict these):
Primary view: "${primaryView?.label ?? 'Front'}" (id: "${primaryView?.id ?? 'front'}")
Length (L): ${input.confirmedLW.length.value}${input.confirmedLW.length.unit} (from view: "${input.confirmedLW.length.sourceViewId}")
Width  (W): ${input.confirmedLW.width.value}${input.confirmedLW.width.unit} (from view: "${input.confirmedLW.width.sourceViewId}")
Depth  (D): ${input.confirmedDepth.value}${input.confirmedDepth.unit} (from view: "${input.confirmedDepth.sourceViewId}")

All views:
${viewList}

YOUR TASK — Step 5: Final Orientation Summary & Datum.
1. Determine the PRIMARY DATUM FACE — the face most likely designated as the setup datum.
   Look for: a face explicitly labeled "DATUM A" or "A", the face with the most dimension origin lines, 
   or the face that forms the reference plane for the most other dimensions.
   Choose from: "top", "front", "right", "left", "bottom", "back".

2. Map the confirmed L, W, D to the X, Y, Z axes. Each axis gets EXACTLY ONE letter (L, W, or D).
   No axis may share a letter. The permutation must be consistent with the drawing's orientation.
   Common convention: X=L (horizontal), Y=W (vertical in primary view), Z=D (depth into page).

3. Draw axis lines in the normalized coordinate space of the primary view, emanating from a datum origin point.
   Place the datum origin inside or near the part envelope of the primary view.
   - X axis line: horizontal, pointing right, labeled "X (L)"
   - Y axis line: vertical, pointing up (lower y value), labeled "Y (W)"  
   - Z axis line: diagonal lower-left direction, labeled "Z (D)"
   Place a point at the datum origin.

Return your answer as a JSON object:
{
  "proposalData": {
    "primaryFace": "<top|front|right|left|bottom|back>",
    "axisLabels": { "x": "<L|W|D>", "y": "<L|W|D>", "z": "<L|W|D>" }
  },
  "overlay": {
    "boxes": [],
    "lines": [
      { "x1": <origin x>, "y1": <origin y>, "x2": <origin x + 120>, "y2": <origin y>, "label": "X (L)", "strokeColor": "#FF4444" },
      { "x1": <origin x>, "y1": <origin y>, "x2": <origin x>, "y2": <origin y - 120>, "label": "Y (W)", "strokeColor": "#44FF44" },
      { "x1": <origin x>, "y1": <origin y>, "x2": <origin x - 80>, "y2": <origin y + 80>, "label": "Z (D)", "strokeColor": "#4444FF" }
    ],
    "points": [
      { "x": <origin x>, "y": <origin y>, "label": "Datum A Origin", "color": "#FFFFFF" }
    ],
    "arrows": []
  },
  "question": "Lock final orientation?"
}

RULES:
- axisLabels.x, axisLabels.y, axisLabels.z must all be different letters from {L, W, D}.
- The "question" field MUST be exactly: "Lock final orientation?"
- Axis line coordinates must respect 0–1000 bounds.
${primaryBox ? `- Place origin near: x=${Math.round(primaryBox.x + primaryBox.w * 0.25)}, y=${Math.round(primaryBox.y + primaryBox.h * 0.75)} (lower-left inside primary view).` : ''}`;

        const rejectionNote = input.rejectionFeedback
            ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Revise accordingly — you may reconsider the datum face or axis mapping.`
            : '';

        const { output } = await ai.generate({
            model: 'googleai/gemini-3-flash-preview',
            config: {
                thinkingConfig: { thinkingLevel: 'HIGH' },
            },
            output: { schema: Step5OutputSchema },
            prompt: [
                {
                    media: { url: input.fileUri, contentType: input.mimeType ?? 'image/png' },
                    metadata: { mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' } },
                },
                { text: systemPrompt + rejectionNote },
            ],
        });

        if (!output) {
            throw new Error('No output from orientationFlowStep5_FinalSummary');
        }

        return {
            ...output,
            question: 'Lock final orientation?',
        };
    }
);
