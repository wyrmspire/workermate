import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mode';
import { MOCK_STEP_1 } from '@/lib/mocks';

export async function POST(req: NextRequest) {
    let body: { fileUri: string; rejectionFeedback?: string };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.fileUri) {
        return NextResponse.json({ error: 'Missing required field: fileUri' }, { status: 400 });
    }

    if (isMockMode()) {
        return NextResponse.json(MOCK_STEP_1);
    }

    try {
        const { orientationFlowStep1_DetectViews } = await import('@/agent/orientationFlowStep1_DetectViews');
        const result = await orientationFlowStep1_DetectViews({
            fileUri: body.fileUri,
            rejectionFeedback: body.rejectionFeedback,
        });
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Flow execution failed', details: message }, { status: 500 });
    }
}
