import { cn } from "@/lib/utils";

const gradients = [
  "from-[#20e982] to-[#2697f3]",
  "from-[#f6b73c] to-[#ff4b55]",
  "from-[#8b5cf6] to-[#2697f3]",
  "from-[#83e0c4] to-[#20e982]",
  "from-[#ff4b55] to-[#8b5cf6]",
];

export function TokenAvatar({
  symbol,
  imageUrl,
  className,
}: {
  symbol: string;
  imageUrl?: string;
  className?: string;
}) {
  const gradient = gradients[symbol.charCodeAt(0) % gradients.length];
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-xs font-black text-white shadow-lg",
        gradient,
        className,
      )}
    >
      {imageUrl ? (
        // Provider image hosts vary; this intentionally falls back on load failure.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        symbol.slice(0, 2)
      )}
    </span>
  );
}
