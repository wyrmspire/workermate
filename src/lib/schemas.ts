import { z } from 'zod';

export const BoxSchema = z.object({
    x: z.number().min(0).max(1000),
    y: z.number().min(0).max(1000),
    w: z.number().min(0).max(1000),
    h: z.number().min(0).max(1000),
    label: z.string().optional(),
    strokeColor: z.string().optional()
});

export const LineSchema = z.object({
    x1: z.number().min(0).max(1000),
    y1: z.number().min(0).max(1000),
    x2: z.number().min(0).max(1000),
    y2: z.number().min(0).max(1000),
    label: z.string().optional(),
    strokeColor: z.string().optional()
});

export const PointSchema = z.object({
    x: z.number().min(0).max(1000),
    y: z.number().min(0).max(1000),
    label: z.string().optional(),
    color: z.string().optional()
});

export const ArrowSchema = z.object({
    fromX: z.number().min(0).max(1000),
    fromY: z.number().min(0).max(1000),
    toX: z.number().min(0).max(1000),
    toY: z.number().min(0).max(1000),
    label: z.string().optional(),
    strokeColor: z.string().optional()
});

export const OverlaySpecSchema = z.object({
    boxes: z.array(BoxSchema),
    lines: z.array(LineSchema),
    points: z.array(PointSchema),
    arrows: z.array(ArrowSchema)
});

export const ViewLayoutSchema = z.object({
    id: z.string(),
    label: z.string(),
    isPrimary: z.boolean(),
    boundingBox: z.object({
        x: z.number().min(0).max(1000),
        y: z.number().min(0).max(1000),
        w: z.number().min(0).max(1000),
        h: z.number().min(0).max(1000)
    })
});

export const DimensionProposalSchema = z.object({
    value: z.number(),
    unit: z.enum(['mm', 'in']),
    sourceViewId: z.string(),
    confidence: z.number().min(0).max(1)
});

export const DatumProposalSchema = z.object({
    primaryFace: z.enum(['top', 'front', 'right', 'left', 'bottom', 'back']),
    axisLabels: z.object({
        x: z.enum(['L', 'W', 'D']),
        y: z.enum(['L', 'W', 'D']),
        z: z.enum(['L', 'W', 'D'])
    })
});

export const OrientationStepResultSchema = z.object({
    proposalData: z.any(),
    overlay: OverlaySpecSchema,
    question: z.string(),
    cropWindow: z.object({
        x: z.number().min(0).max(1000),
        y: z.number().min(0).max(1000),
        w: z.number().min(0).max(1000),
        h: z.number().min(0).max(1000)
    }).optional()
});

export const WizardStateSchema = z.enum([
    'IDLE',
    'UPLOADED',
    'ORIENT_STEP_1',
    'ORIENT_STEP_2',
    'ORIENT_STEP_3',
    'ORIENT_STEP_4',
    'ORIENT_STEP_5',
    'ORIENT_LOCKED'
]);

// Inferred Types
export type OverlaySpec = z.infer<typeof OverlaySpecSchema>;
export type ViewLayout = z.infer<typeof ViewLayoutSchema>;
export type DimensionProposal = z.infer<typeof DimensionProposalSchema>;
export type DatumProposal = z.infer<typeof DatumProposalSchema>;
export type OrientationStepResult = z.infer<typeof OrientationStepResultSchema>;
export type WizardState = z.infer<typeof WizardStateSchema>;
