'use client';

import React, { useState } from 'react';

interface YesNoPanelProps {
    question: string;
    onConfirm: () => void;
    onReject: (feedback: string) => void;
    isLoading: boolean;
}

export default function YesNoPanel({ question, onConfirm, onReject, isLoading }: YesNoPanelProps) {
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');

    function handleNoClick() {
        setShowFeedback(true);
    }

    function handleSubmitFeedback() {
        onReject(feedbackText);
        setShowFeedback(false);
        setFeedbackText('');
    }

    function handleConfirm() {
        setShowFeedback(false);
        setFeedbackText('');
        onConfirm();
    }

    return (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl flex flex-col gap-5">
            {/* Question text */}
            <p className="text-base font-semibold text-zinc-100 leading-relaxed">
                {question}
            </p>

            {/* Buttons */}
            {!showFeedback && (
                <div className="flex gap-3">
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Spinner />
                        ) : (
                            <>
                                <span className="text-base">✓</span> Yes
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleNoClick}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-rose-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Spinner />
                        ) : (
                            <>
                                <span className="text-base">✗</span> No
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Feedback form (expanded on "No") */}
            {showFeedback && !isLoading && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-sm text-zinc-400 font-medium">
                        What was wrong? (optional — hit Submit to retry)
                    </label>
                    <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="e.g. The primary view is incorrect — that's the side view, not the front..."
                        rows={3}
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmitFeedback}
                            className="flex-1 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-500 active:scale-95"
                        >
                            Submit Feedback &amp; Retry
                        </button>
                        <button
                            onClick={() => setShowFeedback(false)}
                            className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-400 transition-all hover:border-zinc-400 hover:text-zinc-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Spinner />
                    <span>Analyzing print…</span>
                </div>
            )}
        </div>
    );
}

function Spinner() {
    return (
        <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    );
}
