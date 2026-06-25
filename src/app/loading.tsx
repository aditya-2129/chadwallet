export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="relative size-14">
          <span className="absolute inset-0 rounded-full border border-chad-green/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-chad-green" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
          Reading Solana
        </p>
      </div>
    </main>
  );
}
