import {
    WizardState,
    ViewLayout,
    OverlaySpec,
    DimensionProposal,
    DatumProposal
} from './schemas';

export interface OrientationSession {
    fileUri: string;
    mimeType?: string;
    currentState: WizardState;

    // Accumulated truth:
    confirmedViews?: ViewLayout[];
    confirmedEnvelope?: OverlaySpec;
    confirmedLW?: { length: DimensionProposal; width: DimensionProposal };
    confirmedDepth?: DimensionProposal;
    lockedDatum?: DatumProposal;
}

export interface StepInput {
    fileUri: string;
    rejectionFeedback?: string;
}

export interface Step2Input extends StepInput {
    confirmedViews: ViewLayout[];
}

export interface Step3Input extends StepInput {
    confirmedViews: ViewLayout[];
    confirmedEnvelope: OverlaySpec;
}

export interface Step4Input extends StepInput {
    confirmedViews: ViewLayout[];
    confirmedLW: { length: DimensionProposal; width: DimensionProposal };
}

export interface Step5Input extends StepInput {
    confirmedViews: ViewLayout[];
    confirmedLW: { length: DimensionProposal; width: DimensionProposal };
    confirmedDepth: DimensionProposal;
}
