import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mode';
import { MOCK_STEP_3 } from '@/lib/mocks';
import { ViewLayout, OverlaySpec } from '@/lib/schemas';

export async function POST(req: NextRequest) {
    let body: {
        fileUri: string;
        mimeType?: string;
        confirmedViews: ViewLayout[];
        confirmedEnvelope: OverlaySpec;
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
    if (!body.confirmedEnvelope) {
        return NextResponse.json({ error: 'Missing required field: confirmedEnvelope' }, { status: 400 });
    }

    if (isMockMode()) {
        return NextResponse.json(MOCK_STEP_3);
    }

    try {
        const { orientationFlowStep3_LockLW } = await import('@/agent/orientationFlowStep3_LockLW');
        const result = await orientationFlowStep3_LockLW({
            fileUri: body.fileUri,
            mimeType: body.mimeType,
            confirmedViews: body.confirmedViews,
            confirmedEnvelope: body.confirmedEnvelope,
            rejectionFeedback: body.rejectionFeedback,
        });
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Flow execution failed', details: message }, { status: 500 });
    }
}
