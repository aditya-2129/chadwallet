import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-muted transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to ChadWallet
        </Link>
        <div className="mb-10 flex items-center gap-3">
          <Image
            src="/brand/logo-dark.png"
            width={48}
            height={48}
            alt=""
            className="rounded-xl"
          />
          <span className="text-xl font-bold">ChadWallet</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-muted">Last updated: {updated}</p>
        <article className="mt-12 space-y-8 text-[15px] leading-7 text-[#aebbd0] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_p]:mt-3">
          {children}
        </article>
      </div>
    </main>
  );
}
