import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mode';
import { MOCK_STEP_2 } from '@/lib/mocks';
import { ViewLayout } from '@/lib/schemas';

export async function POST(req: NextRequest) {
    let body: { fileUri: string; confirmedViews: ViewLayout[]; rejectionFeedback?: string };

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

    if (isMockMode()) {
        return NextResponse.json(MOCK_STEP_2);
    }

    try {
        const { orientationFlowStep2_ConfirmEnvelope } = await import('@/agent/orientationFlowStep2_ConfirmEnvelope');
        const result = await orientationFlowStep2_ConfirmEnvelope({
            fileUri: body.fileUri,
            confirmedViews: body.confirmedViews,
            rejectionFeedback: body.rejectionFeedback,
        });
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Flow execution failed', details: message }, { status: 500 });
    }
}
