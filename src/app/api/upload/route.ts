import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { isMockMode } from '@/lib/mode';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'application/pdf'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
    // --- MOCK MODE ---
    if (isMockMode()) {
        return NextResponse.json({
            fileUri: 'mock://test-print.png',
            fileName: 'test-print.png',
            mimeType: 'image/png',
        });
    }

    // --- LIVE MODE ---
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'No file field found in form data' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
            { error: `Unsupported file type: ${file.type}. Allowed: png, jpg, jpeg, tiff, pdf` },
            { status: 400 }
        );
    }

    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
            { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max is 20MB.` },
            { status: 400 }
        );
    }

    // Write to temp file for upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = join(tmpdir(), `workermate-${Date.now()}-${file.name}`);

    try {
        await writeFile(tempPath, buffer);

        const { GoogleAIFileManager } = await import('@google/generative-ai/server');
        const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: file.type,
            displayName: file.name,
        });

        return NextResponse.json({
            fileUri: uploadResult.file.uri,
            fileName: uploadResult.file.displayName,
            mimeType: uploadResult.file.mimeType,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Upload failed', details: message }, { status: 500 });
    } finally {
        // Clean up temp file
        await unlink(tempPath).catch(() => { });
    }
}
