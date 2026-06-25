import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-chad-green">
          404 / token not found
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em]">
          This signal went cold.
        </h1>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-background"
        >
          <ArrowLeft className="size-4" />
          Back home
        </Link>
      </div>
    </main>
  );
}
