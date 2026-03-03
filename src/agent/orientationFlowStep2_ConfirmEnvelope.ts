import { z } from 'zod';
import { ai } from './genkit.config';
import { OrientationStepResultSchema, ViewLayoutSchema, OverlaySpecSchema } from '../lib/schemas';

const Step2InputSchema = z.object({
    fileUri: z.string(),
    mimeType: z.string().optional(),
    confirmedViews: z.array(ViewLayoutSchema),
    rejectionFeedback: z.string().optional(),
});

const Step2OutputSchema = OrientationStepResultSchema.extend({
    proposalData: OverlaySpecSchema,
});

export const orientationFlowStep2_ConfirmEnvelope = ai.defineFlow(
    {
        name: 'orientationFlowStep2_ConfirmEnvelope',
        inputSchema: Step2InputSchema,
        outputSchema: Step2OutputSchema,
    },
    async (input) => {
        // Build a description of ALL confirmed views for the prompt
        const viewList = input.confirmedViews
            .map((v, i) => {
                const tag = v.isPrimary ? ' [PRIMARY]' : '';
                return `  ${i + 1}. id="${v.id}", label="${v.label}"${tag}, box=(x=${v.boundingBox.x}, y=${v.boundingBox.y}, w=${v.boundingBox.w}, h=${v.boundingBox.h})`;
            })
            .join('\n');

        // Assign distinct colors per view
        const viewColors = ['#FF0000', '#00BFFF', '#FF8C00', '#9400D3', '#32CD32', '#FFD700'];
        const viewColorMap = input.confirmedViews.map((v, i) => ({
            id: v.id,
            label: v.label,
            color: viewColors[i % viewColors.length],
        }));
        const colorLegend = viewColorMap
            .map((vc) => `  - "${vc.label}" (id: "${vc.id}"): use strokeColor "${vc.color}"`)
            .join('\n');

        const systemPrompt = `You are analyzing a machinist technical drawing (print).

COORDINATE SYSTEM (CRITICAL):
- All coordinates use a normalized 0–1000 space.
- Origin (0,0) is the TOP-LEFT corner of the entire image.
- (1000, 1000) is the BOTTOM-RIGHT corner.
- All coordinates MUST be within 0–1000 inclusive.
- Box validity: w > 0, h > 0, x + w <= 1000, y + h <= 1000.

STEP 1 RESULTS (confirmed by user):
The following views were detected:
${viewList}

YOUR TASK — Step 2: Confirm Part Outline Envelopes in ALL Views.

For EACH view listed above, find the TIGHTEST bounding box that encompasses ONLY the physical part geometry within that view.

EXCLUDE: dimension lines, leader lines, extension lines, center lines, notes, tolerances, title block text, arrows, and any annotation that is not part of the physical geometry outline.
INCLUDE: only the solid outline of the physical part itself.

Each envelope box MUST be fully inside its corresponding view bounding box.
Use normalized 0–1000 global coordinates (NOT local coordinates relative to the view).

Assign each view's envelope a different stroke color:
${colorLegend}

Return your answer as a JSON object:
{
  "proposalData": {
    "boxes": [
      { "x": <number>, "y": <number>, "w": <number>, "h": <number>, "label": "<view label> Envelope", "strokeColor": "<color>" }
    ],
    "lines": [],
    "points": [],
    "arrows": []
  },
  "overlay": {
    "boxes": [
      { "x": <number>, "y": <number>, "w": <number>, "h": <number>, "label": "<view label> Envelope", "strokeColor": "<color>" }
    ],
    "lines": [],
    "points": [],
    "arrows": []
  },
  "question": "Do these boxes accurately capture the part outline in each view?"
}

Return one envelope box per view. The proposalData and overlay should contain the SAME boxes.
Do NOT include a cropWindow — the user needs to see ALL views at once.
The "question" field MUST be exactly: "Do these boxes accurately capture the part outline in each view?"`;

        const rejectionNote = input.rejectionFeedback
            ? `\n\nThe user rejected your previous proposal. Their feedback: "${input.rejectionFeedback}". Try again with a revised answer.`
            : '';

        const { output } = await ai.generate({
            model: 'googleai/gemini-3-flash-preview',
            config: {
                thinkingConfig: { thinkingLevel: 'MINIMAL' },
            },
            output: { schema: Step2OutputSchema },
            prompt: [
                {
                    media: { url: input.fileUri, contentType: input.mimeType ?? 'image/png' },
                    metadata: { mediaResolution: { level: 'MEDIA_RESOLUTION_MEDIUM' } },
                },
                { text: systemPrompt + rejectionNote },
            ],
        });

        if (!output) {
            throw new Error('No output from orientationFlowStep2_ConfirmEnvelope');
        }

        return {
            ...output,
            question: 'Do these boxes accurately capture the part outline in each view?',
            cropWindow: null, // No zoom — show all views
        };
    }
);
