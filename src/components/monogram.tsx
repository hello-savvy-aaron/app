import { cn } from "@/lib/utils";

// v0.6 §4/§6 — the HS monogram: rounded square, signature gradient fill, white
// "HS". HelloSavvy's small-space identity (favicon, app icon, top-bar logo).
// Default box is size-8; override via className. Uses the locked CTA gradient.
const MARK_GRADIENT =
  "linear-gradient(135deg, #5B47E5 0%, #8B5BD4 50%, #D8479A 100%)";

export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-label="HelloSavvy"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[9px] text-sm font-bold leading-none tracking-[-0.04em] text-white shadow-sm select-none",
        className,
      )}
      style={{ backgroundImage: MARK_GRADIENT }}
    >
      HS
    </span>
  );
}
