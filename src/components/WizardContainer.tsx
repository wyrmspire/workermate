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
    /** Local blob URL for display — separate from fileUri (Google Files API ref) */
    imageSrc: string | null;
    /** Last API result, used to commit proposalData on "Yes" */
    lastResult: OrientationStepResult | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: WizardUIState = {
    session: { fileUri: '', currentState: 'IDLE' },
    imageSrc: null,
    lastResult: null,
    isLoading: false,
    error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
    | { type: 'UPLOAD_START' }
    | { type: 'UPLOAD_SUCCESS'; imageSrc: string; fileUri: string }
    | { type: 'STEP_START' }
    | { type: 'STEP_RESULT'; result: OrientationStepResult }
    | { type: 'ADVANCE_TO_STEP_1' }         // UPLOADED → ORIENT_STEP_1
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

        case 'STEP_RESULT':
            return { ...state, isLoading: false, lastResult: action.result };

        case 'ADVANCE_TO_STEP_1':
            return {
                ...state,
                session: { ...state.session, currentState: 'ORIENT_STEP_1' },
            };

        case 'CONFIRM_STEP_1':
            return {
                ...state,
                lastResult: null,
                session: {
                    ...state.session,
                    confirmedViews: action.views,
                    currentState: 'ORIENT_STEP_2',
                },
            };

        case 'CONFIRM_STEP_2':
            return {
                ...state,
                lastResult: null,
                session: {
                    ...state.session,
                    confirmedEnvelope: action.envelope,
                    currentState: 'ORIENT_STEP_3',
                },
            };

        case 'CONFIRM_STEP_3':
            return {
                ...state,
                lastResult: null,
                session: {
                    ...state.session,
                    confirmedLW: { length: action.length, width: action.width },
                    currentState: 'ORIENT_STEP_4',
                },
            };

        case 'CONFIRM_STEP_4':
            return {
                ...state,
                lastResult: null,
                session: {
                    ...state.session,
                    confirmedDepth: action.depth,
                    currentState: 'ORIENT_STEP_5',
                },
            };

        case 'CONFIRM_STEP_5':
            return {
                ...state,
                lastResult: null,
                session: {
                    ...state.session,
                    lockedDatum: action.datum,
                    currentState: 'ORIENT_LOCKED',
                },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStepNumber(state: WizardState): number {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function WizardContainer() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const { session, imageSrc, lastResult, isLoading, error } = state;
    const wizardState = session.currentState;
    const currentStep = getStepNumber(wizardState);

    // ── Step API call ──────────────────────────────────────────────────────

    const callStep = useCallback(
        async (stepNum: number, fileUri: string, currentSession: OrientationSession, rejectionFeedback?: string) => {
            dispatch({ type: 'STEP_START' });
            try {
                const body: Record<string, unknown> = {
                    fileUri,
                    ...(rejectionFeedback ? { rejectionFeedback } : {}),
                };
                if (stepNum >= 2 && currentSession.confirmedViews)
                    body.confirmedViews = currentSession.confirmedViews;
                if (stepNum >= 3 && currentSession.confirmedEnvelope)
                    body.confirmedEnvelope = currentSession.confirmedEnvelope;
                if (stepNum >= 4 && currentSession.confirmedLW)
                    body.confirmedLW = currentSession.confirmedLW;
                if (stepNum >= 5 && currentSession.confirmedDepth)
                    body.confirmedDepth = currentSession.confirmedDepth;

                const res = await fetch(`/api/wizard/step-${stepNum}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error ?? `Step ${stepNum} failed (${res.status})`);
                }

                const result: OrientationStepResult = await res.json();
                dispatch({ type: 'STEP_RESULT', result });
                return result;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                dispatch({ type: 'SET_ERROR', message: msg });
                return null;
            }
        },
        []
    );

    // ── Upload ────────────────────────────────────────────────────────────────

    const handleFile = useCallback(
        async (file: File) => {
            // Validate type
            const validTypes = ['image/png', 'image/jpeg', 'image/tiff', 'application/pdf'];
            if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|tif{1,2}|pdf)$/i)) {
                dispatch({ type: 'SET_ERROR', message: 'Unsupported file type. Please upload PNG, JPG, TIFF, or PDF.' });
                return;
            }
            if (file.size > 20 * 1024 * 1024) {
                dispatch({ type: 'SET_ERROR', message: 'File exceeds the 20 MB limit.' });
                return;
            }
            dispatch({ type: 'CLEAR_ERROR' });
            const blobUrl = URL.createObjectURL(file);
            dispatch({ type: 'UPLOAD_START' });

            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    URL.revokeObjectURL(blobUrl);
                    throw new Error(err.error ?? `Upload failed (${res.status})`);
                }
                const { fileUri } = await res.json();
                dispatch({ type: 'UPLOAD_SUCCESS', imageSrc: blobUrl, fileUri });
                dispatch({ type: 'ADVANCE_TO_STEP_1' });

                // Auto kick off step 1 with the fresh fileUri
                const stepSession: OrientationSession = { fileUri, currentState: 'ORIENT_STEP_1' };
                await callStep(1, fileUri, stepSession);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                dispatch({ type: 'SET_ERROR', message: msg });
            }
        },
        [callStep]
    );

    // ── Drag & drop ────────────────────────────────────────────────────────────

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
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }

    // ── Confirm / Reject handlers ────────────────────────────────────────────

    async function handleConfirm() {
        if (!lastResult) return;
        const data = lastResult.proposalData;

        switch (wizardState) {
            case 'ORIENT_STEP_1': {
                const views = Array.isArray(data) ? (data as ViewLayout[]) : [];
                dispatch({ type: 'CONFIRM_STEP_1', views });
                const nextSession: OrientationSession = {
                    ...session,
                    confirmedViews: views,
                    currentState: 'ORIENT_STEP_2',
                };
                await callStep(2, session.fileUri, nextSession);
                break;
            }
            case 'ORIENT_STEP_2': {
                const envelope = data as OverlaySpec;
                dispatch({ type: 'CONFIRM_STEP_2', envelope });
                const nextSession: OrientationSession = {
                    ...session,
                    confirmedEnvelope: envelope,
                    currentState: 'ORIENT_STEP_3',
                };
                await callStep(3, session.fileUri, nextSession);
                break;
            }
            case 'ORIENT_STEP_3': {
                const { length, width } = data as { length: DimensionProposal; width: DimensionProposal };
                dispatch({ type: 'CONFIRM_STEP_3', length, width });
                const nextSession: OrientationSession = {
                    ...session,
                    confirmedLW: { length, width },
                    currentState: 'ORIENT_STEP_4',
                };
                await callStep(4, session.fileUri, nextSession);
                break;
            }
            case 'ORIENT_STEP_4': {
                const depth = data as DimensionProposal;
                dispatch({ type: 'CONFIRM_STEP_4', depth });
                const nextSession: OrientationSession = {
                    ...session,
                    confirmedDepth: depth,
                    currentState: 'ORIENT_STEP_5',
                };
                await callStep(5, session.fileUri, nextSession);
                break;
            }
            case 'ORIENT_STEP_5': {
                const datum = data as DatumProposal;
                dispatch({ type: 'CONFIRM_STEP_5', datum });
                break;
            }
        }
    }

    async function handleReject(feedback: string) {
        // Same step re-runs — state does NOT advance
        await callStep(currentStep, session.fileUri, session, feedback);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    // ── ORIENT_LOCKED ─────────────────────────────────────────────────────────
    if (wizardState === 'ORIENT_LOCKED') {
        const lw = session.confirmedLW;
        const depth = session.confirmedDepth;
        const datum = session.lockedDatum;
        return (
            <div className="flex flex-col items-center gap-8 w-full">
                <StepHistory currentStep={6} confirmedFacts={session} />
                <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-emerald-900/10 p-10 text-center shadow-2xl">
                    <div className="text-6xl mb-4">🎯</div>
                    <h2 className="text-2xl font-bold text-emerald-400 mb-1">Orientation Locked</h2>
                    <p className="text-zinc-500 text-sm mb-8">All three dimensions and datum confirmed.</p>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <DimCard label="Length" value={lw ? `${lw.length.value} ${lw.length.unit}` : '—'} color="sky" />
                        <DimCard label="Width" value={lw ? `${lw.width.value} ${lw.width.unit}` : '—'} color="violet" />
                        <DimCard label="Depth" value={depth ? `${depth.value} ${depth.unit}` : '—'} color="amber" />
                    </div>

                    {datum && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-6 py-4 text-sm text-zinc-300 mb-8">
                            <span className="font-semibold text-zinc-100">Primary datum face: </span>
                            <span className="capitalize text-emerald-400 font-bold">{datum.primaryFace}</span>
                            <span className="mx-3 text-zinc-600">·</span>
                            <span className="font-semibold text-zinc-100">Axis map: </span>
                            X→<span className="text-sky-400 font-bold">{datum.axisLabels.x}</span>{' '}
                            Y→<span className="text-violet-400 font-bold">{datum.axisLabels.y}</span>{' '}
                            Z→<span className="text-amber-400 font-bold">{datum.axisLabels.z}</span>
                        </div>
                    )}

                    <button
                        onClick={() => dispatch({ type: 'RESET' })}
                        className="rounded-lg bg-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-600 transition-colors active:scale-95"
                    >
                        ↺ Start Over
                    </button>
                </div>
            </div>
        );
    }

    // ── IDLE (and UPLOADED transitioning to step 1) — show upload dropzone ───
    if (wizardState === 'IDLE' || (wizardState === 'UPLOADED' && !lastResult)) {
        return (
            <div className="flex flex-col items-center gap-8 w-full">
                {error && <ErrorBanner message={error} onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })} />}

                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-zinc-400">
                        <svg className="h-12 w-12 animate-spin text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        <p className="text-sm">Uploading and sending to Gemini…</p>
                    </div>
                ) : (
                    <div
                        ref={dropZoneRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex w-full max-w-xl cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-zinc-600 bg-zinc-900/40 px-10 py-20 text-center transition-all hover:border-sky-500 hover:bg-sky-900/10 select-none"
                    >
                        <div className="flex h-18 w-18 items-center justify-center rounded-full bg-zinc-800 text-4xl group-hover:scale-110 transition-transform duration-200">
                            📐
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-zinc-100 mb-1">Drop your print here</p>
                            <p className="text-sm text-zinc-400">PNG · JPG · TIFF · PDF — max 20 MB</p>
                        </div>
                        <span className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white group-hover:bg-sky-500 transition-colors">
                            Choose File
                        </span>
                        <input
                            ref={fileInputRef}
                            id="file-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/tiff,.pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                                // Reset so same file can be re-selected
                                e.target.value = '';
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // ── Active step (ORIENT_STEP_1 through ORIENT_STEP_5) ────────────────────
    return (
        <div className="flex w-full gap-6 flex-col lg:flex-row lg:items-start">
            {/* Sidebar: step history */}
            <aside className="w-full lg:w-60 lg:shrink-0">
                <StepHistory currentStep={currentStep} confirmedFacts={session} />
            </aside>

            {/* Main area */}
            <div className="flex flex-1 flex-col gap-4 min-w-0">
                {error && <ErrorBanner message={error} onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })} />}

                {/* Image with overlay */}
                {imageSrc && lastResult && (
                    <ImageOverlay
                        imageSrc={imageSrc}
                        overlay={lastResult.overlay}
                        cropWindow={lastResult.cropWindow}
                    />
                )}

                {/* Image loading (waiting for first result after upload) */}
                {imageSrc && isLoading && !lastResult && (
                    <div className="relative w-full rounded-lg overflow-hidden bg-zinc-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageSrc} alt="Machinist print" className="block w-full h-auto opacity-40" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                            <svg className="h-10 w-10 animate-spin text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                            </svg>
                            <p className="text-sm">Gemini is analyzing…</p>
                        </div>
                    </div>
                )}

                {/* Yes/No panel */}
                {lastResult && (
                    <YesNoPanel
                        question={lastResult.question}
                        isLoading={isLoading}
                        onConfirm={handleConfirm}
                        onReject={handleReject}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DimCard({ label, value, color }: { label: string; value: string; color: string }) {
    const classes: Record<string, string> = {
        sky: 'border-sky-700/40 bg-sky-900/20 text-sky-300',
        violet: 'border-violet-700/40 bg-violet-900/20 text-violet-300',
        amber: 'border-amber-700/40 bg-amber-900/20 text-amber-300',
    };
    return (
        <div className={`rounded-xl border p-4 ${classes[color] ?? ''}`}>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-1">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-rose-700/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
            <span className="text-base shrink-0">⚠️</span>
            <span className="flex-1">{message}</span>
            <button
                onClick={onDismiss}
                className="shrink-0 text-rose-400 hover:text-rose-200 font-bold leading-none"
                aria-label="Dismiss error"
            >
                ✕
            </button>
        </div>
    );
}
