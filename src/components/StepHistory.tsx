'use client';

import React from 'react';
import { OrientationSession } from '@/lib/types';

interface StepHistoryProps {
    currentStep: number; // 1–5, or 0 = not started, 6 = locked
    confirmedFacts: Partial<OrientationSession>;
}

const STEP_LABELS = [
    'Detect Views',
    'Confirm Envelope',
    'Lock L/W',
    'Lock Depth',
    'Final Summary',
];

function getStepSummary(step: number, facts: Partial<OrientationSession>): string {
    switch (step) {
        case 1: {
            if (!facts.confirmedViews) return '';
            const count = facts.confirmedViews.length;
            const primary = facts.confirmedViews.find((v) => v.isPrimary);
            return `${count} view${count !== 1 ? 's' : ''} detected${primary ? `, "${primary.label}" primary` : ''}`;
        }
        case 2: {
            if (!facts.confirmedEnvelope) return '';
            const boxes = facts.confirmedEnvelope.boxes;
            if (boxes.length > 0) {
                const b = boxes[0];
                return `Envelope ${b.w.toFixed(0)}×${b.h.toFixed(0)} (0–1000 coords)`;
            }
            return 'Envelope confirmed';
        }
        case 3: {
            if (!facts.confirmedLW) return '';
            const { length, width } = facts.confirmedLW;
            return `L: ${length.value}${length.unit}, W: ${width.value}${width.unit}`;
        }
        case 4: {
            if (!facts.confirmedDepth) return '';
            const d = facts.confirmedDepth;
            return `D: ${d.value}${d.unit} (from ${d.sourceViewId})`;
        }
        case 5: {
            if (!facts.lockedDatum) return '';
            const datum = facts.lockedDatum;
            return `Datum: ${datum.primaryFace} face · X=${datum.axisLabels.x} Y=${datum.axisLabels.y} Z=${datum.axisLabels.z}`;
        }
        default:
            return '';
    }
}

export default function StepHistory({ currentStep, confirmedFacts }: StepHistoryProps) {
    return (
        <div className="w-full">
            {/* Mobile: compact numbered pills */}
            <div className="flex items-center gap-0 sm:hidden">
                {STEP_LABELS.map((label, idx) => {
                    const step = idx + 1;
                    const done = step < currentStep || currentStep === 6;
                    const active = step === currentStep;
                    return (
                        <React.Fragment key={step}>
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-all ${done
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : active
                                            ? 'border-sky-400 bg-sky-400/20 text-sky-300 animate-pulse'
                                            : 'border-zinc-600 bg-zinc-800 text-zinc-500'
                                    }`}
                                title={`Step ${step}: ${label}`}
                            >
                                {done ? '✓' : step}
                            </div>
                            {idx < 4 && (
                                <div
                                    className={`h-0.5 flex-1 transition-colors ${done ? 'bg-emerald-500' : 'bg-zinc-700'
                                        }`}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Desktop: full breadcrumb */}
            <div className="hidden sm:flex flex-col gap-1.5">
                {STEP_LABELS.map((label, idx) => {
                    const step = idx + 1;
                    const done = step < currentStep || currentStep === 6;
                    const active = step === currentStep;
                    const summary = done ? getStepSummary(step, confirmedFacts) : '';

                    return (
                        <div
                            key={step}
                            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all ${active
                                    ? 'bg-sky-900/40 border border-sky-500/40'
                                    : done
                                        ? 'bg-emerald-900/20 border border-emerald-700/30'
                                        : 'bg-zinc-800/40 border border-transparent'
                                }`}
                        >
                            {/* Step circle */}
                            <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${done
                                        ? 'bg-emerald-500 text-white'
                                        : active
                                            ? 'bg-sky-500 text-white ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-900 animate-pulse'
                                            : 'bg-zinc-700 text-zinc-400'
                                    }`}
                            >
                                {done ? '✓' : step}
                            </div>

                            {/* Label + summary */}
                            <div className="min-w-0 flex-1">
                                <span
                                    className={`block text-sm font-semibold truncate ${active
                                            ? 'text-sky-300'
                                            : done
                                                ? 'text-emerald-400'
                                                : 'text-zinc-500'
                                        }`}
                                >
                                    {label}
                                </span>
                                {summary && (
                                    <span className="block text-xs text-zinc-400 truncate mt-0.5">
                                        {summary}
                                    </span>
                                )}
                            </div>

                            {/* Status badge */}
                            {active && (
                                <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-300 border border-sky-500/30">
                                    In Progress
                                </span>
                            )}
                            {done && (
                                <span className="shrink-0 text-emerald-500 text-base">✓</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
