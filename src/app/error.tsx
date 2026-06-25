"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-12 text-chad-red" />
        <h1 className="mt-6 text-3xl font-semibold">Market signal interrupted</h1>
        <p className="mt-3 text-muted">
          ChadWallet could not finish loading this view. Your wallet and funds
          are unaffected.
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-background"
        >
          <RotateCcw className="size-4" />
          Try again
        </button>
      </div>
    </main>
  );
}
