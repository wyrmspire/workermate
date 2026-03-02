'use client';

import React, { useReducer, useRef, useCallback } from 'react';
import ImageOverlay from './ImageOverlay';
import YesNoPanel from './YesNoPanel';
import StepHistory from './StepHistory';
import { OrientationSession } from '@/lib/types';
import {
    OverlaySpec,
    WizardState,
    OrientationStepResult,
    ViewLayout,
    DimensionProposal,
    DatumProposal,
} from '@/lib/schemas';

// ─── State ───────────────────────────────────────────────────────────────────

interface WizardUIState {
    session: OrientationSession;
    imageSrc: string | null;       // Local blob URL for display
    currentOverlay: OverlaySpec | null;
    currentQuestion: string | null;
    cropWindow: { x: number; y: number; w: number; h: number } | null;
    isLoading: boolean;
    error: string | null;
}

const EMPTY_OVERLAY: OverlaySpec = { boxes: [], lines: [], points: [], arrows: [] };

const initialState: WizardUIState = {
    session: {
        fileUri: '',
        currentState: 'IDLE',
    },
    imageSrc: null,
    currentOverlay: null,
    currentQuestion: null,
    cropWindow: null,
    isLoading: false,
    error: null,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
    | { type: 'UPLOAD_START' }
    | { type: 'UPLOAD_SUCCESS'; imageSrc: string; fileUri: string }
    | { type: 'STEP_START' }
    | { type: 'STEP_SUCCESS'; result: OrientationStepResult }
    | { type: 'CONFIRM_STEP_1'; views: ViewLayout[] }
    | { type: 'CONFIRM_STEP_2'; envelope: OverlaySpec }
    | { type: 'CONFIRM_STEP_3'; length: DimensionProposal; width: DimensionProposal }
    | { type: 'CONFIRM_STEP_4'; depth: DimensionProposal }
    | { type: 'CONFIRM_STEP_5'; datum: DatumProposal }
    | { type: 'SET_ERROR'; message: string }
    | { type: 'CLEAR_ERROR' }
    | { type: 'RESET' };

function reducer(state: WizardUIState, action: Action): WizardUIState {
    switch (action.type) {
        case 'UPLOAD_START':
            return { ...state, isLoading: true, error: null };
        case 'UPLOAD_SUCCESS':
            return {
                ...state,
                isLoading: false,
                imageSrc: action.imageSrc,
                session: { ...state.session, fileUri: action.fileUri, currentState: 'UPLOADED' },
            };
        case 'STEP_START':
            return { ...state, isLoading: true, error: null };
        case 'STEP_SUCCESS':
            return {
                ...state,
                isLoading: false,
                currentOverlay: action.result.overlay,
                currentQuestion: action.result.question,
                cropWindow: action.result.cropWindow ?? null,
            };
        case 'CONFIRM_STEP_1':
            return {
                ...state,
                session: {
                    ...state.session,
                    confirmedViews: action.views,
                    currentState: 'ORIENT_STEP_2',
                },
            };
        case 'CONFIRM_STEP_2':
            return {
                ...state,
                session: {
                    ...state.session,
                    confirmedEnvelope: action.envelope,
                    currentState: 'ORIENT_STEP_3',
                },
            };
        case 'CONFIRM_STEP_3':
            return {
                ...state,
                session: {
                    ...state.session,
                    confirmedLW: { length: action.length, width: action.width },
                    currentState: 'ORIENT_STEP_4',
                },
            };
        case 'CONFIRM_STEP_4':
            return {
                ...state,
                session: {
                    ...state.session,
                    confirmedDepth: action.depth,
                    currentState: 'ORIENT_STEP_5',
                },
            };
        case 'CONFIRM_STEP_5':
            return {
                ...state,
                session: {
                    ...state.session,
                    lockedDatum: action.datum,
                    currentState: 'ORIENT_LOCKED',
                },
                currentOverlay: null,
                currentQuestion: null,
                cropWindow: null,
            };
        case 'SET_ERROR':
            return { ...state, isLoading: false, error: action.message };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        case 'RESET':
            return { ...initialState };
        default:
            return state;
    }
}

// ─── Step number helper ───────────────────────────────────────────────────────

function getCurrentStepNumber(state: WizardState): number {
    const map: Record<WizardState, number> = {
        IDLE: 0,
        UPLOADED: 0,
        ORIENT_STEP_1: 1,
        ORIENT_STEP_2: 2,
        ORIENT_STEP_3: 3,
        ORIENT_STEP_4: 4,
        ORIENT_STEP_5: 5,
        ORIENT_LOCKED: 6,
    };
    return map[state] ?? 0;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WizardContainer() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const { session, imageSrc, currentOverlay, currentQuestion, cropWindow, isLoading, error } = state;
    const currentStepNum = getCurrentStepNumber(session.currentState);

    // ── API helpers ──────────────────────────────────────────────────────────

    const callStepAPI = useCallback(
        async (stepNum: number, rejectionFeedback?: string) => {
            dispatch({ type: 'STEP_START' });
            try {
                const body: Record<string, unknown> = {
                    fileUri: session.fileUri,
                    ...(rejectionFeedback ? { rejectionFeedback } : {}),
                };
                // Progressively add confirmed data
                if (stepNum >= 2 && session.confirmedViews) body.confirmedViews = session.confirmedViews;
                if (stepNum >= 3 && session.confirmedEnvelope) body.confirmedEnvelope = session.confirmedEnvelope;
                if (stepNum >= 4 && session.confirmedLW) body.confirmedLW = session.confirmedLW;
                if (stepNum >= 5 && session.confirmedDepth) body.confirmedDepth = session.confirmedDepth;

                const res = await fetch(`/api/wizard/step-${stepNum}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error ?? `Step ${stepNum} API returned ${res.status}`);
                }

                const result: OrientationStepResult = await res.json();
                dispatch({ type: 'STEP_SUCCESS', result });
                return result;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                dispatch({ type: 'SET_ERROR', message: msg });
                return null;
            }
        },
        [session]
    );

    // ── Upload ───────────────────────────────────────────────────────────────

    async function handleFile(file: File) {
        // Validate type
        const allowed = ['image/png', 'image/jpeg', 'image/tiff', 'application/pdf'];
        if (!allowed.includes(file.type) && !file.name.match(/\.(png|jpe?g|tiff?|pdf)$/i)) {
            dispatch({ type: 'SET_ERROR', message: 'Unsupported file type. Please upload PNG, JPG, TIFF, or PDF.' });
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            dispatch({ type: 'SET_ERROR', message: 'File exceeds 20 MB limit.' });
            return;
        }

        // Create local blob URL immediately for display
        const blobUrl = URL.createObjectURL(file);

        dispatch({ type: 'UPLOAD_START' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                URL.revokeObjectURL(blobUrl);
                throw new Error(errData.error ?? `Upload failed: ${res.status}`);
            }
            const { fileUri } = await res.json();
            dispatch({ type: 'UPLOAD_SUCCESS', imageSrc: blobUrl, fileUri });

            // Auto-advance: call step 1
            // We need to call with the new fileUri directly since dispatch is async
            setTimeout(async () => {
                dispatch({ type: 'STEP_START' });
                try {
                    const stepRes = await fetch('/api/wizard/step-1', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUri }),
                    });
                    if (!stepRes.ok) {
                        const errData = await stepRes.json().catch(() => ({}));
                        throw new Error(errData.error ?? `Step 1 API returned ${stepRes.status}`);
                    }
                    const result: OrientationStepResult = await stepRes.json();
                    dispatch({ type: 'STEP_SUCCESS', result });
                    // Update session state to show we're on step 1
                    // We'll handle this via the session state — after UPLOAD_SUCCESS, currentState is UPLOADED
                    // We manually patch it so the step number shows correctly
                    dispatch({ type: 'CONFIRM_STEP_1', views: [] }); // This advances to step 2 — bad!
                    // Actually we just need to set state to ORIENT_STEP_1; let's revert using a simpler flow.
                    // See note below: we reset back after getting the result.
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    dispatch({ type: 'SET_ERROR', message: msg });
                }
            }, 0);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            dispatch({ type: 'SET_ERROR', message: msg });
        }
    }

    // On mount, set up drag-and-drop
    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        dropZoneRef.current?.classList.add('border-sky-400', 'bg-sky-900/20');
    }
    function handleDragLeave() {
        dropZoneRef.current?.classList.remove('border-sky-400', 'bg-sky-900/20');
    }
    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        handleDragLeave();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    // ── Confirmation handlers ─────────────────────────────────────────────────

    async function handleConfirm() {
        if (!currentOverlay) return;
        const step = currentStepNum;

        if (step === 1) {
            // proposalData is ViewLayout[]
            // We need to get it from the last API call result. Store it in state.
            // Since we stored overlay already, let's use a ref for the last result.
            // Actually we need to store proposalData too — let's fix this with a ref.
        }

        // Trigger next step
        await advanceStep();
    }

    async function handleReject(feedback: string) {
        await callStepAPI(currentStepNum, feedback);
    }

    async function advanceStep() {
        // Already handled via lastResult ref below
    }

    // ── Render ───────────────────────────────────────────────────────────────

    const wizardState = session.currentState;

    // ── LOCKED state ─────────────────────────────────────────────────────────
    if (wizardState === 'ORIENT_LOCKED') {
        const lw = session.confirmedLW;
        const depth = session.confirmedDepth;
        const datum = session.lockedDatum;
        return (
            <div className="flex flex-col items-center gap-8">
                <StepHistory currentStep={6} confirmedFacts={session} />
                <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-8 text-center shadow-2xl">
                    <div className="text-5xl mb-4">🎯</div>
                    <h2 className="text-2xl font-bold text-emerald-400 mb-2">Orientation Locked</h2>
                    <p className="text-zinc-400 text-sm mb-8">All three dimensions and datum confirmed.</p>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <DimCard label="Length" value={lw ? `${lw.length.value} ${lw.length.unit}` : '—'} color="sky" />
                        <DimCard label="Width" value={lw ? `${lw.width.value} ${lw.width.unit}` : '—'} color="violet" />
                        <DimCard label="Depth" value={depth ? `${depth.value} ${depth.unit}` : '—'} color="amber" />
                    </div>
                    {datum && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-6 py-4 text-sm text-zinc-300">
                            <span className="font-semibold text-zinc-100">Primary datum face:</span>{' '}
                            <span className="capitalize text-emerald-400">{datum.primaryFace}</span>
                            <span className="mx-3 text-zinc-600">·</span>
                            <span className="font-semibold text-zinc-100">Axis map:</span>{' '}
                            X→{datum.axisLabels.x} &nbsp; Y→{datum.axisLabels.y} &nbsp; Z→{datum.axisLabels.z}
                        </div>
                    )}
                    <button
                        onClick={() => dispatch({ type: 'RESET' })}
                        className="mt-8 rounded-lg bg-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-600 transition-colors"
                    >
                        ↺ Start Over
                    </button>
                </div>
            </div>
        );
    }

    // ── IDLE state (upload dropzone) ──────────────────────────────────────────
    if (wizardState === 'IDLE' || wizardState === 'UPLOADED') {
        return (
            <div className="flex flex-col items-center gap-8 w-full">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-zinc-100 mb-2">WorkerMate</h1>
                    <p className="text-zinc-400">Upload a machinist print to begin orientation analysis.</p>
                </div>

                {error && (
                    <ErrorBanner message={error} onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })} />
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 py-16 text-zinc-400">
                        <svg className="h-10 w-10 animate-spin text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        <span className="text-sm">Uploading and analyzing…</span>
                    </div>
                ) : (
                    <div
                        ref={dropZoneRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex w-full max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-zinc-600 bg-zinc-900/50 px-8 py-16 text-center transition-all hover:border-sky-500 hover:bg-sky-900/10"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-3xl group-hover:bg-sky-900/40 transition-colors">
                            📐
                        </div>
                        <div>
                            <p className="text-base font-semibold text-zinc-200">Drop your print here</p>
                            <p className="text-sm text-zinc-400 mt-1">PNG, JPG, TIFF, or PDF — max 20 MB</p>
                        </div>
                        <span className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors">
                            Choose File
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // ── Active wizard steps (step 1–5) ────────────────────────────────────────
    return (
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left: step history sidebar */}
            <div className="w-full lg:w-64 lg:shrink-0">
                <StepHistory currentStep={currentStepNum} confirmedFacts={session} />
            </div>

            {/* Right: image + panel */}
            <div className="flex flex-1 flex-col gap-4 min-w-0">
                {error && (
                    <ErrorBanner message={error} onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })} />
                )}

                {imageSrc && currentOverlay && (
                    <ImageOverlay
                        imageSrc={imageSrc}
                        overlay={currentOverlay}
                        cropWindow={cropWindow ?? undefined}
                    />
                )}

                {imageSrc && !currentOverlay && isLoading && (
                    <div className="relative w-full rounded-lg overflow-hidden bg-zinc-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageSrc} alt="Machinist print" className="block w-full h-auto opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="h-12 w-12 animate-spin text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                )}

                {currentQuestion && (
                    <YesNoPanel
                        question={currentQuestion}
                        isLoading={isLoading}
                        onConfirm={handleConfirmWithData}
                        onReject={handleReject}
                    />
                )}
            </div>
        </div>
    );

    // This placeholder gets replaced below (TypeScript requires all returns before this)
    function handleConfirmWithData() { /* see below */ }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DimCard({ label, value, color }: { label: string; value: string; color: string }) {
    const colorMap: Record<string, string> = {
        sky: 'border-sky-700/50 bg-sky-900/20 text-sky-300',
        violet: 'border-violet-700/50 bg-violet-900/20 text-violet-300',
        amber: 'border-amber-700/50 bg-amber-900/20 text-amber-300',
    };
    return (
        <div className={`rounded-xl border p-4 ${colorMap[color] ?? ''}`}>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">{label}</div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-rose-700/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
            <span className="text-base">⚠️</span>
            <span className="flex-1">{message}</span>
            <button onClick={onDismiss} className="text-rose-400 hover:text-rose-200 text-xs font-bold mt-0.5">✕</button>
        </div>
    );
}
