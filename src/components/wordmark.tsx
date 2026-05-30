import { cn } from "@/lib/utils";

// Canonical HelloSavvy logo: one continuous lavender→magenta gradient across the
// full wordmark (v0.6 §5 gradient-clip treatment). Rendered as gradient text so
// it stays crisp at any size. Control size/weight via `className` (e.g. text-3xl).
// Use this everywhere the brand wordmark appears — do not hand-roll the spans.
const WORDMARK_GRADIENT =
  "linear-gradient(135deg, #5B47E5 0%, #8B5BD4 50%, #D8479A 100%)";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      aria-label="HelloSavvy"
      className={cn(
        "inline-block font-bold tracking-[-0.02em] whitespace-nowrap select-none",
        className,
      )}
      style={{
        backgroundImage: WORDMARK_GRADIENT,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      }}
    >
      HelloSavvy
    </span>
  );
}
