import type { Metadata } from 'next';
import WizardContainer from '@/components/WizardContainer';

export const metadata: Metadata = {
  title: 'WorkerMate — Print Analyzer',
  description:
    'AI-powered machinist print orientation wizard. Upload a print and let Gemini identify views, dimensions, and datum.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl select-none">⚙️</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">
              Worker<span className="text-sky-400">Mate</span>
            </h1>
          </div>
          <p className="text-sm text-zinc-400 max-w-md">
            Orientation Wizard — Upload a machinist print and confirm each step to lock in
            Length, Width, Depth, and datum.
          </p>
        </header>

        {/* Wizard */}
        <main>
          <WizardContainer />
        </main>
      </div>
    </div>
  );
}
