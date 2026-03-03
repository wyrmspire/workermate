import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mode';
import { MOCK_STEP_5 } from '@/lib/mocks';
import { ViewLayout, DimensionProposal } from '@/lib/schemas';

export async function POST(req: NextRequest) {
    let body: {
        fileUri: string;
        mimeType?: string;
        confirmedViews: ViewLayout[];
        confirmedLW: { length: DimensionProposal; width: DimensionProposal };
        confirmedDepth: DimensionProposal;
        rejectionFeedback?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.fileUri) {
        return NextResponse.json({ error: 'Missing required field: fileUri' }, { status: 400 });
    }
    if (!body.confirmedViews || body.confirmedViews.length === 0) {
        return NextResponse.json({ error: 'Missing or empty required field: confirmedViews' }, { status: 400 });
    }
    if (!body.confirmedLW?.length || !body.confirmedLW?.width) {
        return NextResponse.json({ error: 'Missing required field: confirmedLW' }, { status: 400 });
    }
    if (!body.confirmedDepth) {
        return NextResponse.json({ error: 'Missing required field: confirmedDepth' }, { status: 400 });
    }

    if (isMockMode()) {
        return NextResponse.json(MOCK_STEP_5);
    }

    try {
        const { orientationFlowStep5_FinalSummary } = await import('@/agent/orientationFlowStep5_FinalSummary');
        const result = await orientationFlowStep5_FinalSummary({
            fileUri: body.fileUri,
            mimeType: body.mimeType,
            confirmedViews: body.confirmedViews,
            confirmedLW: body.confirmedLW,
            confirmedDepth: body.confirmedDepth,
            rejectionFeedback: body.rejectionFeedback,
        });
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Flow execution failed', details: message }, { status: 500 });
    }
}
